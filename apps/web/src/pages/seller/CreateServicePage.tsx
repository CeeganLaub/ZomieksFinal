import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { GalleryUploader, ImageUploader } from '@/components/ui/ImageUploader';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  CubeIcon,
  TagIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const packageSchema = z.object({
  tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
  name: z.string().min(2),
  description: z.string().min(20),
  price: z.number().min(50),
  deliveryDays: z.number().min(1).max(90),
  revisions: z.number().min(0).max(99),
  features: z.array(z.string()).min(1),
});

const serviceSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(80),
  categoryId: z.string().min(1, 'Please select a category'),
  subcategoryId: z.string().optional(),
  description: z.string().min(100, 'Description must be at least 100 characters'),
  pricingType: z.enum(['ONE_TIME', 'SUBSCRIPTION', 'BOTH']),
  tags: z.array(z.string()).min(1, 'Add at least one tag').max(5),
  images: z.array(z.string().url()).min(1, 'Add at least one image'),
  video: z.string().url().optional().or(z.literal('')),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
  packages: z.array(packageSchema).min(1),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const defaultPackage = {
  tier: 'BASIC' as const,
  name: 'Basic',
  description: '',
  price: 100,
  deliveryDays: 3,
  revisions: 1,
  features: [''],
};

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const stepLabels = ['Details', 'Pricing', 'Review'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isComplete = stepNum < current;
        return (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className={`w-12 h-0.5 transition-colors duration-300 ${isComplete ? 'bg-primary' : 'bg-border'}`} />}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                ${isComplete ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                {isComplete ? <CheckIcon className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateServicePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [tagInput, setTagInput] = useState('');
  
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<any>('/services/meta/categories');
      return res.data.data.categories;
    },
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      description: '',
      pricingType: 'ONE_TIME',
      tags: [],
      images: [],
      faqs: [],
      packages: [defaultPackage],
    },
  });

  const { fields: packageFields, append: appendPackage, remove: removePackage } = useFieldArray({
    control,
    name: 'packages',
  });

  const watchedTags = watch('tags');
  const watchedImages = watch('images');
  const watchedCategory = watch('categoryId');
  const watchedVideo = watch('video');

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const serviceRes = await api.post<any>('/services', {
        title: data.title,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        description: data.description,
        pricingType: data.pricingType,
        tags: data.tags,
        images: data.images,
        video: data.video || undefined,
        faqs: data.faqs,
      });
      
      const serviceId = serviceRes.data.data.service.id;
      await Promise.all(
        data.packages.map(pkg => api.post(`/services/${serviceId}/packages`, pkg))
      );
      
      return serviceRes.data.data.service;
    },
    onSuccess: () => {
      toast.success('Service created successfully!');
      navigate(`/seller/services`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create service');
    },
  });

  const addTag = () => {
    if (tagInput && watchedTags.length < 5 && !watchedTags.includes(tagInput)) {
      setValue('tags', [...watchedTags, tagInput]);
      setTagInput('');
    }
  };

  const selectedCategory = categories?.find((c: any) => c.id === watchedCategory);

  const onSubmit = (data: ServiceFormData) => createServiceMutation.mutate(data);

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <StepIndicator current={step} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div key="step1" {...fadeIn}>
              <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-6 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <SparklesIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold">Create a New Service</h1>
                      <p className="text-sm text-muted-foreground">Describe your service and upload images</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <Input
                    id="title"
                    label="Service Title"
                    placeholder="I will create a professional logo design"
                    error={errors.title?.message}
                    {...register('title')}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                      <select
                        {...register('categoryId')}
                        className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select a category</option>
                        {categories?.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {errors.categoryId && <p className="mt-1 text-sm text-destructive">{errors.categoryId.message}</p>}
                    </div>

                    {selectedCategory?.children?.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Subcategory</label>
                        <select
                          {...register('subcategoryId')}
                          className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="">Select a subcategory</option>
                          {selectedCategory.children.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <Textarea
                    id="description"
                    label="Description"
                    placeholder="Describe your service in detail. What will buyers get? What's your process?"
                    rows={6}
                    error={errors.description?.message}
                    {...register('description')}
                  />

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <TagIcon className="w-4 h-4 inline mr-1" /> Tags ({watchedTags.length}/5)
                    </label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {watchedTags.map((tag, i) => (
                        <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1.5 font-medium">
                          {tag}
                          <button type="button" onClick={() => setValue('tags', watchedTags.filter((_, idx) => idx !== i))} className="hover:text-destructive transition-colors">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        className="flex-1 h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Add a tag and press Enter"
                      />
                      <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                    </div>
                    {errors.tags && <p className="mt-1 text-sm text-destructive">{errors.tags.message}</p>}
                  </div>

                  {/* Image Gallery Upload */}
                  <GalleryUploader
                    value={watchedImages}
                    onChange={(urls) => setValue('images', urls)}
                    max={5}
                    label="Service Images"
                  />
                  {errors.images && <p className="text-sm text-destructive">{errors.images.message}</p>}

                  {/* Video Upload */}
                  <ImageUploader
                    value={watchedVideo || ''}
                    onChange={(url) => setValue('video', url)}
                    variant="video"
                    label="Service Video (optional)"
                  />

                  <div className="flex justify-end pt-2">
                    <Button type="button" onClick={() => setStep(2)} size="lg">
                      Continue to Pricing
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Packages */}
          {step === 2 && (
            <motion.div key="step2" {...fadeIn}>
              <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-6 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <CubeIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold">Packages & Pricing</h1>
                      <p className="text-sm text-muted-foreground">Define your service tiers and prices</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Pricing Type</label>
                    <select
                      {...register('pricingType')}
                      className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="ONE_TIME">One-time purchases only</option>
                      <option value="SUBSCRIPTION">Subscriptions only</option>
                      <option value="BOTH">Both one-time and subscriptions</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Packages</h3>
                      {packageFields.length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendPackage({
                            ...defaultPackage,
                            tier: packageFields.length === 1 ? 'STANDARD' : 'PREMIUM',
                            name: packageFields.length === 1 ? 'Standard' : 'Premium',
                          })}
                        >
                          <PlusIcon className="h-4 w-4 mr-1.5" /> Add Tier
                        </Button>
                      )}
                    </div>

                    {packageFields.map((field, index) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-border rounded-xl p-5 bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <select
                            {...register(`packages.${index}.tier`)}
                            className="font-semibold text-base bg-transparent text-foreground border-none focus:outline-none"
                          >
                            <option value="BASIC">Basic</option>
                            <option value="STANDARD">Standard</option>
                            <option value="PREMIUM">Premium</option>
                          </select>
                          {packageFields.length > 1 && (
                            <button type="button" onClick={() => removePackage(index)} className="text-destructive/60 hover:text-destructive transition-colors p-1">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            id={`pkg-name-${index}`}
                            label="Package Name"
                            placeholder="e.g., Basic Logo"
                            {...register(`packages.${index}.name`)}
                          />
                          <Input
                            id={`pkg-price-${index}`}
                            label="Price (ZAR)"
                            type="number"
                            {...register(`packages.${index}.price`, { valueAsNumber: true })}
                          />
                          <Input
                            id={`pkg-delivery-${index}`}
                            label="Delivery Days"
                            type="number"
                            {...register(`packages.${index}.deliveryDays`, { valueAsNumber: true })}
                          />
                          <Input
                            id={`pkg-revisions-${index}`}
                            label="Revisions"
                            type="number"
                            {...register(`packages.${index}.revisions`, { valueAsNumber: true })}
                          />
                        </div>

                        <div className="mt-4">
                          <Textarea
                            id={`pkg-desc-${index}`}
                            label="Description"
                            rows={2}
                            placeholder="What's included in this package?"
                            {...register(`packages.${index}.description`)}
                          />
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-foreground mb-1">Features (one per line)</label>
                          <textarea
                            rows={3}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            placeholder={"Source file included\nHigh resolution\nCommercial use"}
                            onChange={(e) => {
                              const features = e.target.value.split('\n').filter(f => f.trim());
                              setValue(`packages.${index}.features`, features.length > 0 ? features : ['']);
                            }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button type="button" onClick={() => setStep(3)} size="lg">Review & Submit</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div key="step3" {...fadeIn}>
              <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-6 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <CheckIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold">Review Your Service</h1>
                      <p className="text-sm text-muted-foreground">Double-check everything before submitting</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Image preview */}
                  {watchedImages.length > 0 && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img src={watchedImages[0]} alt="Service preview" className="w-full aspect-video object-cover" />
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-xl p-5 space-y-4">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</span>
                      <p className="font-semibold text-lg mt-0.5">{watch('title')}</p>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</span>
                      <p className="font-medium mt-0.5">
                        {categories?.find((c: any) => c.id === watch('categoryId'))?.name || 'Not selected'}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
                      <div className="flex gap-2 flex-wrap mt-1.5">
                        {watch('tags').map((tag, i) => (
                          <span key={i} className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Packages</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                      {watch('packages').map((pkg, i) => (
                        <div key={i} className="border border-border rounded-xl p-4 bg-card">
                          <p className="font-semibold">{pkg.name}</p>
                          <p className="text-2xl font-bold text-primary mt-1">R{pkg.price}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {pkg.deliveryDays} days &middot; {pkg.revisions} revisions
                          </p>
                          {pkg.features.filter(Boolean).length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {pkg.features.filter(Boolean).map((f, fi) => (
                                <li key={fi} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <CheckIcon className="w-3 h-3 text-primary mt-0.5 shrink-0" /> {f}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                    <Button type="submit" size="lg" isLoading={createServiceMutation.isPending}>
                      Create Service
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
