'use client';

import { OtherData } from './OtherManager';

interface OtherViewProps {
  item: OtherData;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export default function OtherView({ item, onClose, onCopy }: OtherViewProps) {
  const copyField = (value: string) => {
    onCopy(value);
    // You could add a toast notification here
  };

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

  const getTypeLabel = (itemType: string) => {
    const typeMap: { [key: string]: string } = {
      passport: 'Passport',
      license: 'Driver\'s License',
      ssn: 'Social Security',
      bank: 'Bank Account',
      insurance: 'Insurance Policy',
      wifi: 'WiFi Password',
      server: 'Server/API Key',
      custom: 'Custom',
    };
    return typeMap[itemType] || 'Other';
  };

  const isSensitiveField = (fieldName: string) => {
    const sensitiveFields = ['password', 'ssn', 'api key', 'secret key', 'cvv', 'pin'];
    return sensitiveFields.some(sensitive =>
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  };

  const maskSensitiveValue = (value: string, fieldName: string) => {
    if (isSensitiveField(fieldName)) {
      return '•'.repeat(Math.min(value.length, 12));
    }
    return value;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            {getItemIcon(item.itemType)}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{item.itemName}</h3>
              <p className="text-sm text-gray-500">{getTypeLabel(item.itemType)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Item Details */}
        <div className="space-y-4">
          {Object.entries(item.fields).map(([fieldName, value]) => (
            <div key={fieldName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">{fieldName}</div>
                <div className="text-sm font-medium break-all">
                  {maskSensitiveValue(value, fieldName)}
                </div>
              </div>
              <button
                onClick={() => copyField(value)}
                className="ml-3 p-2 text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
                title={`Copy ${fieldName}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {Object.keys(item.fields).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No details available for this item.</p>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          Copied values will be automatically cleared from clipboard in 30 seconds
        </div>
      </div>
    </div>
  );
}