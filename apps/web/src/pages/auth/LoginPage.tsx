import { useState, useEffect } from 'react';
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
import { EnvelopeIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user: currentUser } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      navigate(currentUser.isAdmin ? '/admin' : '/explore', { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      const user = useAuthStore.getState().user;
      const target = user?.isAdmin ? '/admin' : '/explore';
      navigate(target, { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
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
            <SparklesIcon className="h-8 w-8 text-white" />
          </motion.div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription className="text-base">Sign in to your account to continue</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-5 px-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
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
              transition={{ delay: 0.4 }}
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
              className="flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </motion.div>
          </CardContent>

          <CardFooter className="flex-col space-y-4 px-8 pb-8">
            <motion.div 
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button 
                type="submit" 
                className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all" 
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </motion.div>
            
            <motion.p 
              className="text-sm text-muted-foreground text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Join now
              </Link>
            </motion.p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
