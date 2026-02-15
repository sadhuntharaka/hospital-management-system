import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/appConfig';

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
  const { user, isAdmin, authMessage, clearAuthMessage } = useAuthContext();
  const [authError, setAuthError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

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

  useEffect(() => {
    return () => clearAuthMessage();
  }, [clearAuthMessage]);

  if (user && isAdmin) return <Navigate to="/dashboard" replace />;

  const locationMessage = (location.state as { message?: string } | null)?.message;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        className="w-full max-w-md space-y-3 rounded bg-white p-6 shadow"
        onSubmit={handleSubmit(async (data) => {
          setAuthError('');
          clearAuthMessage();

          try {
            const credential = await signInWithEmailAndPassword(auth, data.email, data.password);
            const signedEmail = credential.user.email?.toLowerCase() || '';

            if (!ADMIN_EMAIL || signedEmail !== ADMIN_EMAIL) {
              await signOut(auth);
              setAuthError('Not authorized');
              return;
            }

            navigate('/dashboard', { replace: true });
          } catch (error) {
            setAuthError(mapFirebaseAuthError(error));
          }
        })}
      >
        <h1 className="text-xl font-bold">Admin Login</h1>
        <Input type="email" autoComplete="email" {...register('email')} />
        {(isSubmitted || touchedFields.email) && errors.email?.message && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}

        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          {...register('password')}
        />
        {(isSubmitted || touchedFields.password) && errors.password?.message && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}

        {(authError || authMessage || locationMessage) && (
          <p className="text-sm text-red-600">{authError || authMessage || locationMessage}</p>
        )}

        <Button disabled={isSubmitting} type="submit" aria-busy={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
};
