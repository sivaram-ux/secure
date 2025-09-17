'use client';

import { CardData } from './CardManager';

interface CardViewProps {
  card: CardData;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export default function CardView({ card, onClose, onCopy }: CardViewProps) {
  const maskCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.length < 4) return number;
    return `${'•'.repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
  };

  const copyField = (value: string) => {
    onCopy(value);
    // You could add a toast notification here
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">{card.cardName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card Visual */}
        <div
          className="relative w-full h-48 rounded-lg mb-6 p-6 text-white shadow-lg"
          style={{
            background: card.backgroundImageUrl
              ? `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${card.backgroundImageUrl})`
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
              <div className="font-mono text-lg tracking-widest mb-4">
                {card.cardNumber.replace(/(.{4})/g, '$1 ').trim()}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs opacity-75">CARDHOLDER</div>
                  <div className="text-sm font-medium">{card.holderName}</div>
                </div>
                <div>
                  <div className="text-xs opacity-75">EXPIRES</div>
                  <div className="text-sm font-medium">{card.expiryMonth}/{card.expiryYear}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Card Number</div>
              <div className="font-mono text-sm">{maskCardNumber(card.cardNumber)}</div>
            </div>
            <button
              onClick={() => copyField(card.cardNumber.replace(/\s/g, ''))}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title="Copy card number"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Expiry</div>
                <div className="text-sm">{card.expiryMonth}/{card.expiryYear}</div>
              </div>
              <button
                onClick={() => copyField(`${card.expiryMonth}/${card.expiryYear}`)}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                title="Copy expiry date"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">CVV</div>
                <div className="font-mono text-sm">{'•'.repeat(card.cvv.length)}</div>
              </div>
              <button
                onClick={() => copyField(card.cvv)}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                title="Copy CVV"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Cardholder Name</div>
              <div className="text-sm">{card.holderName}</div>
            </div>
            <button
              onClick={() => copyField(card.holderName)}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title="Copy cardholder name"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          Copied values will be automatically cleared from clipboard in 30 seconds
        </div>
      </div>
    </div>
  );
}