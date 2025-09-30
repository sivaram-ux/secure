'use client';

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { encryptData, decryptData, secureClipboardCopy } from '@/lib/crypto';
import { showSecureAlert } from '@/lib/errorHandler';
import CardForm from './CardForm';

export interface CardData extends Record<string, unknown> {
  id?: string;
  cardName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  backgroundImageUrl?: string;
}

export interface EncryptedCard {
  id: string;
  cardName: string;
  encryptedBlob: string;
}

interface CardManagerProps {
  globalPasscode?: string;
  decryptAllMode?: boolean;
  searchQuery?: string;
  onSearchResults?: (count: number) => void;
}

export default function CardManager({ globalPasscode = '', decryptAllMode = false, searchQuery = '', onSearchResults }: CardManagerProps) {
  const { user, pepper } = useAuth();
  const [cards, setCards] = useState<EncryptedCard[]>([]);
  const [decryptedCards, setDecryptedCards] = useState<Map<string, CardData>>(new Map());
  const [individuallyViewedCards, setIndividuallyViewedCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<EncryptedCard | null>(null);
  const [editingCardData, setEditingCardData] = useState<CardData | null>(null);
  const [passcode, setPasscode] = useState('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(passcode: string) => void>(() => () => {});

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'cards'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EncryptedCard[];
      setCards(cardsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const decryptAllCards = React.useCallback(async () => {
    if (!globalPasscode || !pepper) return;

    const newDecryptedCards = new Map<string, CardData>();

    for (const card of cards) {
      try {
        const decryptedData = await decryptData(card.encryptedBlob, globalPasscode, pepper);
        newDecryptedCards.set(card.id, decryptedData as CardData);
      } catch (error) {
        console.error(`Failed to decrypt card ${card.cardName}:`, error);
      }
    }

    setDecryptedCards(newDecryptedCards);
  }, [globalPasscode, pepper, cards]);

  // Handle decrypt all mode
  useEffect(() => {
    if (decryptAllMode && globalPasscode && pepper) {
      decryptAllCards();
    } else if (!decryptAllMode) {
      setDecryptedCards(new Map());
      setIndividuallyViewedCards(new Set());
    }
  }, [decryptAllMode, globalPasscode, cards, pepper, decryptAllCards]);

  const requirePasscode = (action: (passcode: string) => void) => {
    console.log('requirePasscode called:', { decryptAllMode, hasGlobalPasscode: !!globalPasscode, hasPasscode: !!passcode });

    // If decrypt all is active, we already have the passcode
    if (decryptAllMode && globalPasscode) {
      console.log('Using global passcode for action');
      action(globalPasscode);
      return;
    }

    console.log('Showing passcode modal for action');
    setPendingAction(() => (userPasscode: string) => action(userPasscode));
    setShowPasscodeModal(true);
  };

  const executeWithPasscode = async () => {
    if (!passcode.trim()) return;
    console.log('executeWithPasscode called with passcode length:', passcode.length);
    setShowPasscodeModal(false);
    try {
      console.log('About to execute pending action with passcode...');
      await pendingAction(passcode);
      console.log('Pending action completed successfully');
      // Clear passcode after successful action, but only if not in decrypt all mode
      if (!decryptAllMode) {
        setPasscode('');
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Operation failed. Please check your passcode and try again.');
      // Only clear passcode on error if not in decrypt all mode
      if (!decryptAllMode) {
        setPasscode('');
      }
    }
  };

  const saveCard = async (cardData: CardData) => {
    const effectivePasscode = passcode || globalPasscode;
    if (!user || !pepper || !effectivePasscode) return;

    try {
      const encryptedBlob = await encryptData(cardData, effectivePasscode, pepper);

      if (editingCard) {
        await updateDoc(doc(db, 'cards', editingCard.id), {
          cardName: cardData.cardName,
          encryptedBlob,
        });
      } else {
        await addDoc(collection(db, 'cards'), {
          userId: user.uid,
          cardName: cardData.cardName,
          encryptedBlob,
        });
      }

      setShowForm(false);
      setEditingCard(null);
      setEditingCardData(null);
      setPasscode('');
    } catch (error) {
      showSecureAlert(error, 'CardManager.saveCard');
    }
  };

  const viewCard = async (card: EncryptedCard, userPasscode?: string) => {
    const effectivePasscode = userPasscode || passcode || globalPasscode;
    console.log('viewCard called for card:', card.cardName, 'passcode length:', effectivePasscode?.length || 0);

    if (!pepper || !effectivePasscode) {
      console.log('Missing requirements:', { hasPepper: !!pepper, hasPasscode: !!effectivePasscode });
      return;
    }

    try {
      console.log('Attempting to decrypt card data...');
      const decryptedData = await decryptData(card.encryptedBlob, effectivePasscode, pepper);
      console.log('Decryption successful, updating state...');

      // Add to decrypted cards map and individually viewed set
      setDecryptedCards(prev => new Map(prev.set(card.id, decryptedData as CardData)));
      setIndividuallyViewedCards(prev => new Set(prev.add(card.id)));

      console.log('State updated successfully');
    } catch (error) {
      console.error('viewCard error:', error);
      showSecureAlert(error, 'CardManager.viewCard');
    }
  };

  const hideCard = (cardId: string) => {
    setDecryptedCards(prev => {
      const newMap = new Map(prev);
      newMap.delete(cardId);
      return newMap;
    });
    setIndividuallyViewedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardId);
      return newSet;
    });
  };

  const editCard = async (card: EncryptedCard, userPasscode?: string) => {
    const effectivePasscode = userPasscode || passcode || globalPasscode;
    if (!pepper || !effectivePasscode) return;

    try {
      const decryptedData = await decryptData(card.encryptedBlob, effectivePasscode, pepper);
      setEditingCard(card);
      setEditingCardData(decryptedData as CardData);
      setShowForm(true);
      // Keep the effective passcode for saving
      if (effectivePasscode) {
        setPasscode(effectivePasscode);
      }
    } catch (error) {
      showSecureAlert(error, 'CardManager.editCard');
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await deleteDoc(doc(db, 'cards', cardId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    secureClipboardCopy(text);
  };

  // Filter cards based on search query
  const filteredCards = cards.filter((card) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search in card name (always available)
    if (card.cardName.toLowerCase().includes(query)) return true;

    // Search in decrypted data if available
    const decryptedCard = decryptedCards.get(card.id);
    if (decryptedCard) {
      return (
        decryptedCard.cardNumber.toLowerCase().includes(query) ||
        decryptedCard.holderName.toLowerCase().includes(query) ||
        `${decryptedCard.expiryMonth}/${decryptedCard.expiryYear}`.includes(query)
      );
    }

    return false;
  });

  // Notify parent about search results
  useEffect(() => {
    if (onSearchResults) {
      onSearchResults(filteredCards.length);
    }
  }, [filteredCards.length, onSearchResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Credit Cards</h2>
        <button
          onClick={() => requirePasscode((userPasscode) => { setPasscode(userPasscode); setShowForm(true); })}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Card
        </button>
      </div>

      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery.trim() ? 'No cards found' : 'No cards'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery.trim()
              ? `No cards match "${searchQuery}". Try a different search term.`
              : 'Get started by adding your first credit card.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => {
            const decryptedCard = decryptedCards.get(card.id);
            const isIndividuallyViewed = individuallyViewedCards.has(card.id);
            const showDecrypted = (decryptAllMode || isIndividuallyViewed) && decryptedCard;

            return (
              <div key={card.id} className={`bg-white overflow-hidden shadow rounded-lg ${showDecrypted ? 'border-2 border-blue-200' : ''}`}>
                {showDecrypted ? (
                  // Decrypted card view
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{card.cardName}</h3>

                    {/* Card Visual */}
                    <div
                      className="relative w-full h-32 rounded-lg mb-4 p-4 text-white shadow-lg text-sm"
                      style={{
                        background: decryptedCard.backgroundImageUrl
                          ? `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${decryptedCard.backgroundImageUrl})`
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="flex flex-col justify-between h-full">
                        <div className="text-right">
                          <div className="text-xs opacity-75">{card.cardName}</div>
                        </div>
                        <div>
                          <div className="font-mono text-sm tracking-wider mb-2">
                            {decryptedCard.cardNumber.replace(/(.{4})/g, '$1 ').trim()}
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-xs opacity-75">CARDHOLDER</div>
                              <div className="text-xs font-medium">{decryptedCard.holderName}</div>
                            </div>
                            <div>
                              <div className="text-xs opacity-75">EXPIRES</div>
                              <div className="text-xs font-medium">{decryptedCard.expiryMonth}/{decryptedCard.expiryYear}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-500">Card Number:</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs">{decryptedCard.cardNumber}</span>
                          <button onClick={() => copyToClipboard(decryptedCard.cardNumber.replace(/\s/g, ''))} className="text-gray-400 hover:text-blue-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-xs text-gray-500">CVV:</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs">{decryptedCard.cvv}</span>
                            <button onClick={() => copyToClipboard(decryptedCard.cvv)} className="text-gray-400 hover:text-blue-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-xs text-gray-500">Expiry:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs">{decryptedCard.expiryMonth}/{decryptedCard.expiryYear}</span>
                            <button onClick={() => copyToClipboard(`${decryptedCard.expiryMonth}/${decryptedCard.expiryYear}`)} className="text-gray-400 hover:text-blue-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {isIndividuallyViewed && !decryptAllMode && (
                        <button
                          onClick={() => hideCard(card.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => requirePasscode((userPasscode) => editCard(card, userPasscode))}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCard(card.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  // Encrypted card view
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{card.cardName}</h3>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => requirePasscode((userPasscode) => viewCard(card, userPasscode))}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => requirePasscode((userPasscode) => editCard(card, userPasscode))}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCard(card.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enter Passcode</h3>
            <form onSubmit={(e) => { e.preventDefault(); executeWithPasscode(); }}>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Your encryption passcode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscode('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Form Modal */}
      {showForm && (
        <CardForm
          editingCard={editingCard}
          editingCardData={editingCardData}
          onSave={(cardData) => {
            // Use existing passcode if available (from decrypt all or previous entry)
            if (passcode || globalPasscode) {
              saveCard(cardData);
            } else {
              setPendingAction(() => () => saveCard(cardData));
              setShowPasscodeModal(true);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingCard(null);
            setEditingCardData(null);
            setPasscode('');
          }}
        />
      )}

    </div>
  );
}