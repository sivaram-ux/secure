'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { secureClearObject } from '@/lib/crypto';
import CardManager from './CardManager';
import OtherManager from './OtherManager';
import ExpandableSearch from './ExpandableSearch';
import SearchResultsInfo from './SearchResultsInfo';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'cards' | 'other'>('cards');
  const [globalPasscode, setGlobalPasscode] = useState('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [decryptAllMode, setDecryptAllMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ cards: 0, others: 0 });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDecryptAll = () => {
    setShowPasscodeModal(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCardSearchResults = (count: number) => {
    setSearchResults(prev => ({ ...prev, cards: count }));
  };

  const handleOtherSearchResults = (count: number) => {
    setSearchResults(prev => ({ ...prev, others: count }));
  };

  const executeDecryptAll = () => {
    if (!globalPasscode.trim()) return;
    setShowPasscodeModal(false);
    setDecryptAllMode(true);
  };

  const lockAll = () => {
    // Clear sensitive data from memory
    secureClearObject({ globalPasscode });
    setDecryptAllMode(false);
    setGlobalPasscode('');
  };

  // Clear sensitive data on component unmount
  useEffect(() => {
    return () => {
      secureClearObject({ globalPasscode });
    };
  }, [globalPasscode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Secure Vault</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <ExpandableSearch onSearch={handleSearch} />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>
              {!decryptAllMode ? (
                <button
                  onClick={handleDecryptAll}
                  className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Decrypt All
                </button>
              ) : (
                <button
                  onClick={lockAll}
                  className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Lock All
                </button>
              )}
              <div className="flex items-center space-x-2">
                <Image
                  className="h-8 w-8 rounded-full"
                  src={user?.photoURL || '/default-avatar.png'}
                  alt={user?.displayName || 'User'}
                  width={32}
                  height={32}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.displayName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('cards')}
              className={`${
                activeTab === 'cards'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <div className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Cards
              </div>
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={`${
                activeTab === 'other'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <div className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Other
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Decrypt All Warning Banner */}
      {decryptAllMode && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Security Alert:</strong> All sensitive information is decrypted and visible. Click &quot;Lock All&quot; to hide sensitive data again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Results Info */}
        {searchQuery.trim() && (
          <SearchResultsInfo
            searchQuery={searchQuery}
            totalResults={searchResults.cards + searchResults.others}
            totalCards={searchResults.cards}
            totalOthers={searchResults.others}
          />
        )}

        {activeTab === 'cards' ? (
          <CardManager
            globalPasscode={globalPasscode}
            decryptAllMode={decryptAllMode}
            searchQuery={searchQuery}
            onSearchResults={handleCardSearchResults}
          />
        ) : (
          <OtherManager
            globalPasscode={globalPasscode}
            decryptAllMode={decryptAllMode}
            searchQuery={searchQuery}
            onSearchResults={handleOtherSearchResults}
          />
        )}
      </main>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Enter Passcode to Decrypt All</h3>
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This will decrypt and display all your sensitive information on the main page.
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); executeDecryptAll(); }}>
              <input
                type="password"
                value={globalPasscode}
                onChange={(e) => setGlobalPasscode(e.target.value)}
                placeholder="Your encryption passcode"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setGlobalPasscode('');
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Decrypt All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}