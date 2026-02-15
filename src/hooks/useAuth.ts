import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/appConfig';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const isAdmin =
        !!nextUser.email && !!ADMIN_EMAIL && nextUser.email.toLowerCase() === ADMIN_EMAIL;

      if (!isAdmin) {
        setAuthMessage('Not authorized');
        await signOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    isAdmin: !!user?.email && !!ADMIN_EMAIL && user.email.toLowerCase() === ADMIN_EMAIL,
    authMessage,
    clearAuthMessage: () => setAuthMessage(''),
    login: (email: string, password: string) =>
      signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  };
};
