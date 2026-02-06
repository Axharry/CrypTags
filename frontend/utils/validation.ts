// Crypto address validation patterns
export const CRYPTO_PATTERNS: Record<string, RegExp> = {
  BTC: /^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  USDT: /^0x[a-fA-F0-9]{40}$/,
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  BNB: /^0x[a-fA-F0-9]{40}$/,
  MATIC: /^0x[a-fA-F0-9]{40}$/,
  AVAX: /^0x[a-fA-F0-9]{40}$/,
  ARB: /^0x[a-fA-F0-9]{40}$/,
  OP: /^0x[a-fA-F0-9]{40}$/,
  TRX: /^T[a-zA-HJ-NP-Z0-9]{33}$/,
};

export const validateCryptoAddress = (address: string, cryptoType: string): boolean => {
  const pattern = CRYPTO_PATTERNS[cryptoType.toUpperCase()];
  if (!pattern) {
    // Unknown crypto type, accept any address
    return address.length > 0;
  }
  return pattern.test(address);
};

export const validateEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
};
