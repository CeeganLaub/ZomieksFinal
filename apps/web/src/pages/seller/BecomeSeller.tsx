import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { CheckIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const becomeSellerSchema = z.object({
  displayName: z.string().min(2, 'Display name is required'),
  tagline: z.string().max(100, 'Tagline must be less than 100 characters').optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  skills: z.string().optional(),
  languages: z.string().optional(),
});

type BecomeSellerForm = z.infer<typeof becomeSellerSchema>;

export default function BecomeSeller() {
  const navigate = useNavigate();
  const { refreshUser } = useAuthStore();
  const [step, setStep] = useState(1);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<BecomeSellerForm>({
    resolver: zodResolver(becomeSellerSchema),
  });

  const becomeSeller = useMutation({
    mutationFn: (data: BecomeSellerForm) => {
      const skills = data.skills?.split(',').map(s => s.trim()).filter(Boolean) || [];
      const languages = data.languages?.split(',').map(l => l.trim()).filter(Boolean) || ['English'];
      
      return api.post('/users/become-seller', {
        displayName: data.displayName,
        tagline: data.tagline,
        bio: data.bio,
        skills,
        languages,
      });
    },
    onSuccess: async () => {
      await refreshUser();
      toast.success('Welcome to Zomieks as a seller!');
      navigate('/seller');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create seller profile');
    },
  });

  const onSubmit = (data: BecomeSellerForm) => {
    becomeSeller.mutate(data);
  };

  const benefits = [
    'Reach thousands of potential clients',
    'Set your own prices and packages',
    'Offer one-time or subscription services',
    'Get paid securely through PayFast/OZOW',
    'Build your reputation with reviews',
    'Manage clients with our built-in CRM',
  ];

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Start Selling on Zomieks</CardTitle>
            <CardDescription>
              Join our community of talented freelancers and start earning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Why sell on Zomieks?</h3>
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckIcon className="h-4 w-4 text-primary" />
                      </div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Fee Structure</h4>
                <p className="text-sm text-muted-foreground">
                  We charge a simple <strong>8% commission</strong> on your earnings. 
                  Buyers pay a <strong>3% service fee</strong> on top of your listed price.
                  You keep 92% of what you earn!
                </p>
              </div>

              <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Seller Profile</CardTitle>
          <CardDescription>
            Tell buyers about yourself and your skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              id="displayName"
              label="Display Name"
              placeholder="e.g., John's Design Studio"
              error={errors.displayName?.message}
              {...register('displayName')}
            />

            <Input
              id="tagline"
              label="Tagline (optional)"
              placeholder="e.g., Professional logo & brand designer"
              error={errors.tagline?.message}
              {...register('tagline')}
            />

            <Textarea
              id="bio"
              label="Bio (optional)"
              placeholder="Tell buyers about your experience, skills, and what makes you unique..."
              rows={4}
              error={errors.bio?.message}
              {...register('bio')}
            />

            <Input
              id="skills"
              label="Skills (comma-separated)"
              placeholder="e.g., Logo Design, Branding, Illustration"
              error={errors.skills?.message}
              {...register('skills')}
            />

            <Input
              id="languages"
              label="Languages (comma-separated)"
              placeholder="e.g., English, Afrikaans"
              error={errors.languages?.message}
              {...register('languages')}
            />

            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" isLoading={becomeSeller.isPending}>
                Create Seller Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
