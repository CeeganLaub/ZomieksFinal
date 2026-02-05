import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Service {
  id: string;
  title: string;
  slug: string;
  status: string;
  images: string[];
  packages: { tier: string; price: number }[];
  impressions: number;
  clicks: number;
  orders: number;
  createdAt: string;
  seller: { username: string };
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ACTIVE: { label: 'Active', icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' },
  PENDING_REVIEW: { label: 'Pending Review', icon: ClockIcon, color: 'text-yellow-600 bg-yellow-50' },
  PAUSED: { label: 'Paused', icon: XCircleIcon, color: 'text-gray-600 bg-gray-50' },
  REJECTED: { label: 'Rejected', icon: XCircleIcon, color: 'text-red-600 bg-red-50' },
};

function ServiceCard({ service, onDelete }: { service: Service; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusConfig[service.status] || statusConfig.ACTIVE;
  const lowestPrice = service.packages?.length 
    ? Math.min(...service.packages.map(p => p.price))
    : 0;

  return (
    <div className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        {service.images?.[0] ? (
          <img src={service.images[0]} alt={service.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <Link
                  to={`/${service.seller.username}/${service.slug}`}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
                >
                  <EyeIcon className="h-4 w-4" />
                  View
                </Link>
                <Link
                  to={`/seller/services/${service.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this service?')) {
                      onDelete();
                    }
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-red-600 w-full"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium line-clamp-2">{service.title}</h3>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
            <status.icon className="h-3 w-3" />
            {status.label}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span>{service.impressions || 0} views</span>
          <span>{service.clicks || 0} clicks</span>
          <span>{service.orders || 0} orders</span>
        </div>
        
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Starting at</span>
          <span className="font-semibold text-lg">R{lowestPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SellerServicesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['seller-services'],
    queryFn: async () => {
      const res = await api.get('/services/my-services');
      return res.data.data.services;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await api.delete(`/services/${serviceId}`);
    },
    onSuccess: () => {
      toast.success('Service deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-services'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete service');
    },
  });

  const filteredServices = services?.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Services</h1>
          <p className="text-muted-foreground">
            {services?.length || 0} service{services?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/seller/services/new">
          <Button>
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Service
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'PENDING_REVIEW', label: 'Pending' },
          { value: 'PAUSED', label: 'Paused' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              filter === value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredServices && filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onDelete={() => deleteMutation.mutate(service.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first service to start selling
          </p>
          <Link to="/seller/services/new">
            <Button>Create Service</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
