import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PlusIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

const packageSchema = z.object({
  id: z.string().optional(),
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
  status: z.enum(['ACTIVE', 'PAUSED', 'DRAFT']).optional(),
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

export default function EditServicePage() {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();
  const queryClient = useQueryClient();
  const [tagInput, setTagInput] = useState('');

  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const res = await api.get(`/services/${serviceId}`);
      return (res as any).data.data.service;
    },
    enabled: !!serviceId,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/services/meta/categories');
      return (res as any).data.data.categories;
    },
  });

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isDirty } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      description: '',
      pricingType: 'ONE_TIME',
      tags: [],
      images: [],
      packages: [defaultPackage],
    },
  });

  // Load existing service data
  useEffect(() => {
    if (service) {
      reset({
        title: service.title,
        categoryId: service.categoryId,
        subcategoryId: service.subcategoryId || '',
        description: service.description,
        pricingType: service.pricingType,
        tags: service.tags || [],
        images: service.images || [],
        status: service.status,
        packages: service.packages?.map((pkg: any) => ({
          id: pkg.id,
          tier: pkg.tier,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          deliveryDays: pkg.deliveryDays,
          revisions: pkg.revisions,
          features: pkg.features || [''],
        })) || [defaultPackage],
      });
    }
  }, [service, reset]);

  const { fields: packageFields, append: appendPackage, remove: removePackage } = useFieldArray({
    control,
    name: 'packages',
  });

  const watchedTags = watch('tags');
  const watchedImages = watch('images');
  const watchedCategory = watch('categoryId');

  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      // Update service
      await api.patch(`/services/${serviceId}`, {
        title: data.title,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        description: data.description,
        pricingType: data.pricingType,
        tags: data.tags,
        images: data.images,
        status: data.status,
      });

      // Update/create packages
      for (const pkg of data.packages) {
        if (pkg.id) {
          await api.patch(`/services/${serviceId}/packages/${pkg.id}`, pkg);
        } else {
          await api.post(`/services/${serviceId}/packages`, pkg);
        }
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Service updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['seller-services'] });
      navigate('/seller/services');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update service');
    },
  });

  const addTag = () => {
    if (tagInput && watchedTags.length < 5 && !watchedTags.includes(tagInput)) {
      setValue('tags', [...watchedTags, tagInput], { shouldDirty: true });
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setValue('tags', watchedTags.filter((_, i) => i !== index), { shouldDirty: true });
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setValue('images', [...watchedImages, url], { shouldDirty: true });
    }
  };

  const selectedCategory = categories?.find((c: any) => c.id === watchedCategory);

  const onSubmit = (data: ServiceFormData) => {
    updateServiceMutation.mutate(data);
  };

  if (serviceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Service not found</h1>
        <Button onClick={() => navigate('/seller/services')}>Back to Services</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Edit Service</h1>
          <p className="text-muted-foreground">Update your service details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/seller/services')}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || updateServiceMutation.isPending}
          >
            {updateServiceMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Service Status</label>
          <select
            {...register('status')}
            className="w-full max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        {/* Basic Info */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>

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
              placeholder="Describe your service in detail."
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Images</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {watchedImages.map((img, i) => (
                <div key={i} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setValue('images', watchedImages.filter((_, idx) => idx !== i), { shouldDirty: true })}
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
          </div>
        </div>

        {/* Packages */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold">Packages & Pricing</h2>
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

          <div>
            <label className="block text-sm font-medium mb-2">Pricing Type</label>
            <select
              {...register('pricingType')}
              className="w-full max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ONE_TIME">One-time purchases only</option>
              <option value="SUBSCRIPTION">Subscriptions only</option>
              <option value="BOTH">Both one-time and subscriptions</option>
            </select>
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Revisions</label>
                  <input
                    type="number"
                    {...register(`packages.${index}.revisions`, { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  {...register(`packages.${index}.description`)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  defaultValue={field.features?.join('\n') || ''}
                  onChange={(e) => {
                    const features = e.target.value.split('\n').filter(f => f.trim());
                    setValue(`packages.${index}.features`, features.length > 0 ? features : [''], { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" type="button" onClick={() => navigate('/seller/services')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty || updateServiceMutation.isPending}>
            {updateServiceMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
