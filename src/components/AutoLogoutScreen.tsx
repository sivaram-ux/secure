'use client';

import { useAuth } from '@/contexts/AuthContext';

interface AutoLogoutScreenProps {
  showLogoutButton?: boolean;
}

export default function AutoLogoutScreen({ showLogoutButton = false }: AutoLogoutScreenProps) {
  const { logout } = useAuth();

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

        {showLogoutButton ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">Session verification complete.</p>
            <button
              onClick={logout}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            <div className="animate-pulse mb-2">Loading your dashboard...</div>
            <div className="w-48 mx-auto bg-gray-200 rounded-full h-1">
              <div className="bg-blue-500 h-1 rounded-full" style={{
                animation: 'progress 1.5s ease-in-out forwards'
              }}></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}