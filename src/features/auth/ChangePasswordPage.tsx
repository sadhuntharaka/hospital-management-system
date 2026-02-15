import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/lib/firebase';
import { useAuthContext } from './AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a symbol'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ChangePasswordPage = () => {
  const { user, claims, logout } = useAuthContext();
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        className="w-full max-w-md space-y-3 rounded bg-white p-6 shadow"
        onSubmit={handleSubmit(async ({ newPassword }) => {
          setError('');
          try {
            if (!auth.currentUser || !user || !claims?.clinicId) {
              throw new Error('Session missing. Please login again.');
            }

            await updatePassword(auth.currentUser, newPassword);
            await updateDoc(doc(db, 'clinics', claims.clinicId, 'users', user.uid), {
              mustChangePassword: false,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
            });

            navigate('/dashboard', { replace: true });
            window.location.reload();
          } catch (err) {
            setError((err as Error).message || 'Failed to update password');
          }
        })}
      >
        <h1 className="text-xl font-semibold">Change Password</h1>
        <p className="text-sm text-slate-600">You must change your password before continuing.</p>
        <Input type="password" placeholder="New password" {...register('newPassword')} />
        {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
        <Input type="password" placeholder="Confirm new password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update password'}</Button>
          <Button type="button" className="bg-slate-600" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </form>
    </div>
  );
};
