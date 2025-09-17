'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { decryptData, secureClipboardCopy } from '@/lib/crypto';
import { CardData, EncryptedCard } from './CardManager';
import { OtherData, EncryptedOther } from './OtherManager';

interface DecryptedCard extends CardData {
  id: string;
  type: 'card';
}

interface DecryptedOther extends OtherData {
  id: string;
  type: 'other';
}

type DecryptedItem = DecryptedCard | DecryptedOther;

interface DecryptAllProps {
  onClose: () => void;
}

export default function DecryptAll({ onClose }: DecryptAllProps) {
  const { user, pepper } = useAuth();
  const [cards, setCards] = useState<EncryptedCard[]>([]);
  const [otherItems, setOtherItems] = useState<EncryptedOther[]>([]);
  const [decryptedItems, setDecryptedItems] = useState<DecryptedItem[]>([]);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState(false);

  useEffect(() => {
    if (!user) return;

    const cardsQuery = query(collection(db, 'cards'), where('userId', '==', user.uid));
    const otherQuery = query(collection(db, 'other'), where('userId', '==', user.uid));

    const unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EncryptedCard[];
      setCards(cardsData);
    });

    const unsubscribeOther = onSnapshot(otherQuery, (snapshot) => {
      const otherData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EncryptedOther[];
      setOtherItems(otherData);
    });

    return () => {
      unsubscribeCards();
      unsubscribeOther();
    };
  }, [user]);

  const decryptAllItems = async () => {
    if (!passcode.trim() || !pepper) {
      setError('Please enter your passcode');
      return;
    }

    setLoading(true);
    setError(null);
    const allDecrypted: DecryptedItem[] = [];

    try {
      // Decrypt all cards
      for (const card of cards) {
        try {
          const decryptedData = await decryptData(card.encryptedBlob, passcode, pepper);
          allDecrypted.push({
            ...decryptedData as CardData,
            id: card.id,
            type: 'card'
          });
        } catch (err) {
          console.error(`Failed to decrypt card ${card.cardName}:`, err);
        }
      }

      // Decrypt all other items
      for (const item of otherItems) {
        try {
          const decryptedData = await decryptData(item.encryptedBlob, passcode, pepper);
          allDecrypted.push({
            ...decryptedData as OtherData,
            id: item.id,
            type: 'other'
          });
        } catch (err) {
          console.error(`Failed to decrypt item ${item.itemName}:`, err);
        }
      }

      setDecryptedItems(allDecrypted);
      setDecrypted(true);
    } catch (error) {
      setError('Failed to decrypt items. Please check your passcode.');
      console.error('Decryption error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    secureClipboardCopy(text);
  };

  const exportAsText = () => {
    let exportText = '# Secure Vault Export\n\n';
    exportText += `Generated: ${new Date().toLocaleString()}\n\n`;

    const cardItems = decryptedItems.filter(item => item.type === 'card') as DecryptedCard[];
    const otherItemsList = decryptedItems.filter(item => item.type === 'other') as DecryptedOther[];

    if (cardItems.length > 0) {
      exportText += '## Credit Cards\n\n';
      cardItems.forEach((card, index) => {
        exportText += `### ${index + 1}. ${card.cardName}\n`;
        exportText += `- Card Number: ${card.cardNumber}\n`;
        exportText += `- Expiry: ${card.expiryMonth}/${card.expiryYear}\n`;
        exportText += `- CVV: ${card.cvv}\n`;
        exportText += `- Cardholder: ${card.holderName}\n`;
        if (card.backgroundImageUrl) {
          exportText += `- Background Image: ${card.backgroundImageUrl}\n`;
        }
        exportText += '\n';
      });
    }

    if (otherItemsList.length > 0) {
      exportText += '## Other Items\n\n';
      otherItemsList.forEach((item, index) => {
        exportText += `### ${index + 1}. ${item.itemName} (${item.itemType})\n`;
        Object.entries(item.fields).forEach(([key, value]) => {
          exportText += `- ${key}: ${value}\n`;
        });
        exportText += '\n';
      });
    }

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure-vault-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const maskSensitiveValue = (value: string, fieldName: string) => {
    const sensitiveFields = ['cardnumber', 'cvv', 'password', 'ssn', 'api key', 'secret key', 'pin'];
    const isSensitive = sensitiveFields.some(sensitive =>
      fieldName.toLowerCase().replace(/\s+/g, '').includes(sensitive.replace(/\s+/g, ''))
    );

    if (isSensitive) {
      if (value.length <= 4) return '•'.repeat(value.length);
      return `${value.slice(0, 4)}${'•'.repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`;
    }
    return value;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-medium text-gray-900">Decrypt All Information</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!decrypted ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Security Warning</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This will decrypt and display all your sensitive information. Only proceed if you're in a secure environment.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Found {cards.length} card(s) and {otherItems.length} other item(s) to decrypt.
                </p>

                <div className="max-w-md mx-auto">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter your encryption passcode"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && decryptAllItems()}
                    autoFocus
                  />
                  {error && (
                    <p className="text-red-600 text-sm mt-2">{error}</p>
                  )}
                </div>

                <button
                  onClick={decryptAllItems}
                  disabled={loading || !passcode.trim()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium rounded-md transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Decrypting...
                    </span>
                  ) : (
                    'Decrypt All Information'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Export Button */}
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">
                  Decrypted Information ({decryptedItems.length} items)
                </h4>
                <button
                  onClick={exportAsText}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as Text
                </button>
              </div>

              {/* Decrypted Items */}
              <div className="overflow-y-auto max-h-96 space-y-4">
                {decryptedItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="border border-gray-200 rounded-lg p-4">
                    {item.type === 'card' ? (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <svg className="mr-2 h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          {(item as DecryptedCard).cardName}
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Card Number:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">{maskSensitiveValue((item as DecryptedCard).cardNumber, 'cardnumber')}</span>
                              <button onClick={() => copyToClipboard((item as DecryptedCard).cardNumber.replace(/\s/g, ''))} className="text-gray-400 hover:text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Expiry:</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{(item as DecryptedCard).expiryMonth}/{(item as DecryptedCard).expiryYear}</span>
                              <button onClick={() => copyToClipboard(`${(item as DecryptedCard).expiryMonth}/${(item as DecryptedCard).expiryYear}`)} className="text-gray-400 hover:text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">CVV:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">{maskSensitiveValue((item as DecryptedCard).cvv, 'cvv')}</span>
                              <button onClick={() => copyToClipboard((item as DecryptedCard).cvv)} className="text-gray-400 hover:text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Cardholder:</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{(item as DecryptedCard).holderName}</span>
                              <button onClick={() => copyToClipboard((item as DecryptedCard).holderName)} className="text-gray-400 hover:text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <svg className="mr-2 h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {(item as DecryptedOther).itemName} ({(item as DecryptedOther).itemType})
                        </h5>
                        <div className="space-y-2">
                          {Object.entries((item as DecryptedOther).fields).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">{key}:</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-mono">{maskSensitiveValue(value, key)}</span>
                                <button onClick={() => copyToClipboard(value)} className="text-gray-400 hover:text-blue-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-500 text-center">
                ⚠️ All sensitive information is decrypted and visible. Copied values will be cleared from clipboard in 30 seconds.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}