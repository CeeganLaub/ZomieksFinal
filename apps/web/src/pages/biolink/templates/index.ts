import type { ComponentType } from 'react';

// Shared data types passed to every template
export interface BioLinkSeller {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  sellerProfile: {
    id: string;
    displayName: string;
    professionalTitle: string;
    description: string;
    skills: string[];
    rating: number;
    reviewCount: number;
    completedOrders: number;
    responseTimeMinutes?: number;
    level: number;
    isVerified: boolean;
    isAvailable: boolean;
    bioHeadline?: string;
    bioCoverImage?: string;
    bioThemeColor: string;
    bioBackgroundColor: string;
    bioTextColor: string;
    bioButtonStyle: string;
    bioFont: string;
    bioCtaText: string;
    bioEnabled: boolean;
    bioTemplate: string;
    bioQuickReplies?: string[];
    bioFeaturedItems?: { type: 'service' | 'course'; id: string; order: number }[];
    courses: BioLinkCourse[];
    subscription: { status: string };
  };
  services: BioLinkService[];
  receivedReviews: BioLinkReview[];
}

export interface BioLinkService {
  id: string;
  title: string;
  slug: string;
  images: string[];
  rating: number;
  reviewCount: number;
  packages: { price: number; tier?: string; name?: string; description?: string; features?: string[]; deliveryDays?: number }[];
}

export interface BioLinkCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  price: number;
  rating: number;
  reviewCount: number;
  enrollCount: number;
  level: string;
}

export interface BioLinkReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: { username: string; firstName: string; avatar?: string };
}

export interface BioLinkTheme {
  backgroundColor: string;
  textColor: string;
  themeColor: string;
  buttonStyle: string;
  font: string;
}

export interface BioLinkTemplateProps {
  seller: BioLinkSeller;
  theme: BioLinkTheme;
  onChat: (context?: { type: 'service' | 'course'; id: string; title: string }) => void;
  onServiceClick: (service: BioLinkService) => void;
  onCourseClick: (course: BioLinkCourse) => void;
}

// Template registry entry
export interface TemplateRegistryEntry {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  component: ComponentType<BioLinkTemplateProps>;
}

// Lazy-loaded template components
import { lazy } from 'react';

const ServicesShowcase = lazy(() => import('./ServicesShowcase'));
const PortfolioGallery = lazy(() => import('./PortfolioGallery'));
const CourseAcademy = lazy(() => import('./CourseAcademy'));
const ChatFirst = lazy(() => import('./ChatFirst'));
const ClassicFunnel = lazy(() => import('./ClassicFunnel'));

export const TEMPLATES: Record<string, TemplateRegistryEntry> = {
  'services-showcase': {
    id: 'services-showcase',
    name: 'Services Showcase',
    description: 'Services & packages front-and-center with per-service chat',
    icon: '🛍️',
    component: ServicesShowcase,
  },
  'portfolio-gallery': {
    id: 'portfolio-gallery',
    name: 'Portfolio Gallery',
    description: 'Image-heavy masonry grid — great for designers',
    icon: '🎨',
    component: PortfolioGallery,
  },
  'course-academy': {
    id: 'course-academy',
    name: 'Course Academy',
    description: 'Courses highlighted with curriculum & enrollment CTA',
    icon: '🎓',
    component: CourseAcademy,
  },
  'chat-first': {
    id: 'chat-first',
    name: 'Chat-First',
    description: 'Conversational approach with quick-reply chips',
    icon: '💬',
    component: ChatFirst,
  },
  'classic-funnel': {
    id: 'classic-funnel',
    name: 'Classic Funnel',
    description: 'Marketing landing page: hero → proof → CTA',
    icon: '🚀',
    component: ClassicFunnel,
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);
export const DEFAULT_TEMPLATE = 'services-showcase';
