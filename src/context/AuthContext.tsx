import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentUser, loginUser, logoutUser, registerUser, authenticateWithToken } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (phoneOrEmail: string, password?: string) => Promise<User>;
  register: (name: string, phone: string, email?: string, password?: string) => Promise<User>;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // 1. URL parametridan 'auth_token' ni tekshirish (Telegram bot orqali avtomatik kirish)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('auth_token');
        if (authToken && authToken.trim()) {
          const loggedUser = await authenticateWithToken(authToken.trim());
          if (loggedUser) {
            setUser(loggedUser);
            // URL tozalash (?auth_token olib tashlanadi, sahifa qayta yuklanmaydi)
            const cleanUrl = window.location.pathname + (window.location.hash || '');
            window.history.replaceState({}, document.title, cleanUrl);
            return;
          }
        }
      } catch (e) {
        console.warn('Auto-login from token error:', e);
      }

      // 2. Mavjud saqlangan sessiyani yuklash
      const active = getCurrentUser();
      if (active) {
        setUser(active);
      }
    };

    initAuth();
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

  const logout = () => {
    logoutUser();
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
