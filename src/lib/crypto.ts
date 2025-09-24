// Using native Web Crypto API only for maximum compatibility

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  wrappedDEK: string;
  ivWrap: string;
  wrapSalt: string;
}

// Generate random bytes
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  return crypto.getRandomValues(array);
}

// Convert Uint8Array to base64
function arrayBufferToBase64(buffer: Uint8Array): string {
  const binary = String.fromCharCode.apply(null, Array.from(buffer));
  return btoa(binary);
}

// Convert base64 to Uint8Array
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive wrapping key using PBKDF2 with Web Crypto API
async function deriveWrappingKey(passcode: string, pepper: string, salt: Uint8Array): Promise<Uint8Array> {
  const combined = passcode + pepper;
  const combinedBytes = new TextEncoder().encode(combined);

  // Import the password as a key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    combinedBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the wrapping key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Export the key as raw bytes
  const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
  return new Uint8Array(exportedKey);
}

// Encrypt data with AES-GCM
async function encryptAESGCM(data: Uint8Array, key: Uint8Array): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = generateRandomBytes(12);
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, data as BufferSource);

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv
  };
}

// Decrypt data with AES-GCM
async function decryptAESGCM(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, ciphertext as BufferSource);

  return new Uint8Array(decrypted);
}

// Main encryption function
export async function encryptData(data: Record<string, unknown>, passcode: string, pepper: string): Promise<string> {
  try {
    // Generate random DEK (32 bytes)
    const dek = generateRandomBytes(32);

    // Convert data to JSON and then to bytes
    const jsonData = JSON.stringify(data);
    const dataBytes = new TextEncoder().encode(jsonData);

    // Encrypt data with DEK
    const { ciphertext, iv } = await encryptAESGCM(dataBytes, dek);

    // Generate salt for wrapping key derivation
    const wrapSalt = generateRandomBytes(32);

    // Derive wrapping key
    const wrappingKey = await deriveWrappingKey(passcode, pepper, wrapSalt);

    // Wrap DEK with wrapping key
    const { ciphertext: wrappedDEK, iv: ivWrap } = await encryptAESGCM(dek, wrappingKey);

    // Create final encrypted object
    const encryptedData: EncryptedData = {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      wrappedDEK: arrayBufferToBase64(wrappedDEK),
      ivWrap: arrayBufferToBase64(ivWrap),
      wrapSalt: arrayBufferToBase64(wrapSalt)
    };

    // Clear sensitive data from memory
    dek.fill(0);
    wrappingKey.fill(0);

    return btoa(JSON.stringify(encryptedData));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Main decryption function
export async function decryptData(encryptedBlob: string, passcode: string, pepper: string): Promise<Record<string, unknown>> {
  try {
    // Parse encrypted data
    const encryptedData: EncryptedData = JSON.parse(atob(encryptedBlob));

    // Convert base64 back to Uint8Array
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const wrappedDEK = base64ToArrayBuffer(encryptedData.wrappedDEK);
    const ivWrap = base64ToArrayBuffer(encryptedData.ivWrap);
    const wrapSalt = base64ToArrayBuffer(encryptedData.wrapSalt);

    // Derive wrapping key
    const wrappingKey = await deriveWrappingKey(passcode, pepper, wrapSalt);

    // Unwrap DEK
    const dek = await decryptAESGCM(wrappedDEK, wrappingKey, ivWrap);

    // Decrypt data
    const decryptedBytes = await decryptAESGCM(ciphertext, dek, iv);

    // Convert back to JSON
    const jsonString = new TextDecoder().decode(decryptedBytes);
    const data = JSON.parse(jsonString);

    // Clear sensitive data from memory
    dek.fill(0);
    wrappingKey.fill(0);

    return data;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Utility to securely clear clipboard after delay
export function secureClipboardCopy(text: string, clearAfterMs: number = 30000): void {
  navigator.clipboard.writeText(text).then(() => {
    setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {
        // Ignore clipboard clear errors
      });
    }, clearAfterMs);
  });
}

// Secure memory cleanup utilities
export function secureClearString(str: string): void {
  // Attempt to overwrite string in memory (limited effectiveness in JS)
  if (typeof str === 'string') {
    try {
      // Create new string with same length filled with zeros
      const cleared = '0'.repeat(str.length);
      // This doesn't actually clear the original string from memory in JS
      // but it's a best practice attempt
      str = cleared;
    } catch {
      // Ignore errors in memory clearing
    }
  }
}

export function secureClearArray(arr: Uint8Array): void {
  if (arr && arr.fill) {
    arr.fill(0);
  }
}

// Memory cleanup for sensitive objects
export function secureClearObject(obj: Record<string, unknown>): void {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = '';
      } else if (obj[key] instanceof Uint8Array) {
        obj[key].fill(0);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        secureClearObject(obj[key] as Record<string, unknown>);
      }
    });
  }
}