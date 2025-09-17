'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pepper: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pepper, setPepper] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());


  // Session timeout - 30 minutes of inactivity
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    // Check for redirect result first
    getRedirectResult(auth).then(async (result) => {
      if (result) {
        console.log('Redirect sign-in successful:', result.user?.email);
      }
    }).catch((error) => {
      console.error('Redirect result error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Get pepper from server
        try {
          const response = await fetch('/api/get-pepper', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userEmail: user.email }),
          });

          if (response.ok) {
            const data = await response.json();
            setPepper(data.pepper);
            setLastActivity(Date.now());
          } else {
            console.error('Failed to get pepper:', response.status);
            await signOut(auth);
          }
        } catch (error) {
          console.error('Error getting pepper:', error);
          await signOut(auth);
        }
      } else {
        setPepper(null);
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
        console.warn('Session expired due to inactivity');
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
  }, [user, lastActivity]);

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in...');
      console.log('Firebase config check:', {
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });

      // Try popup first, fallback to redirect if it fails
      try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('Sign-in successful:', result.user?.email);
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          console.log('Popup blocked or closed, trying redirect method...');
          await signInWithRedirect(auth, googleProvider);
          return; // signInWithRedirect doesn't return immediately
        }
        throw popupError; // Re-throw other errors
      }
    } catch (error: any) {
      console.error('=== DETAILED SIGN IN ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.error('Current URL:', window.location.href);

      // Provide more specific error information
      if (error.code === 'auth/internal-error') {
        console.error('🔍 FIREBASE INTERNAL ERROR DEBUGGING:');
        console.error('1. Check if Google OAuth is enabled in Firebase Console');
        console.error('2. Check if current domain is authorized:', window.location.hostname);
        console.error('3. Check if Web Application OAuth client is configured');
        console.error('4. Try opening in incognito mode');
        alert(`Authentication setup error. Please check browser console for details.\nCurrent domain: ${window.location.hostname}`);
      } else if (error.code === 'auth/configuration-not-found') {
        console.error('Firebase configuration not found');
        alert('Firebase configuration error. Please check environment variables.');
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error('Domain not authorized:', window.location.hostname);
        alert(`Domain "${window.location.hostname}" is not authorized. Add it to Firebase Console.`);
      } else {
        alert(`Authentication failed: ${error.code} - ${error.message || 'Unknown error'}`);
      }

      throw error;
    }
  };

  const logout = async () => {
    try {
      setPepper(null);
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    pepper,
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