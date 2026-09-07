import React, { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminLoginConfirm } from './AdminLoginConfirm';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [is2FaApproved, setIs2FaApproved] = useState<boolean>(
    sessionStorage.getItem('admin_2fa_approved') === 'true'
  );

  const [pendingAdminInfo, setPendingAdminInfo] = useState<{
    name: string;
    phone: string;
  } | null>(null);

  // 1. Agar 2FA tasdiqlangan bo'lsa -> To'g'ridan-to'g'ri Admin panelini ochish
  if (is2FaApproved) {
    return <>{children}</>;
  }

  // 2. Agar login/parol kiritilgan bo'lsa -> Telegram 2FA tasdiqlash sahifasi
  if (pendingAdminInfo) {
    return (
      <AdminLoginConfirm
        adminInfo={pendingAdminInfo}
        onApproved={() => {
          sessionStorage.setItem('admin_2fa_approved', 'true');
          setIs2FaApproved(true);
        }}
        onCancel={() => {
          setPendingAdminInfo(null);
        }}
      />
    );
  }

  // 3. Boshlang'ich holat: Maxsus Login va Parol kiritish formasi
  return (
    <AdminLogin
      onLoginSuccess={(info) => {
        setPendingAdminInfo(info);
      }}
    />
  );
};
