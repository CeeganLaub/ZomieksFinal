import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, conversationsApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { StarIcon, ClockIcon, CheckIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftRightIcon, HeartIcon, XMarkIcon, ShieldCheckIcon, CreditCardIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';

export default function ServicePage() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [selectedPackage, setSelectedPackage] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<'PAYFAST' | 'OZOW'>('PAYFAST');

  const { data, isLoading } = useQuery({
    queryKey: ['service', username, slug],
    queryFn: () => api.get<any>(`/services/${username}/${slug}`),
    enabled: !!username && !!slug,
  });

  const createOrder = useMutation({
    mutationFn: (data: any) => api.post<any>('/orders', data),
    onSuccess: async (data) => {
      setShowRequirementsModal(false);
      setRequirements('');
      const orderId = data.data.order.id;
      const gateway = selectedGateway;
      try {
        // Initiate payment and redirect to payment gateway
        toast.info('Redirecting to payment...');
        const payRes = await api.get<any>('/payments/initiate', {
          params: { orderId, gateway },
        });
        if (payRes.data?.paymentUrl) {
          window.location.href = payRes.data.paymentUrl;
        } else {
          // Fallback: navigate to order page with payment prompt
          navigate(`/orders/${orderId}?payment=pending`);
        }
      } catch {
        // If payment initiation fails, go to order page where user can retry
        toast.error('Could not initiate payment. You can pay from the order page.');
        navigate(`/orders/${orderId}?payment=pending`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const service = data?.data?.service;
  const relatedServices = data?.data?.relatedServices || [];
  const packages = service?.packages || [];
  const subscriptionTiers = service?.subscriptionTiers || [];
  const currentPackage = packages[selectedPackage];

  const startConversation = useMutation({
    mutationFn: async () => {
      const sellerId = service?.seller?.id;
      if (!sellerId) throw new Error('Seller not found');
      return conversationsApi.start({ participantId: sellerId });
    },
    onSuccess: (data: any) => {
      navigate(`/messages/${data.data?.conversationId || data.conversationId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Could not start conversation');
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="aspect-video bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Service not found</h1>
        <Link to="/services">
          <Button>Browse services</Button>
        </Link>
      </div>
    );
  }

  const handleOrder = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/services/${username}/${slug}` } });
      return;
    }

    setShowRequirementsModal(true);
  };

  const handleSubmitOrder = () => {
    createOrder.mutate({
      serviceId: service.id,
      packageTier: currentPackage.tier,
      requirements: requirements.trim() || undefined,
      paymentGateway: selectedGateway,
    });
  };

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column - Service details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Title and seller info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{service.title}</h1>
            <div className="flex items-center space-x-4">
              <Link to={`/sellers/${service.seller.username}`} className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                  {service.seller.firstName?.charAt(0) || service.seller.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{service.seller.sellerProfile?.displayName || service.seller.username}</div>
                  <div className="text-sm text-muted-foreground">
                    Level {service.seller.sellerProfile?.level || 1} Seller
                  </div>
                </div>
              </Link>
              <div className="flex items-center space-x-1">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">{service.rating ? Number(service.rating).toFixed(1) : 'New'}</span>
                <span className="text-muted-foreground">({service.reviewCount || 0} reviews)</span>
              </div>
            </div>
          </div>

          {/* Image gallery */}
          <div>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {service.images?.[selectedImage] ? (
                <img 
                  src={service.images[selectedImage]} 
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            {service.images?.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {service.images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                      selectedImage === index ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold mb-4">About This Service</h2>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{service.description}</p>
            </div>
          </div>

          {/* Seller info card */}
          <Card>
            <CardHeader>
              <CardTitle>About The Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-medium shrink-0">
                  {service.seller.firstName?.charAt(0) || service.seller.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <Link 
                    to={`/sellers/${service.seller.username}`}
                    className="font-medium text-lg hover:text-primary"
                  >
                    {service.seller.sellerProfile?.displayName || service.seller.username}
                  </Link>
                  <p className="text-muted-foreground">{service.seller.sellerProfile?.professionalTitle}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 text-yellow-500" />
                      <span>{service.seller.sellerProfile?.rating ? Number(service.seller.sellerProfile.rating).toFixed(1) : 'New'}</span>
                    </div>
                    <div>
                      {service.seller.sellerProfile?.completedOrders || 0} orders completed
                    </div>
                  </div>
                  <p className="mt-3 text-sm">{service.seller.sellerProfile?.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-4 w-full gap-2"
                onClick={() => {
                  if (!isAuthenticated) { navigate('/login'); return; }
                  startConversation.mutate();
                }}
                isLoading={startConversation.isPending}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Contact Seller
              </Button>
            </CardContent>
          </Card>

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-bold mb-4">Reviews</h2>
            {!service.reviews || service.reviews?.length === 0 ? (
              <p className="text-muted-foreground">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {service.reviews?.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                          {review.buyer?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{review.buyer?.username || 'Anonymous'}</span>
                              <div className="flex items-center space-x-1 mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <StarIcon 
                                    key={i} 
                                    className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500' : 'text-muted'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm">{review.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* FAQs */}
          {service.faqs && service.faqs.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {service.faqs.map((faq: { question: string; answer: string }, index: number) => (
                  <details key={index} className="group border rounded-lg">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer font-medium text-sm hover:bg-muted/30 transition-colors">
                      {faq.question}
                      <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-3 text-sm text-muted-foreground">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Related Services */}
          {relatedServices.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Related Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedServices.map((related: any) => (
                  <Link
                    key={related.id}
                    to={`/services/${related.seller?.username}/${related.slug}`}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-muted">
                      {related.images?.[0] && (
                        <img src={related.images[0]} alt={related.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm line-clamp-2">{related.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {related.seller?.sellerProfile?.displayName || related.seller?.username}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                          <span>{related.rating ? Number(related.rating).toFixed(1) : 'New'}</span>
                          <span className="text-muted-foreground">({related.reviewCount || 0})</span>
                        </div>
                        <span className="text-sm font-bold">
                          {related.packages?.[0] ? formatCurrency(related.packages[0].price) : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Package selector */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {/* Toggle between packages and subscriptions */}
            {subscriptionTiers.length > 0 && (
              <div className="flex mb-4 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setShowSubscription(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    !showSubscription ? 'bg-background shadow' : ''
                  }`}
                >
                  One-time
                </button>
                <button
                  onClick={() => setShowSubscription(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    showSubscription ? 'bg-background shadow' : ''
                  }`}
                >
                  Subscribe
                </button>
              </div>
            )}

            {!showSubscription ? (
              /* Package tabs */
              <Card>
                {packages.length > 1 && (
                  <div className="flex border-b">
                    {packages.map((pkg: any, index: number) => (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedPackage(index)}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                          selectedPackage === index 
                            ? 'border-primary text-primary' 
                            : 'border-transparent hover:text-foreground'
                        }`}
                      >
                        {pkg.name}
                      </button>
                    ))}
                  </div>
                )}
                
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg">{currentPackage?.name}</h3>
                    <div className="text-2xl font-bold">{formatCurrency(currentPackage?.price)}</div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">
                    {currentPackage?.description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm mb-6">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{currentPackage?.deliveryDays} days delivery</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ArrowsRightLeftIcon className="h-4 w-4" />
                      <span>{currentPackage?.revisions} revisions</span>
                    </div>
                  </div>

                  {/* Features */}
                  {currentPackage?.features && (
                    <ul className="space-y-2 mb-6">
                      {currentPackage.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleOrder}
                    isLoading={createOrder.isPending}
                  >
                    Continue ({formatCurrency(currentPackage?.price)})
                  </Button>

                  <p className="text-xs text-center text-muted-foreground mt-3">
                    3% buyer fee applies
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Subscription tiers */
              <div className="space-y-4">
                {subscriptionTiers.map((tier: any) => (
                  <Card key={tier.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{tier.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Billed {tier.interval.toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{formatCurrency(tier.price)}</div>
                          <div className="text-sm text-muted-foreground">
                            /{tier.interval.toLowerCase().slice(0, -2)}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

                      {tier.features && (
                        <ul className="space-y-2 mb-6">
                          {tier.features.map((feature: string, index: number) => (
                            <li key={index} className="flex items-center space-x-2 text-sm">
                              <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button className="w-full" variant="outline">
                        Subscribe
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Save button */}
            <Button variant="ghost" className="w-full mt-4">
              <HeartIcon className="h-4 w-4 mr-2" />
              Save to favorites
            </Button>

            {/* Trust badges */}
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-xs text-emerald-500 font-medium">Secure Payment — Funds held in escrow</span>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="text-xs text-blue-500 font-medium">PayFast & Ozow accepted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements Modal */}
      {showRequirementsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-bold">Project Details</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell the seller about your project requirements
                </p>
              </div>
              <button
                onClick={() => setShowRequirementsModal(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Package summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{currentPackage?.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPackage?.deliveryDays} days delivery · {currentPackage?.revisions} revisions
                    </p>
                  </div>
                  <p className="text-xl font-bold text-primary">{formatCurrency(currentPackage?.price)}</p>
                </div>
                {currentPackage?.features && (
                  <ul className="mt-3 space-y-1">
                    {currentPackage.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Requirements input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Requirements <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="Describe what you need:&#10;• Brand name and slogan&#10;• Preferred colors or style&#10;• Reference examples&#10;• Any specific requirements..."
                />
              </div>

              {/* Fee breakdown */}
              <div className="text-sm text-muted-foreground space-y-1 border-t pt-4">
                <div className="flex justify-between">
                  <span>Service price</span>
                  <span>{formatCurrency(currentPackage?.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee (3%)</span>
                  <span>{formatCurrency((currentPackage?.price || 0) * 0.03)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency((currentPackage?.price || 0) * 1.03)}</span>
                </div>
              </div>

              {/* Payment method selection */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('PAYFAST')}
                    className={`flex-1 p-3 border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      selectedGateway === 'PAYFAST'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <CreditCardIcon className="h-4 w-4" />
                    PayFast
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('OZOW')}
                    className={`flex-1 p-3 border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      selectedGateway === 'OZOW'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <CreditCardIcon className="h-4 w-4" />
                    Ozow (EFT)
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRequirementsModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitOrder}
                isLoading={createOrder.isPending}
              >
                Place Order ({formatCurrency((currentPackage?.price || 0) * 1.03)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
