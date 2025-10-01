import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { hashPasscode } from './crypto';
import { secureLog } from './logger';

/**
 * Verify user's passcode against stored hash
 * Returns true if correct, false if incorrect
 * If no hash exists, stores the provided passcode hash (first-time setup)
 */
export async function verifyPasscode(
  userId: string,
  passcode: string,
  pepper: string
): Promise<{ verified: boolean; isFirstTime: boolean }> {
  try {
    secureLog.debug('Verifying passcode for user:', userId);

    // Get user's stored passcode hash
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    // Calculate hash of provided passcode
    const inputHash = await hashPasscode(passcode, pepper);

    // First-time setup: no hash exists yet
    if (!userDoc.exists()) {
      secureLog.debug('First-time passcode setup for user');
      await setDoc(userDocRef, { passcodeHash: inputHash });
      return { verified: true, isFirstTime: true };
    }

    // Verify passcode against stored hash
    const storedHash = userDoc.data()?.passcodeHash;

    if (inputHash === storedHash) {
      secureLog.debug('Passcode verified successfully');
      return { verified: true, isFirstTime: false };
    } else {
      secureLog.error('Passcode verification failed - incorrect passcode');
      return { verified: false, isFirstTime: false };
    }
  } catch (error) {
    secureLog.error('Passcode verification error:', error);
    throw error;
  }
}

/**
 * Check if user has a passcode hash set up
 */
export async function hasPasscodeHash(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() && !!userDoc.data()?.passcodeHash;
  } catch (error) {
    secureLog.error('Error checking passcode hash:', error);
    return false;
  }
}
