// Import sandbox config for development
let sandboxConfig: any = {};
try {
  sandboxConfig = require('../../square-sandbox-config.js');
} catch (error) {
  // If sandbox config doesn't exist, use environment variables
}

export const squareConfig = {
  accessToken: process.env.SQUARE_ACCESS_TOKEN || sandboxConfig.SQUARE_ACCESS_TOKEN || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SQUARE_ACCESS_TOKEN environment variable is required in production');
    }
    return '';
  })(),
  locationId: process.env.SQUARE_LOCATION_ID || sandboxConfig.SQUARE_LOCATION_ID || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SQUARE_LOCATION_ID environment variable is required in production');
    }
    return '';
  })(),
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || sandboxConfig.SQUARE_WEBHOOK_SIGNATURE_KEY || '',
  applicationId: process.env.SQUARE_APPLICATION_ID || sandboxConfig.SQUARE_APPLICATION_ID || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SQUARE_APPLICATION_ID environment variable is required in production');
    }
    return '';
  })(),
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  currency: process.env.DEFAULT_CURRENCY || sandboxConfig.DEFAULT_CURRENCY || 'GBP',
  paymentTimeoutSeconds: parseInt(process.env.PAYMENT_TIMEOUT_SECONDS || sandboxConfig.PAYMENT_TIMEOUT_SECONDS || '300'),
};

export const validateSquareConfig = () => {
  const requiredFields = ['accessToken', 'locationId'];
  const missingFields = requiredFields.filter(field => !squareConfig[field as keyof typeof squareConfig]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required Square configuration: ${missingFields.join(', ')}`);
  }
  
  return true;
};
