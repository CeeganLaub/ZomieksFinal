const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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

    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || 'An error occurred',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
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
  
  me: () => api.get<ApiResponse<{ user: any }>>('/auth/me'),
  
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ token: string; refreshToken: string }>>('/auth/refresh', { refreshToken }),
  
  forgotPassword: (email: string) => api.post<ApiResponse<null>>('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse<null>>('/auth/reset-password', { token, password }),
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
  
  pipeline: () => api.get<ApiResponse<any[]>>('/conversations/crm/pipeline'),
};

// Payments API
export const paymentsApi = {
  createPayment: (data: { orderId: string; provider?: 'PAYFAST' | 'OZOW' }) =>
    api.post<ApiResponse<{ transactionId: string; paymentUrl: string }>>('/payments/create', data),
  
  transactions: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/payments/transactions', { params }),
  
  balance: () => api.get<ApiResponse<any>>('/payments/balance'),
  
  creditBalance: () => api.get<ApiResponse<{ creditBalance: number }>>('/payments/credit-balance'),
  
  escrow: () => api.get<ApiResponse<any[]>>('/payments/escrow'),
  
  withdraw: (data: { amount: number; bankDetailsId?: string }) =>
    api.post<ApiResponse<{ payoutId: string }>>('/payments/withdraw', data),
  
  payouts: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/payments/payouts', { params }),
  
  bankDetails: () => api.get<ApiResponse<any[]>>('/payments/bank-details'),
  
  addBankDetails: (data: any) =>
    api.post<ApiResponse<{ id: string }>>('/payments/bank-details', data),
  
  setDefaultBank: (id: string) =>
    api.patch<ApiResponse<null>>(`/payments/bank-details/${id}/default`),
  
  deleteBankDetails: (id: string) =>
    api.delete<ApiResponse<null>>(`/payments/bank-details/${id}`),
  
  earnings: (period?: string) =>
    api.get<ApiResponse<any>>('/payments/earnings', { params: period ? { period } : undefined }),
};

// Subscriptions API
export const subscriptionsApi = {
  tiers: () => api.get<ApiResponse<any[]>>('/subscriptions/tiers'),
  
  current: () => api.get<ApiResponse<any | null>>('/subscriptions/current'),
  
  subscribe: (data: { tierId: string; billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' }) =>
    api.post<ApiResponse<{ subscriptionId: string; paymentUrl: string }>>('/subscriptions/subscribe', data),
  
  cancel: (data?: { reason?: string; feedback?: string }) =>
    api.post<ApiResponse<{ cancelledAt: string; accessUntil: string }>>('/subscriptions/cancel', data),
  
  reactivate: () => api.post<ApiResponse<null>>('/subscriptions/reactivate'),
  
  history: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<any[]>>('/subscriptions/history', { params }),
  
  usage: () => api.get<ApiResponse<any>>('/subscriptions/usage'),
};

// Uploads helper
export const uploadsApi = {
  upload: (file: File, category: 'avatar' | 'service' | 'portfolio' | 'delivery' | 'message' | 'document') =>
    api.upload('/uploads', file, category),
  
  uploadAvatar: async (file: File) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/uploads/avatar`, {
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

export { setAuthToken, getAuthToken };
