'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { secureFetch, secureLog } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pepper: string | null;
  isUnauthorized: boolean;
  showingLoginSuccess: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pepper, setPepper] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [showingLoginSuccess, setShowingLoginSuccess] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());


  // Session timeout - 30 minutes of inactivity
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    // Check for redirect result first
    getRedirectResult(auth).then(async (result) => {
      if (result) {
        secureLog.info('Redirect sign-in successful:', result.user?.email);
      }
    }).catch((error) => {
      secureLog.error('Redirect result error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Show login success screen for everyone initially
        setShowingLoginSuccess(true);

        // Get pepper from server after a brief delay
        setTimeout(async () => {
          try {
            const response = await secureFetch('/api/get-pepper', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userEmail: user.email }),
            });

            const data = await response.json();

            // Check if we got actual pepper data or if this is a blocked user
            if (data.pepper && data.pepper.length > 0) {
              setPepper(data.pepper);
              setLastActivity(Date.now());
              // Hide login success screen and show dashboard
              setShowingLoginSuccess(false);
              secureLog.security('User authorized, pepper retrieved');
            } else {
              // For unauthorized users - no error logs, just mark as unauthorized
              setIsUnauthorized(true);
              setShowingLoginSuccess(false);
              secureLog.security('User unauthorized, showing deception flow');
            }
          } catch {
            // Completely silent - no indication of any error
            setIsUnauthorized(true);
            setShowingLoginSuccess(false);
            secureLog.debug('Pepper fetch failed, treating as unauthorized');
          }
        }, 1500); // 1.5 second delay to show login success
      } else {
        setPepper(null);
        setIsUnauthorized(false);
        setShowingLoginSuccess(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Activity tracking and session timeout
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const checkSession = () => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        secureLog.info('Session expired due to inactivity');
        logout();
      }
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check session every minute
    const sessionInterval = setInterval(checkSession, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(sessionInterval);
    };
  }, [user, lastActivity, SESSION_TIMEOUT]);

  const signInWithGoogle = async () => {
    try {
      secureLog.debug('Starting Google sign-in...');
      secureLog.debug('Firebase config check:', {
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });

      // Try popup first, fallback to redirect if it fails
      try {
        const result = await signInWithPopup(auth, googleProvider);
        secureLog.info('Authentication successful');
        secureLog.info('User email:', result.user?.email);
      } catch (popupError: unknown) {
        if ((popupError as {code?: string}).code === 'auth/popup-blocked' || (popupError as {code?: string}).code === 'auth/popup-closed-by-user') {
          secureLog.debug('Popup blocked or closed, trying redirect method...');
          await signInWithRedirect(auth, googleProvider);
          return; // signInWithRedirect doesn't return immediately
        }
        throw popupError; // Re-throw other errors
      }
    } catch (error: unknown) {
      secureLog.error('=== DETAILED SIGN IN ERROR ===');
      secureLog.error('Error code:', (error as {code?: string}).code);
      secureLog.error('Error message:', (error as {message?: string}).message);
      secureLog.error('Full error:', error);
      secureLog.error('Current URL:', window.location.href);

      // Provide more specific error information
      if ((error as {code?: string}).code === 'auth/internal-error') {
        secureLog.error('🔍 FIREBASE INTERNAL ERROR DEBUGGING:');
        secureLog.error('1. Check if Google OAuth is enabled in Firebase Console');
        secureLog.error('2. Check if current domain is authorized:', window.location.hostname);
        secureLog.error('3. Check if Web Application OAuth client is configured');
        secureLog.error('4. Try opening in incognito mode');
        alert(`Authentication setup error. Please check browser console for details.\nCurrent domain: ${window.location.hostname}`);
      } else if ((error as {code?: string}).code === 'auth/configuration-not-found') {
        secureLog.error('Firebase configuration not found');
        alert('Firebase configuration error. Please check environment variables.');
      } else if ((error as {code?: string}).code === 'auth/unauthorized-domain') {
        secureLog.error('Domain not authorized:', window.location.hostname);
        alert(`Domain "${window.location.hostname}" is not authorized. Add it to Firebase Console.`);
      } else {
        alert(`Authentication failed: ${(error as {code?: string}).code} - ${(error as {message?: string}).message || 'Unknown error'}`);
      }

      throw error;
    }
  };

  const logout = async () => {
    try {
      setPepper(null);
      setIsUnauthorized(false);
      setShowingLoginSuccess(false);
      await signOut(auth);
    } catch (error) {
      secureLog.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    pepper,
    isUnauthorized,
    showingLoginSuccess,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}