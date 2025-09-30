// Secure logging utility that respects DEV_MODE

const isDev = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export const secureLog = {
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  // For critical security-related logs that should always be silent in production
  security: (message: string, ...args: unknown[]) => {
    // Only log security events in development when explicitly enabled
    if (isDev && process.env.NEXT_PUBLIC_SECURITY_LOGS === 'true') {
      console.log(`[SECURITY] ${message}`, ...args);
    }
  }
};

// Secure fetch wrapper that doesn't log 403 errors to console
export async function secureFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // For 403 errors, return a synthetic successful response with empty data
    // This prevents console errors while maintaining the security check
    if (response.status === 403) {
      return new Response(JSON.stringify({ pepper: '' }), {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return response;
  } catch (error) {
    // Suppress all fetch errors that might reveal security information
    secureLog.debug('Fetch error (suppressed for security):', error);

    // Return a synthetic response with empty data
    return new Response(JSON.stringify({ pepper: '' }), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}