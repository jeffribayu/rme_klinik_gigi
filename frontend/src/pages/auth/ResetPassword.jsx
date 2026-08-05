import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordRequest } from '@/services/authService';

const schema = z
  .object({
    email: z.string().email('Email tidak valid'),
    code: z.string().regex(/^\d{6}$/, 'Kode reset harus 6 digit'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(8, 'Konfirmasi password minimal 8 karakter'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: params.get('email') || '',
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      const res = await resetPasswordRequest({
        email: values.email,
        code: values.code,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      toast.success(res.message || 'Password berhasil diganti');
      navigate('/login', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengganti password');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50/70 to-emerald-50/80 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.16),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.12),transparent_45%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4">
        <Card className="w-full border-white/70 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/75">
          <CardHeader>
            <Link
              to="/login"
              className="mb-3 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke login
            </Link>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-700 dark:text-teal-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Buat password baru</CardTitle>
            <CardDescription>
              Masukkan email, kode 6 digit dari email, lalu password baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email akun</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="h-11 bg-background/80"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Kode reset</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6 digit"
                    className="h-11 bg-background/80 text-center text-lg font-semibold tracking-[0.35em]"
                    {...register('code')}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password baru</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPw2 ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="h-11 bg-background/80 pr-10"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                      onClick={() => setShowPw2((v) => !v)}
                      aria-label={showPw2 ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan password baru'
                  )}
                </Button>
              </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
