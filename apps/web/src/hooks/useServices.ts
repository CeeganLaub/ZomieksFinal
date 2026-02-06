import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  children?: Category[];
  _count?: {
    services: number;
  };
}

export interface ServicePackage {
  id: string;
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  features: string[];
  limits?: Record<string, number>;
}

export interface SellerProfile {
  displayName: string;
  professionalTitle: string;
  description: string;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseTimeMinutes?: number;
  level: number;
  isVerified: boolean;
  isAvailable: boolean;
}

export interface ServiceSeller {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  sellerProfile: SellerProfile;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  pricingType: 'ONE_TIME' | 'SUBSCRIPTION' | 'BOTH';
  images: string[];
  video?: string;
  tags: string[];
  faqs?: { question: string; answer: string }[];
  rating: number;
  reviewCount: number;
  orderCount: number;
  viewCount: number;
  status: string;
  seller: ServiceSeller;
  category: Category;
  packages: ServicePackage[];
  subscriptionTiers: SubscriptionTier[];
  createdAt: string;
}

export interface ServiceListItem {
  id: string;
  title: string;
  slug: string;
  images: string[];
  rating: number;
  reviewCount: number;
  pricingType: string;
  seller: {
    id: string;
    username: string;
    avatar?: string;
    sellerProfile: {
      displayName: string;
      level: number;
      isVerified: boolean;
    };
  };
  packages: { price: number }[];
  subscriptionTiers: { price: number }[];
}

interface ServicesResponse {
  success: boolean;
  data: {
    services: ServiceListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ServiceResponse {
  success: boolean;
  data: {
    service: Service;
  };
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
}

// Category Hooks
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<CategoriesResponse>('/services/meta/categories');
      return response.data.categories;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Service Hooks
export function useServices(params?: {
  categoryId?: string;
  subcategoryId?: string;
  pricingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  deliveryDays?: number;
  sellerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
          }
        });
      }
      const response = await api.get<ServicesResponse>(`/services?${searchParams.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInfiniteServices(params?: {
  categoryId?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
}) {
  return useInfiniteQuery({
    queryKey: ['services', 'infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(pageParam));
      searchParams.set('limit', String(params?.limit || 12));
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && key !== 'limit') {
            searchParams.set(key, String(value));
          }
        });
      }
      const response = await api.get<ServicesResponse>(`/services?${searchParams.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useService(idOrSlug: string) {
  return useQuery({
    queryKey: ['service', idOrSlug],
    queryFn: async () => {
      const response = await api.get<ServiceResponse>(`/services/${idOrSlug}`);
      return response.data.service;
    },
    enabled: !!idOrSlug,
  });
}

export function useSellerServices(sellerId: string) {
  return useQuery({
    queryKey: ['services', 'seller', sellerId],
    queryFn: async () => {
      const response = await api.get<ServicesResponse>(`/services?sellerId=${sellerId}`);
      return response.data.services;
    },
    enabled: !!sellerId,
  });
}

// Create/Update Service Hooks (for sellers)
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      categoryId: string;
      description: string;
      pricingType: string;
      tags: string[];
      images: string[];
    }) => {
      const response = await api.post('/services', data);
      return (response as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Service> }) => {
      const response = await api.patch(`/services/${id}`, data);
      return (response as any).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useAddServicePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: string; data: Omit<ServicePackage, 'id'> }) => {
      const response = await api.post(`/services/${serviceId}/packages`, data);
      return (response as any).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service', variables.serviceId] });
    },
  });
}

export function useAddSubscriptionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: string; data: Omit<SubscriptionTier, 'id'> }) => {
      const response = await api.post(`/services/${serviceId}/subscription-tiers`, data);
      return (response as any).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service', variables.serviceId] });
    },
  });
}
