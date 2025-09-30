'use client';

import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import LoginPage from '@/components/LoginPage';
import AutoLogoutScreen from '@/components/AutoLogoutScreen';

export default function Home() {
  const { user, loading, isUnauthorized, showingLoginSuccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login success screen for everyone who just logged in
  if (user && showingLoginSuccess) {
    return <AutoLogoutScreen showLogoutButton={false} />;
  }

  // Show logout screen for unauthorized users
  if (user && isUnauthorized) {
    return <AutoLogoutScreen showLogoutButton={true} />;
  }

  return user ? <Dashboard /> : <LoginPage />;
}
