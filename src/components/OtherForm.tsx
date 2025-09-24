'use client';

import { useState, useEffect } from 'react';
import { OtherData, EncryptedOther } from './OtherManager';

interface OtherFormProps {
  editingItem: EncryptedOther | null;
  editingItemData: OtherData | null;
  onSave: (itemData: OtherData) => void;
  onCancel: () => void;
}

const COMMON_ITEM_TYPES = [
  { value: 'passport', label: 'Passport', fields: ['Passport Number', 'Issuing Country', 'Issue Date', 'Expiry Date', 'Place of Birth'] },
  { value: 'license', label: 'Driver\'s License', fields: ['License Number', 'State/Province', 'Issue Date', 'Expiry Date', 'Class'] },
  { value: 'ssn', label: 'Social Security', fields: ['SSN', 'Full Name', 'Date of Birth', 'Place of Birth'] },
  { value: 'bank', label: 'Bank Account', fields: ['Account Number', 'Routing Number', 'Bank Name', 'Account Type'] },
  { value: 'insurance', label: 'Insurance Policy', fields: ['Policy Number', 'Provider', 'Group Number', 'Effective Date', 'Expiry Date'] },
  { value: 'wifi', label: 'WiFi Password', fields: ['Network Name', 'Password', 'Security Type', 'Location'] },
  { value: 'server', label: 'Server/API Key', fields: ['Service Name', 'API Key', 'Secret Key', 'Endpoint URL'] },
  { value: 'custom', label: 'Custom', fields: [] },
];

export default function OtherForm({ editingItem, editingItemData, onSave, onCancel }: OtherFormProps) {
  const [formData, setFormData] = useState<OtherData>({
    itemName: '',
    itemType: '',
    fields: {},
  });
  const [selectedType, setSelectedType] = useState('');
  const [customFields, setCustomFields] = useState<string[]>(['']);

  useEffect(() => {
    if (editingItemData) {
      setFormData(editingItemData);
      setSelectedType(editingItemData.itemType);

      // Set up custom fields if it's a custom type
      if (editingItemData.itemType === 'custom') {
        setCustomFields(Object.keys(editingItemData.fields));
      }
    } else {
      // Reset form for new item
      setFormData({
        itemName: '',
        itemType: '',
        fields: {},
      });
      setSelectedType('');
      setCustomFields(['']);
    }
  }, [editingItemData]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setFormData({ ...formData, itemType: type, fields: {} });

    const typeConfig = COMMON_ITEM_TYPES.find(t => t.value === type);
    if (typeConfig && typeConfig.fields.length > 0) {
      const newFields: { [key: string]: string } = {};
      typeConfig.fields.forEach(field => {
        newFields[field] = '';
      });
      setFormData({ ...formData, itemType: type, fields: newFields });
    } else if (type === 'custom') {
      setCustomFields(['']);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, '']);
  };

  const removeCustomField = (index: number) => {
    if (customFields.length > 1) {
      const newFields = customFields.filter((_, i) => i !== index);
      setCustomFields(newFields);

      // Remove the field from formData
      const newFormFields = { ...formData.fields };
      delete newFormFields[customFields[index]];
      setFormData({ ...formData, fields: newFormFields });
    }
  };

  const updateCustomFieldName = (index: number, oldName: string, newName: string) => {
    const newFields = [...customFields];
    newFields[index] = newName;
    setCustomFields(newFields);

    // Update formData
    if (oldName && oldName !== newName) {
      const newFormFields = { ...formData.fields };
      if (oldName in newFormFields) {
        newFormFields[newName] = newFormFields[oldName];
        delete newFormFields[oldName];
      }
      setFormData({ ...formData, fields: newFormFields });
    }
  };

  const updateFieldValue = (fieldName: string, value: string) => {
    setFormData({
      ...formData,
      fields: {
        ...formData.fields,
        [fieldName]: value,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate custom fields
    if (selectedType === 'custom') {
      const validFields: { [key: string]: string } = {};
      customFields.forEach(fieldName => {
        if (fieldName.trim()) {
          validFields[fieldName.trim()] = formData.fields[fieldName] || '';
        }
      });
      setFormData({ ...formData, fields: validFields });
    }

    onSave(formData);
  };

  const getFieldsToRender = () => {
    if (selectedType === 'custom') {
      return customFields;
    }

    const typeConfig = COMMON_ITEM_TYPES.find(t => t.value === selectedType);
    return typeConfig ? typeConfig.fields : [];
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          {editingItem ? 'Edit Item' : 'Add New Item'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
              Item Name *
            </label>
            <input
              type="text"
              id="itemName"
              required
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., My Passport"
            />
          </div>

          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-gray-700">
              Item Type *
            </label>
            <select
              id="itemType"
              required
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a type</option>
              {COMMON_ITEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Item Details</h4>

              {getFieldsToRender().map((fieldName, index) => (
                <div key={index}>
                  {selectedType === 'custom' ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={fieldName}
                        onChange={(e) => updateCustomFieldName(index, fieldName, e.target.value)}
                        placeholder="Field name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={formData.fields[fieldName] || ''}
                        onChange={(e) => updateFieldValue(fieldName, e.target.value)}
                        placeholder="Field value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                        disabled={customFields.length === 1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {fieldName}
                      </label>
                      <input
                        type="text"
                        value={formData.fields[fieldName] || ''}
                        onChange={(e) => updateFieldValue(fieldName, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              {selectedType === 'custom' && (
                <button
                  type="button"
                  onClick={addCustomField}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Field
                </button>
              )}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={!selectedType}
            >
              {editingItem ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}