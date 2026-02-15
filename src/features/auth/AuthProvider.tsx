import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
};
