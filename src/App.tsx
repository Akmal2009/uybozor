import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { SupportWidget } from './components/SupportWidget';

// Tezkor ochilish uchun Code-Splitting (Lazy Loading)
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage').then(m => ({ default: m.ListingDetailPage })));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage').then(m => ({ default: m.CreateListingPage })));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage').then(m => ({ default: m.MyListingsPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const AdminRoute = lazy(() => import('./admin/AdminRoute').then(m => ({ default: m.AdminRoute })));
const AdminLayout = lazy(() => import('./admin/AdminLayout').then(m => ({ default: m.AdminLayout })));

// Sahifa o'zgarganda yuqoriga aylantirish
const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};

// Tezkor yuklanish skeleti
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Asosiy foydalanuvchi interfeysi (Header va Footer bilan)
const UserAppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  if (isAdminPath) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
      <AuthModal />
      <SupportWidget />
    </div>
  );
};

export const App: React.FC = () => {
  useEffect(() => {
    // Sayt ochilishini sekinlashtirmaslik uchun Telegram bot polling 1.5 soniyadan so'ng ishga tushadi
    const timer = setTimeout(() => {
      import('./services/telegramService').then(m => {
        m.startTelegramBotPolling();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <FavoritesProvider>
          <ScrollToTop />
          <UserAppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/listing/:id" element={<ListingDetailPage />} />
                <Route path="/create-listing" element={<CreateListingPage />} />
                <Route path="/my-listings" element={<MyListingsPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route
                  path="/admin/*"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </Suspense>
          </UserAppLayout>
        </FavoritesProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
