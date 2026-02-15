import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AuthClaims, UserProfile } from '@/types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setClaims(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const token = await nextUser.getIdTokenResult(true);
      const nextClaims: AuthClaims = {
        clinicId: String(token.claims.clinicId || ''),
        role: token.claims.role as AuthClaims['role'],
      };
      setClaims(nextClaims);

      if (nextClaims.clinicId) {
        const profileSnap = await getDoc(
          doc(db, 'clinics', nextClaims.clinicId, 'users', nextUser.uid),
        );
        setProfile((profileSnap.data() as UserProfile) || null);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    claims,
    profile,
    loading,
    login: (email: string, password: string) =>
      signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  };
};
