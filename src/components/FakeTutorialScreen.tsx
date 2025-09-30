'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function FakeTutorialScreen() {
  const { logout } = useAuth();

  useEffect(() => {
    // Show fake success for 2.5 seconds, then fake error and logout
    const timer = setTimeout(() => {
      console.error('❌ Tutorial Error: Firebase configuration issue detected');
      console.error('📝 Common issue in Firebase tutorials - session expired');
      alert('Firebase Tutorial Demo: Session configuration error. This is normal in tutorial environments.');
      logout();
    }, 2500);

    return () => clearTimeout(timer);
  }, [logout]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Firebase Tutorial Loading */}
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-white animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12.017 0C8.986.01 6.556.357 4.738 1.137c-.85.364-1.357 1.174-1.357 2.17v7.642c0 4.45 2.902 8.378 7.13 9.95a1.317 1.317 0 00.961 0c4.229-1.572 7.13-5.5 7.13-9.95V3.307c0-.996-.507-1.806-1.357-2.17C17.463.357 15.033.01 12.017 0z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Firebase Auth Tutorial</h2>
          <p className="text-sm text-gray-600 mb-4">Authentication successful! Loading tutorial data...</p>
        </div>

        {/* Fake Loading Animation */}
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Initializing Firebase SDK...</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Connecting to tutorial database...
          </div>
        </div>

        {/* Fake Tutorial Info */}
        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h3 className="text-sm font-medium text-orange-800 mb-2">Tutorial Progress</h3>
          <div className="text-xs text-orange-700 space-y-1">
            <div>✅ Google OAuth Setup</div>
            <div>✅ User Authentication</div>
            <div className="animate-pulse">🔄 Loading User Data...</div>
          </div>
        </div>
      </div>
    </div>
  );
}