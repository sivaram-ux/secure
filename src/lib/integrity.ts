// Basic integrity checking utilities

// Simple checksum for data integrity verification
export function generateChecksum(data: string): string {
  let hash = 0;
  if (data.length === 0) return '0';
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Verify data hasn't been tampered with
export function verifyChecksum(data: string, expectedChecksum: string): boolean {
  const actualChecksum = generateChecksum(data);
  return actualChecksum === expectedChecksum;
}

// Enhanced encrypted data structure with integrity check
export interface IntegrityProtectedData {
  data: string;
  checksum: string;
  timestamp: number;
}

export function wrapWithIntegrity(data: string): IntegrityProtectedData {
  return {
    data,
    checksum: generateChecksum(data),
    timestamp: Date.now(),
  };
}

export function unwrapWithIntegrity(wrapped: IntegrityProtectedData): string | null {
  if (!verifyChecksum(wrapped.data, wrapped.checksum)) {
    console.warn('Data integrity check failed');
    return null;
  }

  // Check if data is too old (optional protection against replay attacks)
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - wrapped.timestamp > MAX_AGE) {
    console.warn('Data is too old');
    return null;
  }

  return wrapped.data;
}

// Validate client-side environment configuration
export function validateClientEnvironmentSecurity(): boolean {
  // Only run validation in browser environment
  if (typeof window === 'undefined') {
    return true; // Skip validation during SSR/build
  }

  const requiredClientVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  ];

  // Check if environment variables are accessible through Next.js runtime config
  const missing = requiredClientVars.filter(varName => {
    const value = process.env[varName];
    return !value || value === '';
  });

  if (missing.length > 0) {
    // Only warn in development, not error
    if (process.env.NODE_ENV === 'development') {
      console.warn('Some client environment variables may not be configured:', missing);
      console.warn('If the app is working, this warning can be ignored.');
    }
    return false;
  }

  return true;
}

// Validate server-side environment configuration (for API routes)
export function validateServerEnvironmentSecurity(): boolean {
  const requiredServerVars = [
    'PEPPER',
    'ALLOWED_EMAILS',
  ];

  const missing = requiredServerVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('Missing required server environment variables:', missing);
    return false;
  }

  // Validate pepper strength
  const pepper = process.env.PEPPER;
  if (pepper && pepper.length < 32) {
    console.error('Pepper is too short (minimum 32 characters)');
    return false;
  }

  return true;
}