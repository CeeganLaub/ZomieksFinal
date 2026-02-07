import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  AtSymbolIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  country: z.string().default('ZA'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

// Benefits list
const benefits = [
  'Access to 1000+ talented freelancers',
  'Secure escrow payments',
  'Money-back guarantee',
];

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'ZA',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      toast.success('Welcome to Zomieks!');
      navigate('/services');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-0 shadow-2xl overflow-hidden">
        {/* Decorative gradient bar */}
        <div className="h-2 bg-gradient-to-r from-primary via-purple-500 to-primary" />
        
        <CardHeader className="text-center pb-2 pt-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg"
          >
            <RocketLaunchIcon className="h-8 w-8 text-white" />
          </motion.div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription className="text-base">Join Zomieks and start buying or selling services</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-8">
            {/* Benefits */}
            <motion.div 
              className="bg-muted/50 rounded-xl p-4 space-y-2 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </motion.div>
            
            <motion.div 
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative">
                <UserIcon className="absolute left-3 top-[38px] h-5 w-5 text-muted-foreground" />
                <Input
                  id="firstName"
                  label="First name"
                  placeholder="John"
                  error={errors.firstName?.message}
                  className="pl-10"
                  {...register('firstName')}
                />
              </div>
              <Input
                id="lastName"
                label="Last name"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="relative">
                <AtSymbolIcon className="absolute left-3 top-[38px] h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  label="Username"
                  placeholder="johndoe"
                  error={errors.username?.message}
                  className="pl-10"
                  {...register('username')}
                />
              </div>
            </motion.div>

            {/* Country is fixed to South Africa */}
            <input type="hidden" {...register('country')} />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.37 }}
            >
              <div className="relative">
                <GlobeAltIcon className="absolute left-3 top-[38px] h-5 w-5 text-muted-foreground" />
                <label className="block text-sm font-medium mb-1.5">Country</label>
                <div className="w-full h-10 pl-10 pr-3 border rounded-md bg-muted/50 flex items-center text-sm">
                  🇿🇦 South Africa
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-[38px] h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  className="pl-10"
                  {...register('email')}
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-[38px] h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  className="pl-10"
                  {...register('password')}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-[38px] h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  className="pl-10"
                  {...register('confirmPassword')}
                />
              </div>
            </motion.div>
          </CardContent>

          <CardFooter className="flex-col space-y-4 px-8 pb-8">
            <motion.div 
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <Button 
                type="submit" 
                className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all" 
                isLoading={isLoading}
              >
                Create account
              </Button>
            </motion.div>

            <motion.p 
              className="text-xs text-muted-foreground text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              By registering, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>
            </motion.p>
            
            <motion.p 
              className="text-sm text-muted-foreground text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </motion.p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
