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
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import {
  SparklesIcon,
  Squares2X2Icon,
  AcademicCapIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

const becomeSellerSchema = z.object({
  displayName: z.string().min(2, 'Display name is required'),
  professionalTitle: z.string().min(5, 'Professional title is required (min 5 characters)'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  skills: z.string().min(1, 'At least one skill is required'),
  languages: z.string().min(1, 'At least one language is required'),
  idNumber: z.string().min(6, 'SA ID or passport number is required for verification'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(5, 'Account number is required'),
  branchCode: z.string().min(1, 'Branch code is required'),
  accountType: z.enum(['SAVINGS', 'CURRENT', 'TRANSMISSION']),
  accountHolder: z.string().min(2, 'Account holder name is required'),
});

type BecomeSellerForm = z.infer<typeof becomeSellerSchema>;

export default function BecomeSeller() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('free');

  const isSouthAfrican = user?.country?.toUpperCase() === 'ZA';

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<BecomeSellerForm>({
    resolver: zodResolver(becomeSellerSchema),
    defaultValues: {
      accountType: 'SAVINGS',
      accountHolder: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    },
  });

  const becomeSeller = useMutation({
    mutationFn: (data: BecomeSellerForm) => {
      const skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
      const languages = data.languages.split(',').map(l => l.trim()).filter(Boolean).map(l => ({
        language: l,
        proficiency: 'FLUENT' as const,
      }));
      
      return api.post('/users/become-seller', {
        displayName: data.displayName,
        professionalTitle: data.professionalTitle,
        description: data.description,
        skills,
        languages,
        idNumber: data.idNumber,
        bankDetails: {
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          branchCode: data.branchCode,
          accountType: data.accountType,
          accountHolder: data.accountHolder,
        },
      });
    },
    onSuccess: async () => {
      await refreshUser();

      // If Pro plan selected, initiate fee payment
      if (selectedPlan === 'pro') {
        try {
          await api.post('/users/seller/pay-fee');
          toast.success('Welcome to Zomieks Pro! Your seller account is now active.');
        } catch {
          toast.success('Seller profile created! You can pay for the Pro plan later from your dashboard.');
        }
      } else {
        toast.success('Welcome to Zomieks as a seller!');
      }

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
    'Create & sell video courses',
    'Custom BioLink storefront page',
  ];

  if (!isSouthAfrican) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">South Africa Only (For Now)</CardTitle>
            <CardDescription>
              Selling on Zomieks is currently available to South African users only. 
              We&apos;re working on international support via Stripe Connect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>Your account country: <strong>{user?.country || 'Not set'}</strong></p>
              <p className="mt-2">
                If you&apos;re in South Africa, please update your country in{' '}
                <a href="/settings" className="text-primary hover:underline">Settings</a> to &quot;ZA&quot;.
              </p>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <p className="text-sm text-muted-foreground mt-2">
                  Upgrade to <strong>Zomieks Pro (R399/month)</strong> to unlock courses, 
                  your BioLink storefront page, and priority search ranking!
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">🇿🇦 South Africa Only</h4>
                <p className="text-sm text-blue-700">
                  Selling is currently available to South African users only. 
                  We process payouts via bank transfer (EFT). 
                  International support is coming soon via Stripe Connect.
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

  if (step === 2) {
    const freePlanFeatures = [
      { icon: Squares2X2Icon, text: 'List unlimited services', included: true },
      { icon: ChatBubbleLeftRightIcon, text: 'Built-in CRM & messaging', included: true },
      { icon: BanknotesIcon, text: '8% commission on sales', included: true },
      { icon: AcademicCapIcon, text: 'Create & sell courses', included: false },
      { icon: LinkIcon, text: 'BioLink storefront page', included: false },
      { icon: MagnifyingGlassIcon, text: 'Priority search ranking', included: false },
    ];

    const proPlanFeatures = [
      { icon: Squares2X2Icon, text: 'List unlimited services', included: true },
      { icon: ChatBubbleLeftRightIcon, text: 'Built-in CRM & messaging', included: true },
      { icon: BanknotesIcon, text: '8% commission on sales', included: true },
      { icon: AcademicCapIcon, text: 'Create & sell video courses', included: true },
      { icon: LinkIcon, text: 'Custom BioLink storefront', included: true },
      { icon: MagnifyingGlassIcon, text: 'Priority search ranking', included: true },
    ];

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-1">Step 2 of 4: Select the plan that works for you</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div
            onClick={() => setSelectedPlan('free')}
            className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
              selectedPlan === 'free'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            {selectedPlan === 'free' && (
              <div className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Selected
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold">Starter</h3>
              <p className="text-muted-foreground text-sm">Get started selling services</p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold">Free</span>
              <span className="text-muted-foreground ml-1">forever</span>
            </div>
            <ul className="space-y-3">
              {freePlanFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {f.included ? (
                    <CheckIcon className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <span className="h-5 w-5 flex items-center justify-center shrink-0">
                      <span className="block w-3 h-0.5 bg-muted-foreground/30" />
                    </span>
                  )}
                  <f.icon className={`h-4 w-4 shrink-0 ${f.included ? 'text-foreground' : 'text-muted-foreground/40'}`} />
                  <span className={f.included ? '' : 'text-muted-foreground/40'}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div
            onClick={() => setSelectedPlan('pro')}
            className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
              selectedPlan === 'pro'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" /> Recommended
            </div>
            {selectedPlan === 'pro' && (
              <div className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Selected
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold">Zomieks Pro</h3>
              <p className="text-muted-foreground text-sm">Full access to everything</p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold">R399</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
            <ul className="space-y-3">
              {proPlanFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <CheckIcon className="h-5 w-5 text-green-500 shrink-0" />
                  <f.icon className="h-4 w-4 shrink-0 text-foreground" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {selectedPlan === 'pro'
            ? 'You can subscribe to Pro after creating your profile, or upgrade anytime from your dashboard.'
            : 'You can always upgrade to Pro later from your seller dashboard.'}
        </div>

        {/* Fees Breakdown */}
        <div className="mt-10 p-6 rounded-2xl border bg-muted/30">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5 text-primary" />
            Transparent Fees
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border text-center">
              <div className="text-2xl font-bold text-primary">8%</div>
              <div className="text-sm font-medium mt-1">Seller Commission</div>
              <div className="text-xs text-muted-foreground mt-1">On every completed order</div>
            </div>
            <div className="p-4 rounded-xl bg-background border text-center">
              <div className="text-2xl font-bold text-primary">3%</div>
              <div className="text-sm font-medium mt-1">Buyer Service Fee</div>
              <div className="text-xs text-muted-foreground mt-1">Paid by the buyer, not you</div>
            </div>
            <div className="p-4 rounded-xl bg-background border text-center">
              <div className="text-2xl font-bold text-primary">20%</div>
              <div className="text-sm font-medium mt-1">Course Platform Fee</div>
              <div className="text-xs text-muted-foreground mt-1">On course sales (Pro only)</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Example: You list a service for R1,000 → You keep R920. The buyer pays R1,030 (R1,000 + 3% service fee).
          </p>
        </div>

        {/* What You Can Do */}
        <div className="mt-10">
          <h3 className="font-bold text-lg mb-6 text-center">What You Can Do on Zomieks</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Services */}
            <div className="p-5 rounded-2xl border bg-background text-center group hover:shadow-lg hover:border-primary/20 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Squares2X2Icon className="h-7 w-7 text-emerald-600" />
              </div>
              <h4 className="font-bold mb-1">Sell Services</h4>
              <p className="text-xs text-muted-foreground">
                Create gigs with tiered packages (Basic, Standard, Premium). Buyers order and you deliver.
              </p>
              <div className="mt-3 p-2 rounded-lg bg-muted/50 text-xs">
                <span className="font-medium">Free + Pro</span>
              </div>
            </div>
            {/* Courses */}
            <div className="p-5 rounded-2xl border bg-background text-center group hover:shadow-lg hover:border-purple-300/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <AcademicCapIcon className="h-7 w-7 text-purple-600" />
              </div>
              <h4 className="font-bold mb-1">Create Courses</h4>
              <p className="text-xs text-muted-foreground">
                Build video courses with lessons and modules. Students enroll and learn at their own pace.
              </p>
              <div className="mt-3 p-2 rounded-lg bg-purple-50 text-xs">
                <span className="font-medium text-purple-700">Pro Only</span>
              </div>
            </div>
            {/* BioLink */}
            <div className="p-5 rounded-2xl border bg-background text-center group hover:shadow-lg hover:border-blue-300/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <LinkIcon className="h-7 w-7 text-blue-600" />
              </div>
              <h4 className="font-bold mb-1">BioLink Page</h4>
              <p className="text-xs text-muted-foreground">
                Your custom link-in-bio storefront. Showcase services, courses, portfolio & social links.
              </p>
              <div className="mt-3 p-2 rounded-lg bg-blue-50 text-xs">
                <span className="font-medium text-blue-700">Pro Only</span>
              </div>
            </div>
          </div>
        </div>

        {/* BioLink Preview */}
        <div className="mt-10 p-6 rounded-2xl border bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                <LinkIcon className="h-3 w-3" />
                BioLink Preview
              </div>
              <h3 className="font-bold text-lg mb-2">Your own digital storefront</h3>
              <p className="text-sm text-muted-foreground mb-4">
                With Zomieks Pro, you get a custom BioLink page at <strong>zomieks.co.za/your-name</strong>. 
                Share it on Instagram, WhatsApp, Twitter, email signatures — anywhere.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  'Customize your theme and colors',
                  'Display all your services and courses',
                  'Add portfolio images',
                  'Link your social profiles',
                  'Contact button for direct inquiries',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Mini Phone Mockup */}
            <div className="flex justify-center">
              <div className="w-[200px] h-[400px] bg-gray-900 rounded-[2rem] p-2 shadow-xl border-2 border-gray-800">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-900 rounded-b-xl" />
                <div className="w-full h-full bg-gradient-to-b from-emerald-500 to-teal-600 rounded-[1.5rem] overflow-hidden">
                  <div className="pt-8 px-3 text-center text-white">
                    <div className="w-14 h-14 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center text-2xl">
                      👩‍💻
                    </div>
                    <h4 className="font-bold text-sm">Your Name</h4>
                    <p className="text-[10px] text-emerald-200 mb-3">Your Title Here</p>
                    <div className="space-y-1.5">
                      {['My Service 1', 'My Service 2', 'My Course'].map((item, i) => (
                        <div key={i} className="bg-white/15 backdrop-blur-sm rounded-lg py-2 px-3 text-[11px] font-medium">
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                      {['🌐', '📸', '🐦'].map((icon, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm">
                          {icon}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          <Button className="min-w-[200px]" size="lg" onClick={() => setStep(3)}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Seller Profile</CardTitle>
            <CardDescription>
              Step 3 of 4: Tell buyers about yourself and your skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} className="space-y-6">
              <Input
                id="displayName"
                label="Display Name"
                placeholder="e.g., John's Design Studio"
                error={errors.displayName?.message}
                {...register('displayName')}
              />

              <Input
                id="professionalTitle"
                label="Professional Title"
                placeholder="e.g., Professional Logo & Brand Designer"
                error={errors.professionalTitle?.message}
                {...register('professionalTitle')}
              />

              <Textarea
                id="description"
                label="About You (min 50 characters)"
                placeholder="Tell buyers about your experience, skills, and what makes you unique..."
                rows={4}
                error={errors.description?.message}
                {...register('description')}
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
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue to KYC & Banking
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">KYC & Bank Details</CardTitle>
          <CardDescription>
            Step 4 of 4: Verify your identity and add bank details for payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hidden fields from step 2 that react-hook-form needs */}
            <input type="hidden" {...register('displayName')} />
            <input type="hidden" {...register('professionalTitle')} />
            <input type="hidden" {...register('description')} />
            <input type="hidden" {...register('skills')} />
            <input type="hidden" {...register('languages')} />

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-1">🔒 Identity Verification (KYC)</h4>
              <p className="text-sm text-yellow-700">
                We require your SA ID or passport number to verify your identity. 
                This is reviewed by our team and kept secure.
              </p>
            </div>

            <Input
              id="idNumber"
              label="SA ID Number or Passport Number"
              placeholder="e.g., 9001015009087"
              error={errors.idNumber?.message}
              {...register('idNumber')}
            />

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Bank Account Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Payouts are processed via bank transfer (EFT). Admin will manually process withdrawals.
              </p>

              <div className="space-y-4">
                <Input
                  id="accountHolder"
                  label="Account Holder Name"
                  placeholder="Full name as on bank account"
                  error={errors.accountHolder?.message}
                  {...register('accountHolder')}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="bankName"
                    label="Bank Name"
                    placeholder="e.g., FNB, Capitec, Standard Bank"
                    error={errors.bankName?.message}
                    {...register('bankName')}
                  />
                  <div>
                    <label htmlFor="accountType" className="block text-sm font-medium mb-2">Account Type</label>
                    <select
                      id="accountType"
                      {...register('accountType')}
                      className="w-full h-10 px-3 border rounded-md bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="SAVINGS">Savings</option>
                      <option value="CURRENT">Current / Cheque</option>
                      <option value="TRANSMISSION">Transmission</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="accountNumber"
                    label="Account Number"
                    placeholder="Your account number"
                    error={errors.accountNumber?.message}
                    {...register('accountNumber')}
                  />
                  <Input
                    id="branchCode"
                    label="Branch Code"
                    placeholder="e.g., 250655"
                    error={errors.branchCode?.message}
                    {...register('branchCode')}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
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
