import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export const LoginPage = () => {
  const { user, login, profile } = useAuthContext();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (user && profile?.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        className="w-full max-w-md space-y-3 rounded bg-white p-6 shadow"
        onSubmit={handleSubmit(async (v) => login(v.email, v.password))}
      >
        <h1 className="text-xl font-bold">Clinic Login</h1>
        <Input placeholder="Email" {...register('email')} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        <Input type="password" placeholder="Password" {...register('password')} />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
};
