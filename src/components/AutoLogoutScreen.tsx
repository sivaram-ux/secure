'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AutoLogoutScreen() {
  const { logout } = useAuth();

  useEffect(() => {
    // Auto logout after 2 seconds
    const timer = setTimeout(() => {
      logout();
    }, 2000);

    return () => clearTimeout(timer);
  }, [logout]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Login Successful</h2>
          <p className="text-gray-600 mb-4">Authentication completed successfully.</p>
        </div>

        <div className="text-sm text-gray-500">
          <div className="animate-pulse mb-2">Auto-logging out in 2 seconds...</div>
          <div className="w-48 mx-auto bg-gray-200 rounded-full h-1">
            <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{
              animation: 'shrink 2s linear forwards'
            }}></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}