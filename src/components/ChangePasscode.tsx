'use client';

import { useState } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { encryptData, decryptData, hashPasscode } from '@/lib/crypto';
import { verifyPasscode } from '@/lib/passcodeVerification';
import { secureLog } from '@/lib/logger';

interface ChangePasscodeProps {
  onClose: () => void;
}

export default function ChangePasscode({ onClose }: ChangePasscodeProps) {
  const { user, pepper } = useAuth();
  const [oldPasscode, setOldPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [progress, setProgress] = useState('');

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !pepper) {
      alert('User not authenticated. Please refresh and try again.');
      return;
    }

    if (!oldPasscode.trim() || !newPasscode.trim() || !confirmPasscode.trim()) {
      alert('All fields are required.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      alert('New passcode and confirmation do not match.');
      return;
    }

    if (oldPasscode === newPasscode) {
      alert('New passcode must be different from old passcode.');
      return;
    }

    if (newPasscode.length < 6) {
      alert('New passcode must be at least 6 characters long.');
      return;
    }

    const confirmed = confirm(
      '⚠️ IMPORTANT: Changing your passcode will re-encrypt ALL your data.\n\n' +
      'This process cannot be undone. Make sure:\n' +
      '1. Your old passcode is correct\n' +
      '2. You remember your new passcode\n' +
      '3. You have a stable internet connection\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    setIsChanging(true);
    setProgress('Verifying old passcode...');

    try {
      // Step 1: Verify old passcode
      secureLog.debug('Verifying old passcode...');
      const { verified } = await verifyPasscode(user.uid, oldPasscode, pepper);

      if (!verified) {
        alert('❌ Old passcode is incorrect. Please try again.');
        setIsChanging(false);
        setProgress('');
        return;
      }

      // Step 2: Fetch all cards
      setProgress('Fetching all cards...');
      secureLog.debug('Fetching all cards...');
      const cardsQuery = query(collection(db, 'cards'), where('userId', '==', user.uid));
      const cardsSnapshot = await getDocs(cardsQuery);
      const cards = cardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          encryptedBlob: data.encryptedBlob as string,
          cardName: data.cardName as string
        };
      });

      // Step 3: Fetch all other items
      setProgress('Fetching all items...');
      secureLog.debug('Fetching all items...');
      const itemsQuery = query(collection(db, 'other'), where('userId', '==', user.uid));
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          encryptedBlob: data.encryptedBlob as string,
          itemName: data.itemName as string
        };
      });

      const totalItems = cards.length + items.length;
      let processedItems = 0;

      // Step 4: Re-encrypt all cards
      secureLog.debug(`Re-encrypting ${cards.length} cards...`);
      for (const card of cards) {
        processedItems++;
        setProgress(`Re-encrypting cards... (${processedItems}/${totalItems})`);

        // Decrypt with old passcode
        const decryptedData = await decryptData(card.encryptedBlob, oldPasscode, pepper);

        // Encrypt with new passcode
        const newEncryptedBlob = await encryptData(decryptedData, newPasscode, pepper);

        // Update in Firestore
        await updateDoc(doc(db, 'cards', card.id), {
          encryptedBlob: newEncryptedBlob,
        });
      }

      // Step 5: Re-encrypt all other items
      secureLog.debug(`Re-encrypting ${items.length} items...`);
      for (const item of items) {
        processedItems++;
        setProgress(`Re-encrypting items... (${processedItems}/${totalItems})`);

        // Decrypt with old passcode
        const decryptedData = await decryptData(item.encryptedBlob, oldPasscode, pepper);

        // Encrypt with new passcode
        const newEncryptedBlob = await encryptData(decryptedData, newPasscode, pepper);

        // Update in Firestore
        await updateDoc(doc(db, 'other', item.id), {
          encryptedBlob: newEncryptedBlob,
        });
      }

      // Step 6: Update passcode hash
      setProgress('Updating passcode hash...');
      secureLog.debug('Updating passcode hash...');
      const newPasscodeHash = await hashPasscode(newPasscode, pepper);
      await setDoc(doc(db, 'users', user.uid), {
        passcodeHash: newPasscodeHash,
      });

      secureLog.debug('Passcode change completed successfully');
      alert(`✅ Passcode changed successfully!\n\nRe-encrypted ${totalItems} items.\n\nYour new passcode is now active.`);
      onClose();
    } catch (error) {
      secureLog.error('Passcode change error:', error);
      alert('❌ Failed to change passcode. Please try again.\n\nIf the problem persists, contact support.');
    } finally {
      setIsChanging(false);
      setProgress('');
      setOldPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Change Passcode</h3>
          {!isChanging && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600 rounded-md">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Warning:</strong> This will re-encrypt ALL your data with the new passcode. Make sure you remember it!
          </p>
        </div>

        {isChanging ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{progress}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Please do not close this window...</p>
          </div>
        ) : (
          <form onSubmit={handleChangePasscode}>
            <div className="space-y-4">
              <div>
                <label htmlFor="oldPasscode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Old Passcode *
                </label>
                <input
                  type="password"
                  id="oldPasscode"
                  required
                  value={oldPasscode}
                  onChange={(e) => setOldPasscode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your current passcode"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="newPasscode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Passcode *
                </label>
                <input
                  type="password"
                  id="newPasscode"
                  required
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your new passcode (min 6 characters)"
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPasscode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Passcode *
                </label>
                <input
                  type="password"
                  id="confirmPasscode"
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Re-enter your new passcode"
                  minLength={6}
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Change Passcode
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
