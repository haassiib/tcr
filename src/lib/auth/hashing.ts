// lib/auth/hashing.ts
/**
 * Secure password hashing and verification using Web Crypto API (PBKDF2)
 * 
 * Format: pbkdf2_sha256$iterations$salt$hash
 * Example: pbkdf2_sha256$100000$abcd1234...$efgh5678...
 */

/**
 * Generate a cryptographically secure random salt (16 bytes = 128 bits)
 */
async function generateSalt(): Promise<string> {
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);
  return Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password using PBKDF2 with SHA-256
 * @param password - Plain text password (min 1 char)
 * @returns Hashed password string in Django-compatible format
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  const salt = await generateSalt();
  const iterations = 100000; // NIST recommended minimum for 2024
  const keyLength = 32; // 256 bits

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  // Import password as a crypto key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    keyLength * 8 // bits
  );

  // Convert to hex
  const hashArray = new Uint8Array(derivedBits);
  const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

  return `pbkdf2_sha256$${iterations}$${salt}$${hashHex}`;
}

/**
 * Verify a plain text password against a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Stored hash (must be in pbkdf2_sha256$... format)
 * @returns true if password matches
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!hashedPassword.startsWith('pbkdf2_sha256$')) {
    throw new Error('Invalid hash format: expected pbkdf2_sha256$...');
  }

  const parts = hashedPassword.split('$');
  if (parts.length !== 4) {
    throw new Error('Invalid hash format: expected 4 parts');
  }

  const [, iterationsStr, salt, expectedHashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);

  if (isNaN(iterations) || iterations <= 0) {
    throw new Error('Invalid iterations in hash');
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expectedHashHex.length * 4 // hex chars → bits (each char = 4 bits)
  );

  const hashArray = new Uint8Array(derivedBits);
  const actualHashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison to prevent timing attacks
  if (actualHashHex.length !== expectedHashHex.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < actualHashHex.length; i++) {
    diff |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}