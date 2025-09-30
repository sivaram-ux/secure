'use client';

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { encryptData, decryptData, secureClipboardCopy } from '@/lib/crypto';
import { secureLog } from '@/lib/logger';
import OtherForm from './OtherForm';

export interface OtherData extends Record<string, unknown> {
  id?: string;
  itemName: string;
  itemType: string;
  fields: { [key: string]: string };
}

export interface EncryptedOther {
  id: string;
  itemName: string;
  encryptedBlob: string;
}

interface OtherManagerProps {
  globalPasscode?: string;
  decryptAllMode?: boolean;
  searchQuery?: string;
  onSearchResults?: (count: number) => void;
}

export default function OtherManager({ globalPasscode = '', decryptAllMode = false, searchQuery = '', onSearchResults }: OtherManagerProps) {
  const { user, pepper } = useAuth();
  const [items, setItems] = useState<EncryptedOther[]>([]);
  const [decryptedItems, setDecryptedItems] = useState<Map<string, OtherData>>(new Map());
  const [individuallyViewedItems, setIndividuallyViewedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<EncryptedOther | null>(null);
  const [editingItemData, setEditingItemData] = useState<OtherData | null>(null);
  const [passcode, setPasscode] = useState('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'other'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EncryptedOther[];
      setItems(itemsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const decryptAllOtherItems = React.useCallback(async () => {
    if (!globalPasscode || !pepper) return;

    const newDecryptedItems = new Map<string, OtherData>();

    for (const item of items) {
      try {
        const decryptedData = await decryptData(item.encryptedBlob, globalPasscode, pepper);
        newDecryptedItems.set(item.id, decryptedData as OtherData);
      } catch (error) {
        secureLog.error(`Failed to decrypt item ${item.itemName}:`, error);
      }
    }

    setDecryptedItems(newDecryptedItems);
  }, [globalPasscode, pepper, items]);

  // Handle decrypt all mode
  useEffect(() => {
    if (decryptAllMode && globalPasscode && pepper) {
      decryptAllOtherItems();
    } else if (!decryptAllMode) {
      setDecryptedItems(new Map());
      setIndividuallyViewedItems(new Set());
    }
  }, [decryptAllMode, globalPasscode, items, pepper, decryptAllOtherItems]);

  const requirePasscode = (action: () => void) => {
    // If decrypt all is active, we already have the passcode
    if (decryptAllMode && globalPasscode) {
      setPasscode(globalPasscode);
      action();
      return;
    }

    setPendingAction(() => action);
    setShowPasscodeModal(true);
  };

  const executeWithPasscode = async () => {
    if (!passcode.trim()) return;
    setShowPasscodeModal(false);
    try {
      await pendingAction();
    } catch (error) {
      secureLog.error('Action failed:', error);
      alert('Operation failed. Please check your passcode and try again.');
      // Only clear passcode on error if not in decrypt all mode
      if (!decryptAllMode) {
        setPasscode('');
      }
    }
    // Don't clear passcode here if in decrypt all mode - keep it for reuse
    if (!decryptAllMode) {
      setPasscode('');
    }
  };

  const saveItem = async (itemData: OtherData) => {
    const effectivePasscode = passcode || globalPasscode;
    if (!user || !pepper || !effectivePasscode) return;

    try {
      const encryptedBlob = await encryptData(itemData, effectivePasscode, pepper);

      if (editingItem) {
        await updateDoc(doc(db, 'other', editingItem.id), {
          itemName: itemData.itemName,
          encryptedBlob,
        });
      } else {
        await addDoc(collection(db, 'other'), {
          userId: user.uid,
          itemName: itemData.itemName,
          encryptedBlob,
        });
      }

      setShowForm(false);
      setEditingItem(null);
      setEditingItemData(null);
      setPasscode('');
    } catch (error) {
      secureLog.error('Save error:', error);
      alert('Failed to save item. Please try again.');
    }
  };

  const viewItem = async (item: EncryptedOther) => {
    const effectivePasscode = passcode || globalPasscode;
    if (!pepper || !effectivePasscode) return;

    try {
      const decryptedData = await decryptData(item.encryptedBlob, effectivePasscode, pepper);

      // Add to decrypted items map and individually viewed set
      setDecryptedItems(prev => new Map(prev.set(item.id, decryptedData as OtherData)));
      setIndividuallyViewedItems(prev => new Set(prev.add(item.id)));

      // Only clear passcode if not in decrypt all mode
      if (!decryptAllMode) {
        setPasscode('');
      }
    } catch (error) {
      secureLog.error('Decrypt error:', error);
      alert('Failed to decrypt item. Please check your passcode.');
    }
  };

  const hideItem = (itemId: string) => {
    setDecryptedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
    setIndividuallyViewedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const editItem = async (item: EncryptedOther) => {
    const effectivePasscode = passcode || globalPasscode;
    if (!pepper || !effectivePasscode) return;

    try {
      const decryptedData = await decryptData(item.encryptedBlob, effectivePasscode, pepper);
      setEditingItem(item);
      setEditingItemData(decryptedData as OtherData);
      setShowForm(true);
      // Keep the effective passcode for saving
      if (!passcode && globalPasscode) {
        setPasscode(globalPasscode);
      }
    } catch (error) {
      secureLog.error('Decrypt error:', error);
      alert('Failed to decrypt item. Please check your passcode.');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteDoc(doc(db, 'other', itemId));
    } catch (error) {
      secureLog.error('Delete error:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    secureClipboardCopy(text);
  };

  // Filter items based on search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search in item name (always available)
    if (item.itemName.toLowerCase().includes(query)) return true;

    // Search in decrypted data if available
    const decryptedItem = decryptedItems.get(item.id);
    if (decryptedItem) {
      // Search in item type
      if (decryptedItem.itemType.toLowerCase().includes(query)) return true;

      // Search in field values
      return Object.values(decryptedItem.fields).some(value =>
        value.toLowerCase().includes(query)
      );
    }

    return false;
  });

  // Notify parent about search results
  useEffect(() => {
    if (onSearchResults) {
      onSearchResults(filteredItems.length);
    }
  }, [filteredItems.length, onSearchResults]);

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
        <h2 className="text-2xl font-bold text-gray-900">Other Items</h2>
        <button
          onClick={() => requirePasscode(() => setShowForm(true))}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {filteredItems.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery.trim() ? 'No items found' : 'No items'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery.trim()
              ? `No items match "${searchQuery}". Try a different search term.`
              : 'Get started by adding your first secure item.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const decryptedItem = decryptedItems.get(item.id);
            const isIndividuallyViewed = individuallyViewedItems.has(item.id);
            const showDecrypted = (decryptAllMode || isIndividuallyViewed) && decryptedItem;

            const getItemIcon = (itemType: string) => {
              switch (itemType) {
                case 'passport':
                  return (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  );
                case 'license':
                  return (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  );
                case 'bank':
                  return (
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                case 'wifi':
                  return (
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  );
                case 'server':
                  return (
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  );
                default:
                  return (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  );
              }
            };

            const isSensitiveField = (fieldName: string) => {
              const sensitiveFields = ['password', 'ssn', 'api key', 'secret key', 'cvv', 'pin'];
              return sensitiveFields.some(sensitive =>
                fieldName.toLowerCase().includes(sensitive.toLowerCase())
              );
            };

            const maskSensitiveValue = (value: string, fieldName: string) => {
              if (isSensitiveField(fieldName)) {
                if (value.length <= 4) return '•'.repeat(value.length);
                return `${value.slice(0, 2)}${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`;
              }
              return value;
            };

            return (
              <div key={item.id} className={`bg-white overflow-hidden shadow rounded-lg ${showDecrypted ? 'border-2 border-blue-200' : ''}`}>
                {showDecrypted ? (
                  // Decrypted item view
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      {getItemIcon(decryptedItem.itemType)}
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">{item.itemName}</h3>
                        <p className="text-sm text-gray-500">{decryptedItem.itemType}</p>
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="space-y-2 mb-4">
                      {Object.entries(decryptedItem.fields).map(([fieldName, value]) => (
                        <div key={fieldName} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-xs text-gray-500 font-medium">{fieldName}:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono">{maskSensitiveValue(value, fieldName)}</span>
                            <button onClick={() => copyToClipboard(value)} className="text-gray-400 hover:text-blue-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-2">
                      {isIndividuallyViewed && !decryptAllMode && (
                        <button
                          onClick={() => hideItem(item.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => requirePasscode(() => editItem(item))}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  // Encrypted item view
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{item.itemName}</h3>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => requirePasscode(() => viewItem(item))}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => requirePasscode(() => editItem(item))}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
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

      {/* Item Form Modal */}
      {showForm && (
        <OtherForm
          editingItem={editingItem}
          editingItemData={editingItemData}
          onSave={(itemData) => {
            // Use existing passcode if available (from decrypt all or previous entry)
            if (passcode || globalPasscode) {
              saveItem(itemData);
            } else {
              setPendingAction(() => () => saveItem(itemData));
              setShowPasscodeModal(true);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
            setEditingItemData(null);
            setPasscode('');
          }}
        />
      )}

    </div>
  );
}