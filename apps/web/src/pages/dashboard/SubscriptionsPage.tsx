import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../../lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  tier: {
    id: string;
    name: string;
    price: number;
    billingCycle: string;
    service: {
      id: string;
      title: string;
      seller: { username: string; firstName?: string };
    };
  };
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const res = await subscriptionsApi.list();
      return (res as any).data?.subscriptions || [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.cancel(id),
    onSuccess: () => {
      toast.success('Subscription will be cancelled at end of billing period');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel subscription');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.pause(id),
    onSuccess: () => {
      toast.success('Subscription paused');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to pause subscription');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.resume(id),
    onSuccess: () => {
      toast.success('Subscription resumed');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resume subscription');
    },
  });

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircleIcon }> = {
    ACTIVE: { label: 'Active', color: 'text-green-600 bg-green-50', icon: CheckCircleIcon },
    PAUSED: { label: 'Paused', color: 'text-yellow-600 bg-yellow-50', icon: PauseCircleIcon },
    CANCELLED: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: XCircleIcon },
    PAST_DUE: { label: 'Past Due', color: 'text-orange-600 bg-orange-50', icon: CreditCardIcon },
    PENDING: { label: 'Pending', color: 'text-blue-600 bg-blue-50', icon: ArrowPathIcon },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Subscriptions</h1>

      {!subscriptions || subscriptions.length === 0 ? (
        <div className="bg-background border rounded-lg p-12 text-center">
          <CreditCardIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No subscriptions yet</h3>
          <p className="text-muted-foreground mb-4">
            Subscribe to services to get recurring deliverables from your favorite sellers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const config = statusConfig[sub.status] || statusConfig.PENDING;
            const StatusIcon = config.icon;

            return (
              <div key={sub.id} className="bg-background border rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{sub.tier?.service?.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {sub.tier?.name} · R{Number(sub.tier?.price || 0).toFixed(2)}/{sub.tier?.billingCycle?.toLowerCase() || 'month'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      by @{sub.tier?.service?.seller?.username}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {sub.currentPeriodEnd && (
                    <span>
                      {sub.cancelAtPeriodEnd ? 'Expires' : 'Renews'}: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                  {sub.currentPeriodStart && (
                    <span>
                      Started: {formatDistanceToNow(new Date(sub.currentPeriodStart), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {sub.status === 'ACTIVE' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => pauseMutation.mutate(sub.id)}
                      disabled={pauseMutation.isPending}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this subscription?')) {
                          cancelMutation.mutate(sub.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {sub.status === 'PAUSED' && (
                  <div className="mt-4">
                    <button
                      onClick={() => resumeMutation.mutate(sub.id)}
                      disabled={resumeMutation.isPending}
                      className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Resume
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
