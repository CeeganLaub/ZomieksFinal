const API_URL = import.meta.env.VITE_API_URL ?? '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string; details?: any };
  meta?: { page?: number; limit?: number; total?: number };
}

function getAuthToken(): string | null {
  try {
    const storage = localStorage.getItem('auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.token || null;
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

function setAuthToken(token: string): void {
  try {
    const storage = localStorage.getItem('auth-storage');
    const parsed = storage ? JSON.parse(storage) : { state: {} };
    parsed.state.token = token;
    localStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch {
    // Ignore errors
  }
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private static readonly REQUEST_TIMEOUT_MS = 30000;

  private async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ApiClient.REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include',
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Request timed out', 'TIMEOUT', 408);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Safe JSON parsing — handle non-JSON responses
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        `Server returned non-JSON response (${response.status})`,
        'PARSE_ERROR',
        response.status
      );
    }

    if (!response.ok) {
      // Auto-refresh token on 401 (expired access token), retry once
      if (response.status === 401 && !isRetry && token && !endpoint.includes('/auth/')) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, true);
        }
      }

      throw new ApiError(
        data.error?.message || 'An error occurred',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const storage = localStorage.getItem('auth-storage');
        if (!storage) return false;
        const parsed = JSON.parse(storage);
        const refreshToken = parsed.state?.refreshToken;
        if (!refreshToken) return false;

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        if (data.data?.accessToken) {
          setAuthToken(data.data.accessToken);
          return true;
        }
        return false;
      } catch (e) {
        console.warn('Token refresh failed:', e instanceof Error ? e.message : 'unknown error');
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // File upload helper
  async upload(_endpoint: string, file: File, category: string): Promise<{ key: string; url: string }> {
    // First, get upload URL
    const init = await this.post<ApiResponse<{ uploadId: string; key: string; uploadUrl: string }>>('/uploads/init', {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      category,
    });

    if (!init.data) throw new Error('Failed to initialize upload');

    // Upload file
    const token = getAuthToken();
    const response = await fetch(`${this.baseUrl}${init.data.uploadUrl}`, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error?.message || 'Upload failed');

    return { key: result.data.key, url: result.data.url };
  }
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const api = new ApiClient(`${API_URL}/api/v1`);

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string; firstName?: string; lastName?: string }) =>
    api.post<ApiResponse<{ user: any; token: string; refreshToken: string }>>('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: any; token: string; refreshToken: string }>>('/auth/login', data),
  
  logout: () => api.post<ApiResponse<null>>('/auth/logout'),
  
  logoutAll: () => api.post<ApiResponse<null>>('/auth/logout-all'),
  
  me: () => api.get<ApiResponse<{ user: any }>>('/auth/me'),
  
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ token: string; refreshToken: string }>>('/auth/refresh', { refreshToken }),
  
  forgotPassword: (email: string) => api.post<ApiResponse<null>>('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse<null>>('/auth/reset-password', { token, password }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/auth/change-password', data),
};

// Services API
export const servicesApi = {
  list: (params?: { category?: string; search?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/services', { params }),
  
  get: (username: string, slug: string) =>
    api.get<ApiResponse<any>>(`/services/${username}/${slug}`),
  
  create: (data: any) => api.post<ApiResponse<{ id: string }>>('/services', data),
  
  update: (id: string, data: any) => api.patch<ApiResponse<null>>(`/services/${id}`, data),
  
  delete: (id: string) => api.delete<ApiResponse<null>>(`/services/${id}`),
  
  publish: (id: string) => api.post<ApiResponse<null>>(`/services/${id}/publish`),
  
  addPackage: (id: string, data: any) => api.post<ApiResponse<{ id: string }>>(`/services/${id}/packages`, data),
  
  categories: () => api.get<ApiResponse<any[]>>('/services/meta/categories'),
  
  stats: () => api.get<ApiResponse<any>>('/services/meta/stats'),
};

// Orders API
export const ordersApi = {
  buying: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/orders/buying', { params }),
  
  selling: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/orders/selling', { params }),
  
  get: (id: string) => api.get<ApiResponse<any>>(`/orders/${id}`),
  
  create: (data: { serviceId: string; packageId: string; requirements?: string }) =>
    api.post<ApiResponse<{ orderId: string; orderNumber: string }>>('/orders', data),
  
  deliver: (id: string, data: { message: string; attachments?: string[] }) =>
    api.post<ApiResponse<null>>(`/orders/${id}/deliver`, data),
  
  requestRevision: (id: string, reason: string) =>
    api.post<ApiResponse<null>>(`/orders/${id}/revision`, { reason }),
  
  accept: (id: string) => api.post<ApiResponse<null>>(`/orders/${id}/accept`),
  
  review: (id: string, data: { rating: number; comment?: string }) =>
    api.post<ApiResponse<null>>(`/orders/${id}/review`, data),
  
  cancel: (id: string, reason?: string) =>
    api.post<ApiResponse<any>>(`/orders/${id}/cancel`, { reason }),
  
  cancelAndRefund: (id: string, reason?: string) =>
    api.post<ApiResponse<any>>(`/orders/${id}/cancel`, { reason }),

  dispute: (id: string, data: { reason: string; details?: string }) =>
    api.post<ApiResponse<any>>(`/orders/${id}/dispute`, data),

  getDispute: (id: string) =>
    api.get<ApiResponse<any>>(`/orders/${id}/dispute`),
};

// Users API
export const usersApi = {
  profile: (username: string) => api.get<ApiResponse<any>>(`/users/${username}`),
  
  updateProfile: (data: any) => api.patch<ApiResponse<{ user: any }>>('/users/profile', data),
  
  becomeSeller: (data: any) => api.post<ApiResponse<{ user: any }>>('/users/become-seller', data),
  
  favorites: () => api.get<ApiResponse<any[]>>('/users/favorites'),
  
  addFavorite: (serviceId: string) => api.post<ApiResponse<null>>(`/users/favorites/${serviceId}`),
  
  removeFavorite: (serviceId: string) => api.delete<ApiResponse<null>>(`/users/favorites/${serviceId}`),

  // BioLink
  getBiolink: () => api.get<ApiResponse<any>>('/users/seller/biolink'),
  
  updateBiolink: (data: any) => api.put<ApiResponse<any>>('/users/seller/biolink', data),
  
  toggleBiolink: () => api.post<ApiResponse<{ bioEnabled: boolean }>>('/users/seller/biolink/toggle'),
};

// Seller Subscription API
export const sellerSubscriptionApi = {
  status: () => api.get<ApiResponse<any>>('/seller-subscription/status'),
  
  subscribe: () => api.post<ApiResponse<{ subscriptionId: string; paymentUrl: string }>>('/seller-subscription/subscribe'),
  
  cancel: (reason?: string) => api.post<ApiResponse<any>>('/seller-subscription/cancel', { reason }),
  
  reactivate: () => api.post<ApiResponse<any>>('/seller-subscription/reactivate'),
};

// Conversations API
export const conversationsApi = {
  list: (params?: { status?: string; starred?: boolean; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ conversations: any[]; unreadTotal: number }>>('/conversations', { params }),
  
  get: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<{ conversation: any; messages: any[]; notes?: any[] }>>(`/conversations/${id}`, { params }),
  
  start: (data: { participantId: string; orderId?: string; content?: string }) =>
    api.post<ApiResponse<{ conversationId: string }>>('/conversations/start', data),
  
  sendMessage: (id: string, data: { content: string; attachments?: string[]; offerDetails?: any }) =>
    api.post<ApiResponse<{ messageId: string }>>(`/conversations/${id}/messages`, data),
  
  toggleStar: (id: string) => api.patch<ApiResponse<{ isStarred: boolean }>>(`/conversations/${id}/star`),
  
  updateLabels: (id: string, labels: string[]) =>
    api.patch<ApiResponse<null>>(`/conversations/${id}/labels`, { labels }),
  
  addNote: (id: string, content: string) =>
    api.post<ApiResponse<{ id: string }>>(`/conversations/${id}/notes`, { content }),
  
  // CRM
  savedReplies: () => api.get<ApiResponse<any[]>>('/conversations/crm/saved-replies'),
  createSavedReply: (data: { title: string; content: string; shortcut?: string }) =>
    api.post<ApiResponse<{ id: string }>>('/conversations/crm/saved-replies', data),
  
  labels: () => api.get<ApiResponse<any[]>>('/conversations/crm/labels'),
  createLabel: (data: { name: string; color: string }) =>
    api.post<ApiResponse<{ id: string }>>('/conversations/crm/labels', data),
  
  pipelineStages: () => api.get<ApiResponse<any[]>>('/conversations/crm/pipeline-stages'),
  createPipelineStage: (data: { name: string; order: number; color?: string }) =>
    api.post<ApiResponse<{ id: string }>>('/conversations/crm/pipeline-stages', data),

  autoTriggers: () => api.get<ApiResponse<any[]>>('/conversations/crm/auto-triggers'),
  createAutoTrigger: (data: { event: string; action: string; config?: any }) =>
    api.post<ApiResponse<{ id: string }>>('/conversations/crm/auto-triggers', data),

  crmAnalytics: () => api.get<ApiResponse<any>>('/conversations/crm/analytics'),

  // Custom offers
  sendOffer: (conversationId: string, data: { description: string; price: number; deliveryDays: number; revisions?: number; offerType?: string }) =>
    api.post<ApiResponse<any>>(`/conversations/${conversationId}/offer`, data),

  acceptOffer: (conversationId: string, messageId: string, data?: { paymentGateway?: string }) =>
    api.post<ApiResponse<any>>(`/conversations/${conversationId}/offer/${messageId}/accept`, data),

  declineOffer: (conversationId: string, messageId: string) =>
    api.post<ApiResponse<any>>(`/conversations/${conversationId}/offer/${messageId}/decline`),
};

// Payments API
export const paymentsApi = {
  initiate: (params: { orderId: string; gateway: 'payfast' | 'ozow' }) =>
    api.get<ApiResponse<{ paymentUrl: string }>>('/payments/initiate', { params }),

  initiateSubscription: (params: { subscriptionId: string }) =>
    api.get<ApiResponse<{ paymentUrl: string }>>('/payments/initiate-subscription', { params }),

  creditBalance: () => api.get<ApiResponse<{ creditBalance: number }>>('/payments/credit-balance'),

  balance: () => api.get<ApiResponse<any>>('/payments/balance'),
  
  earnings: (period?: string) =>
    api.get<ApiResponse<any>>('/payments/earnings', { params: period ? { period } : undefined }),
  
  payouts: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/payments/payouts', { params }),
  
  withdraw: (data: { amount: number; bankDetailsId?: string }) =>
    api.post<ApiResponse<{ payoutId: string }>>('/payments/withdraw', data),
  
  bankDetails: () => api.get<ApiResponse<any[]>>('/payments/bank-details'),
};

// Subscriptions API
export const subscriptionsApi = {
  tiers: () => api.get<ApiResponse<any[]>>('/subscriptions/tiers'),
  
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/subscriptions', { params }),
  
  subscribers: () => api.get<ApiResponse<any[]>>('/subscriptions/subscribers'),
  
  subscribe: (data: { serviceId: string; tierId: string; billingCycle?: string }) =>
    api.post<ApiResponse<{ subscriptionId: string }>>('/subscriptions', data),
  
  cancel: (id: string, data?: { reason?: string }) =>
    api.post<ApiResponse<any>>(`/subscriptions/${id}/cancel`, data),

  pause: (id: string) =>
    api.post<ApiResponse<any>>(`/subscriptions/${id}/pause`),

  resume: (id: string) =>
    api.post<ApiResponse<any>>(`/subscriptions/${id}/resume`),
};

// Uploads helper
export const uploadsApi = {
  upload: (file: File, category: 'avatar' | 'service' | 'portfolio' | 'delivery' | 'message' | 'document') =>
    api.upload('/uploads', file, category),
  
  uploadAvatar: async (file: File) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/v1/uploads/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Upload failed');
    return data.data as { key: string; url: string };
  },
};

// Courses API
export const coursesApi = {
  // Public
  list: (params?: { category?: string; search?: string; level?: string; minPrice?: number; maxPrice?: number; sort?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/courses', { params }),

  get: (slug: string) =>
    api.get<ApiResponse<any>>(`/courses/${slug}`),

  // Buyer
  enroll: (courseId: string) =>
    api.post<ApiResponse<{ enrollmentId: string }>>(`/courses/${courseId}/enroll`),

  refund: (courseId: string, reason?: string) =>
    api.post<ApiResponse<{ refundId: string; refundAmount: number; newCreditBalance: number; message: string }>>(`/courses/${courseId}/refund`, { reason }),

  learn: (courseId: string) =>
    api.get<ApiResponse<any>>(`/courses/${courseId}/learn`),

  completeLesson: (courseId: string, lessonId: string) =>
    api.post<ApiResponse<any>>(`/courses/${courseId}/lessons/${lessonId}/complete`),

  myEnrollments: () =>
    api.get<ApiResponse<any[]>>('/courses/my/enrollments'),

  review: (courseId: string, data: { rating: number; comment: string }) =>
    api.post<ApiResponse<any>>(`/courses/${courseId}/reviews`, data),

  // Seller
  sellerCourses: () =>
    api.get<ApiResponse<any[]>>('/courses/seller/my'),

  createCourse: (data: any) =>
    api.post<ApiResponse<any>>('/courses/seller/create', data),

  updateCourse: (courseId: string, data: any) =>
    api.patch<ApiResponse<any>>(`/courses/seller/${courseId}`, data),

  publishCourse: (courseId: string) =>
    api.post<ApiResponse<any>>(`/courses/seller/${courseId}/publish`),

  deleteCourse: (courseId: string) =>
    api.delete<ApiResponse<any>>(`/courses/seller/${courseId}`),

  getCourseForEdit: (courseId: string) =>
    api.get<ApiResponse<any>>(`/courses/seller/${courseId}/edit`),

  // Sections
  addSection: (courseId: string, data: { title: string; order: number }) =>
    api.post<ApiResponse<any>>(`/courses/seller/${courseId}/sections`, data),

  updateSection: (sectionId: string, data: { title?: string; order?: number }) =>
    api.patch<ApiResponse<any>>(`/courses/seller/sections/${sectionId}`, data),

  deleteSection: (sectionId: string) =>
    api.delete<ApiResponse<any>>(`/courses/seller/sections/${sectionId}`),

  // Lessons
  addLesson: (sectionId: string, data: any) =>
    api.post<ApiResponse<any>>(`/courses/seller/sections/${sectionId}/lessons`, data),

  updateLesson: (lessonId: string, data: any) =>
    api.patch<ApiResponse<any>>(`/courses/seller/lessons/${lessonId}`, data),

  deleteLesson: (lessonId: string) =>
    api.delete<ApiResponse<any>>(`/courses/seller/lessons/${lessonId}`),
};

// Seller Fee API
export const sellerFeeApi = {
  checkStatus: () =>
    api.get<ApiResponse<{ feeAmount: number; feePaid: boolean; feePaidAt: string | null }>>('/users/seller/fee-status'),

  payFee: () =>
    api.post<ApiResponse<{ message: string }>>('/users/seller/pay-fee'),
};

// Admin API
export const adminApi = {
  // Dashboard
  stats: () => api.get<ApiResponse<Record<string, unknown>>>('/admin/stats'),
  analytics: () => api.get<ApiResponse<Record<string, unknown>>>('/admin/analytics'),

  // Users
  users: (params?: { search?: string; isSeller?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ users: unknown[] }>>('/admin/users', { params }),
  suspendUser: (userId: string, reason: string) =>
    api.post<ApiResponse<{ user: unknown }>>(`/admin/users/${userId}/suspend`, { reason }),
  unsuspendUser: (userId: string) =>
    api.post<ApiResponse<{ user: unknown }>>(`/admin/users/${userId}/unsuspend`),

  // Create user (buyer) for admin
  createUser: (data: { email: string; username: string; password: string; firstName: string; lastName: string; country?: string; avatar?: string }) =>
    api.post<ApiResponse<{ user: unknown }>>('/admin/users/create', data),
  managedUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ users: unknown[] }>>('/admin/users/managed', { params }),

  // Seller management
  createSeller: (data: { email: string; username: string; password: string; firstName: string; lastName: string; displayName: string; professionalTitle: string; description: string; skills?: string[]; plan: 'free' | 'pro'; country?: string }) =>
    api.post<ApiResponse<{ seller: unknown }>>('/admin/sellers/create', data),
  managedSellers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ sellers: unknown[] }>>('/admin/sellers/managed', { params }),
  getManagedSeller: (sellerId: string) =>
    api.get<ApiResponse<{ seller: unknown; metrics: unknown[] }>>(`/admin/sellers/managed/${sellerId}`),
  updateSellerPlan: (sellerId: string, plan: 'free' | 'pro') =>
    api.patch<ApiResponse<{ seller: unknown }>>(`/admin/sellers/managed/${sellerId}/plan`, { plan }),
  updateSellerProfile: (sellerId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<{ profile: unknown }>>(`/admin/sellers/managed/${sellerId}/profile`, data),
  updateSellerStats: (sellerId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<{ profile: unknown }>>(`/admin/sellers/managed/${sellerId}/stats`, data),
  setSellerMetrics: (sellerId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<{ metric: unknown }>>(`/admin/sellers/managed/${sellerId}/metrics`, data),
  getSellerMetrics: (sellerId: string, days?: number) =>
    api.get<ApiResponse<{ metrics: unknown[] }>>(`/admin/sellers/managed/${sellerId}/metrics`, { params: days ? { days } : undefined }),

  // Reviews
  createReview: (data: { authorId: string; serviceId: string; sellerId: string; rating: number; comment: string; communicationRating?: number; qualityRating?: number; valueRating?: number }) =>
    api.post<ApiResponse<{ review: unknown; order: unknown }>>('/admin/reviews/create', data),

  // Orders & Disputes
  orders: (params?: { status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ orders: unknown[] }>>('/admin/orders', { params }),
  disputes: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<{ disputes: unknown[] }>>('/admin/disputes', { params }),
  resolveDispute: (orderId: string, data: { resolution: string; refundBuyer: boolean; refundAmount?: number; notes?: string }) =>
    api.post<ApiResponse<{ message: string }>>(`/admin/disputes/${orderId}/resolve`, data),

  // Payouts
  payouts: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ payouts: unknown[] }>>('/admin/payouts', { params }),
  processPayout: (payoutId: string, bankReference: string) =>
    api.post<ApiResponse<{ payout: unknown }>>(`/admin/payouts/${payoutId}/process`, { bankReference }),
  rejectPayout: (payoutId: string, reason?: string) =>
    api.post<ApiResponse<{ payout: unknown }>>(`/admin/payouts/${payoutId}/reject`, { reason }),

  // KYC
  pendingKYC: () =>
    api.get<ApiResponse<{ sellers: unknown[] }>>('/admin/sellers/pending-kyc'),
  verifyKYC: (sellerId: string, status: 'VERIFIED' | 'REJECTED') =>
    api.post<ApiResponse<{ profile: unknown }>>(`/admin/sellers/${sellerId}/verify-kyc`, { status }),

  // Services & Courses
  services: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ services: unknown[] }>>('/admin/services', { params }),
  updateService: (serviceId: string, data: { isActive?: boolean }) =>
    api.patch<ApiResponse<{ service: unknown }>>(`/admin/services/${serviceId}`, data),
  courses: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ courses: unknown[] }>>('/admin/courses', { params }),
  updateCourse: (courseId: string, data: { status?: string }) =>
    api.patch<ApiResponse<{ course: unknown }>>(`/admin/courses/${courseId}`, data),

  // Categories
  categories: () => api.get<ApiResponse<{ categories: unknown[] }>>('/admin/categories'),
  createCategory: (data: { name: string; slug: string; description?: string; icon?: string; parentId?: string; order?: number }) =>
    api.post<ApiResponse<{ category: unknown }>>('/admin/categories', data),
  updateCategory: (categoryId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<{ category: unknown }>>(`/admin/categories/${categoryId}`, data),
  deleteCategory: (categoryId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/categories/${categoryId}`),

  // Conversations
  conversations: (params?: { search?: string; flagged?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ conversations: unknown[] }>>('/admin/conversations', { params }),
  conversation: (id: string) =>
    api.get<ApiResponse<{ conversation: unknown }>>(`/admin/conversations/${id}`),
  flagConversation: (id: string, reason?: string) =>
    api.post<ApiResponse<{ conversation: unknown }>>(`/admin/conversations/${id}/flag`, { reason }),
  unflagConversation: (id: string) =>
    api.post<ApiResponse<{ conversation: unknown }>>(`/admin/conversations/${id}/unflag`),
};

export { setAuthToken, getAuthToken };
