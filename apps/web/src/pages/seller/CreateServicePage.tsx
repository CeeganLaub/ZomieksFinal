import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PlusIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

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

  // FAQs for future use
  // const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({
  //   control,
  //   name: 'faqs',
  // });

  const watchedTags = watch('tags');
  const watchedImages = watch('images');
  const watchedCategory = watch('categoryId');

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      // First create the service
      const serviceRes = await api.post<any>('/services', {
        title: data.title,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        description: data.description,
        pricingType: data.pricingType,
        tags: data.tags,
        images: data.images,
        faqs: data.faqs,
      });
      
      const serviceId = serviceRes.data.data.service.id;
      
      // Add packages in parallel
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

  const removeTag = (index: number) => {
    setValue('tags', watchedTags.filter((_, i) => i !== index));
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setValue('images', [...watchedImages, url]);
    }
  };

  const selectedCategory = categories?.find((c: any) => c.id === watchedCategory);

  const onSubmit = (data: ServiceFormData) => {
    createServiceMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Create a New Service</h1>
      <p className="text-muted-foreground mb-8">
        Step {step} of 3: {step === 1 ? 'Basic Info' : step === 2 ? 'Packages & Pricing' : 'Review'}
      </p>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Service Title</label>
              <input
                {...register('title')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="I will create a professional logo design"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  {...register('categoryId')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="text-red-500 text-sm mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              {selectedCategory?.children?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Subcategory</label>
                  <select
                    {...register('subcategoryId')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a subcategory</option>
                    {selectedCategory.children.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe your service in detail. What will buyers get? What's your process?"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags ({watchedTags.length}/5)</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {watchedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(i)} className="text-gray-500 hover:text-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              {errors.tags && (
                <p className="text-red-500 text-sm mt-1">{errors.tags.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Images</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {watchedImages.map((img, i) => (
                  <div key={i} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setValue('images', watchedImages.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  <PhotoIcon className="h-8 w-8 mb-2" />
                  <span className="text-sm">Add Image</span>
                </button>
              </div>
              {errors.images && (
                <p className="text-red-500 text-sm mt-1">{errors.images.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Video URL (optional)</label>
              <input
                {...register('video' as any)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://youtube.com/... or direct video URL"
              />
              <p className="text-xs text-muted-foreground mt-1">Add a video to showcase your service</p>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(2)}>Continue to Pricing</Button>
            </div>
          </div>
        )}

        {/* Step 2: Packages */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Pricing Type</label>
              <select
                {...register('pricingType')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="ONE_TIME">One-time purchases only</option>
                <option value="SUBSCRIPTION">Subscriptions only</option>
                <option value="BOTH">Both one-time and subscriptions</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Packages</h3>
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
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                )}
              </div>

              {packageFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <select
                      {...register(`packages.${index}.tier`)}
                      className="font-semibold text-lg bg-transparent"
                    >
                      <option value="BASIC">Basic</option>
                      <option value="STANDARD">Standard</option>
                      <option value="PREMIUM">Premium</option>
                    </select>
                    {packageFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePackage(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Package Name</label>
                      <input
                        {...register(`packages.${index}.name`)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Basic Logo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Price (ZAR)</label>
                      <input
                        type="number"
                        {...register(`packages.${index}.price`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Delivery Days</label>
                      <input
                        type="number"
                        {...register(`packages.${index}.deliveryDays`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="1"
                        max="90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Revisions</label>
                      <input
                        type="number"
                        {...register(`packages.${index}.revisions`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        max="99"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      {...register(`packages.${index}.description`)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="What's included in this package?"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Source file included&#10;High resolution&#10;Commercial use"
                      onChange={(e) => {
                        const features = e.target.value.split('\n').filter(f => f.trim());
                        setValue(`packages.${index}.features`, features.length > 0 ? features : ['']);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" onClick={() => setStep(3)}>Review & Submit</Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Review Your Service</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Title</span>
                  <p className="font-medium">{watch('title')}</p>
                </div>
                
                <div>
                  <span className="text-sm text-muted-foreground">Category</span>
                  <p className="font-medium">
                    {categories?.find((c: any) => c.id === watch('categoryId'))?.name}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {watch('tags').map((tag, i) => (
                      <span key={i} className="bg-gray-200 px-2 py-1 rounded text-sm">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-muted-foreground">Packages</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {watch('packages').map((pkg, i) => (
                      <div key={i} className="border rounded-lg p-4 bg-white">
                        <p className="font-semibold">{pkg.name}</p>
                        <p className="text-2xl font-bold text-primary">R{pkg.price}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.deliveryDays} days • {pkg.revisions} revisions
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" disabled={createServiceMutation.isPending}>
                {createServiceMutation.isPending ? 'Creating...' : 'Create Service'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
