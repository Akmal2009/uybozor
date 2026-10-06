import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentUser, loginUser, logoutUser, registerUser, authenticateWithToken } from '../services/authService';
import { getSupabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (phoneOrEmail: string, password?: string) => Promise<User>;
  register: (name: string, phone: string, email?: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. URL parametridan 'auth_token' ni tekshirish
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('auth_token');
        if (authToken && authToken.trim()) {
          const loggedUser = await authenticateWithToken(authToken.trim());
          if (loggedUser && isMounted) {
            setUser(loggedUser);
            const cleanUrl = window.location.pathname + (window.location.hash || '');
            window.history.replaceState({}, document.title, cleanUrl);
            return;
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Auto-login from token error:', e);
      }

      // 2. Mavjud Supabase Auth sessiyasini yuklash
      const active = await getCurrentUser();
      if (active && isMounted) {
        setUser(active);
      }
    };

    initAuth();

    // 3. Supabase Auth holat o'zgarishini tinglash (avtomatik refresh / logout)
    const supabase = getSupabase();
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const updatedUser = await getCurrentUser();
          if (isMounted) setUser(updatedUser);
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (phoneOrEmail: string, password?: string) => {
    const res = await loginUser(phoneOrEmail, password);
    setUser(res);
    setIsAuthModalOpen(false);
    return res;
  };

  const register = async (name: string, phone: string, email?: string, password?: string) => {
    const res = await registerUser(name, phone, email, password);
    setUser(res);
    setIsAuthModalOpen(false);
    return res;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
