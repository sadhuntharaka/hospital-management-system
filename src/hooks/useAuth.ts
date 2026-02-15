import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AuthClaims } from '@/types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const token = await nextUser.getIdTokenResult(true);
        setClaims({
          clinicId: String(token.claims.clinicId || ''),
          role: token.claims.role as AuthClaims['role'],
        });
      } else {
        setClaims(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    claims,
    loading,
    login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  };
};
