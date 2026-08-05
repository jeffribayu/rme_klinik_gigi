import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordRequest } from '@/services/authService';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    try {
      const res = await forgotPasswordRequest({ email: values.email });
      toast.success(res.message || 'Kode reset password dikirim ke email');
      navigate(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengirim kode reset');
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
              <MailCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Lupa password</CardTitle>
            <CardDescription>
              Masukkan email akun dokter, perawat, atau admin. Sistem akan mengirim kode 6 digit
              untuk mengganti password.
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
                  placeholder="nama@klinik.test"
                  className="h-11 bg-background/80"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim kode...
                  </>
                ) : (
                  'Kirim kode reset'
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Kode berlaku 15 menit. Periksa inbox/spam email Anda.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
