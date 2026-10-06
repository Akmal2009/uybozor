import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminLoginConfirm } from './AdminLoginConfirm';
import { checkLoginRequestStatus } from '../services/adminService';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [is2FaApproved, setIs2FaApproved] = useState<boolean>(() => {
    const approved = sessionStorage.getItem('admin_2fa_approved') === 'true';
    const reqId = sessionStorage.getItem('admin_session_req_id');
    const timestamp = Number(sessionStorage.getItem('admin_session_timestamp') || '0');
    // Sessiya 24 soat ichida bo'lishi shart va requestId bo'lishi shart
    const isNotExpired = Date.now() - timestamp < 24 * 60 * 60 * 1000;
    return Boolean(approved && reqId && isNotExpired);
  });

  const [pendingAdminInfo, setPendingAdminInfo] = useState<{
    name: string;
    phone: string;
  } | null>(null);

  // Backend tekshiruvi: sessiya haqiqatan bazada tasdiqlanganmi? (Konsol orqali soxta flag yasashdan himoya)
  useEffect(() => {
    const reqId = sessionStorage.getItem('admin_session_req_id');
    if (is2FaApproved && reqId && !reqId.startsWith('direct_approved_')) {
      checkLoginRequestStatus(reqId).then(status => {
        if (status !== 'tasdiqlangan') {
          sessionStorage.removeItem('admin_2fa_approved');
          sessionStorage.removeItem('admin_session_req_id');
          sessionStorage.removeItem('admin_session_timestamp');
          setIs2FaApproved(false);
        }
      });
    }
  }, [is2FaApproved]);

  // 1. Agar tasdiqlangan bo'lsa -> To'g'ridan-to'g'ri Admin panelini ochish
  if (is2FaApproved) {
    return <>{children}</>;
  }

  // 2. Boshlang'ich holat: Login va Parol kiritish formasi
  return (
    <AdminLogin
      onLoginSuccess={(info) => {
        sessionStorage.setItem('admin_2fa_approved', 'true');
        sessionStorage.setItem('admin_session_timestamp', Date.now().toString());
        sessionStorage.setItem('admin_session_req_id', 'direct_approved_' + Date.now());
        setIs2FaApproved(true);
      }}
    />
  );
};
