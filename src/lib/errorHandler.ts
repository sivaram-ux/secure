// Secure error handling utilities

interface ErrorDetails {
  userMessage: string;
  logDetails?: unknown;
  code?: string;
}

// Safe error messages for users (don't reveal system information)
const SAFE_ERROR_MESSAGES = {
  ENCRYPTION_FAILED: 'Failed to encrypt data. Please try again.',
  DECRYPTION_FAILED: 'Invalid passcode or corrupted data.',
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  PERMISSION_ERROR: 'Access denied. Please contact support.',
  RATE_LIMIT: 'Too many requests. Please wait and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export function handleSecureError(error: unknown, context: string): ErrorDetails {
  // Log detailed error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}] Error:`, error);
  } else {
    // In production, log only sanitized information
    console.error(`[${context}] Error occurred`);
  }

  // Determine safe user message based on error type
  let userMessage = SAFE_ERROR_MESSAGES.UNKNOWN_ERROR;
  let code = 'UNKNOWN';

  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    userMessage = SAFE_ERROR_MESSAGES.NETWORK_ERROR;
    code = 'NETWORK';
  } else if (error?.message?.includes('encrypt')) {
    userMessage = SAFE_ERROR_MESSAGES.ENCRYPTION_FAILED;
    code = 'ENCRYPTION';
  } else if (error?.message?.includes('decrypt')) {
    userMessage = SAFE_ERROR_MESSAGES.DECRYPTION_FAILED;
    code = 'DECRYPTION';
  } else if (error?.code === 'auth/') {
    userMessage = SAFE_ERROR_MESSAGES.AUTH_ERROR;
    code = 'AUTH';
  } else if (error?.status === 403) {
    userMessage = SAFE_ERROR_MESSAGES.PERMISSION_ERROR;
    code = 'PERMISSION';
  } else if (error?.status === 429) {
    userMessage = SAFE_ERROR_MESSAGES.RATE_LIMIT;
    code = 'RATE_LIMIT';
  }

  return {
    userMessage,
    logDetails: process.env.NODE_ENV === 'development' ? error : null,
    code,
  };
}

export function showSecureAlert(error: unknown, context: string): void {
  const { userMessage } = handleSecureError(error, context);
  alert(userMessage);
}

// Rate limiting for error notifications (prevent spam)
const errorNotificationLimiter = new Map<string, number>();
const ERROR_NOTIFICATION_COOLDOWN = 5000; // 5 seconds

export function showSecureAlertWithLimit(error: unknown, context: string): void {
  const now = Date.now();
  const lastShown = errorNotificationLimiter.get(context) || 0;

  if (now - lastShown > ERROR_NOTIFICATION_COOLDOWN) {
    showSecureAlert(error, context);
    errorNotificationLimiter.set(context, now);
  }
}