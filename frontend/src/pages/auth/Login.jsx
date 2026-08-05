import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginRequest } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { dashboardPath } from '@/lib/dashboardPaths';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const from = location.state?.from?.pathname;
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const n = location.state?.notice;
    if (n === 'resepsionis-disabled' || n === 'legacy-role') {
      toast.error('Silakan login lagi. Peran aplikasi: admin, dokter, atau perawat.');
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.state?.notice, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      const data = await loginRequest({
        email: values.email,
        password: values.password,
      });
      setAuth(data.data.token, data.data.user);
      toast.success('Login berhasil');
      navigate(from && from !== '/login' ? from : dashboardPath(data.data.user.role), {
        replace: true,
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login gagal');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-emerald-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.1),transparent_45%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-lg lg:mx-0"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-white/60 px-4 py-1.5 text-xs font-medium text-cyan-800 shadow-sm backdrop-blur-md dark:border-cyan-400/20 dark:bg-slate-900/60 dark:text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              DentalCare RME - rekam medis gigi
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Akses aman untuk tim klinik
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Login untuk admin, dokter, dan perawat. Akun dibuat dan dikelola oleh admin klinik.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 lg:px-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="w-full max-w-md"
          >
            <div className="mb-6 flex justify-center lg:justify-start">
              <img
                src="/assets/logo.png"
                alt=""
                className="h-14 w-14 rounded-2xl object-cover shadow-lg ring-1 ring-border/60"
              />
            </div>

            <Card
              className={cn(
                'border border-white/60 shadow-2xl backdrop-blur-xl',
                'dark:border-slate-700/60 dark:bg-slate-900/70'
              )}
            >
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>Masukkan email dan password akun Anda.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      className="h-11 bg-background/80"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="h-11 bg-background/80 pr-10"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Lupa password?
                    </Link>
                  </div>

                  <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
