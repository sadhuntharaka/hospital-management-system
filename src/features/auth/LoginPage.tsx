import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const mapFirebaseAuthError = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return 'Unable to login. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    default:
      return 'Unable to login. Please try again.';
  }
};

export const LoginPage = () => {
  const { user, login, profile } = useAuthContext();
  const [authError, setAuthError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted, touchedFields },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (user && profile?.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        className="w-full max-w-md space-y-3 rounded bg-white p-6 shadow"
        onSubmit={handleSubmit(async (data) => {
          setAuthError('');
          try {
            await login(data.email, data.password);
          } catch (error) {
            setAuthError(mapFirebaseAuthError(error));
          }
        })}
      >
        <h1 className="text-xl font-bold">Clinic Login</h1>
        <Input
          placeholder="Email"
          autoComplete="email"
          {...register('email')}
          name="email"
        />
        {(isSubmitted || touchedFields.email) && errors.email?.message && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}

        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          {...register('password')}
          name="password"
        />
        {(isSubmitted || touchedFields.password) && errors.password?.message && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}

        {authError && <p className="text-sm text-red-600">{authError}</p>}

        <Button disabled={isSubmitting} type="submit" aria-busy={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
};
