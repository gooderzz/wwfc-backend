// Square Sandbox Configuration
// This file contains the Square sandbox credentials for testing
// In production, these should be stored as environment variables

const squareSandboxConfig = {
  // Your Square Sandbox Access Token
  SQUARE_ACCESS_TOKEN: 'EAAAl31sC-Fej0iJaq0CipGKUOPHZRizVM1gmfNp8nnigH2yN1sRWv1G2Xxq9iLV',
  
  // Your Square Sandbox Location ID
  SQUARE_LOCATION_ID: 'LJSHEXPWNQHXW',
  
  // Your Square Sandbox Application ID
  SQUARE_APPLICATION_ID: 'sandbox-sq0idb-7i9_YG4z9XFQd8puog6-6w',
  
  // Webhook Signature Key (optional - can be added later)
  SQUARE_WEBHOOK_SIGNATURE_KEY: '',
  
  // Payment Configuration
  DEFAULT_CURRENCY: 'GBP',
  PAYMENT_TIMEOUT_SECONDS: 300,
  
  // Environment
  NODE_ENV: 'development'
};

// Export for use in the application
module.exports = squareSandboxConfig;
