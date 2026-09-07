import billingHandler from '../lib/api/billing.js';
import statusHandler from '../lib/api/billing-status.js';
import flutterwaveHandler from '../lib/api/flutterwave-v4.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || 'billing');
  if (route === 'billing-status') return statusHandler(req, res);
  if (route === 'flutterwave-v4') return flutterwaveHandler(req, res);
  return billingHandler(req, res);
}
