import paystackHandler from '../lib/api/paystack-webhook.js';
import flutterwaveHandler from '../lib/api/flutterwave-webhook.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const route = String(req.query?.route || 'paystack-webhook');
  if (route === 'flutterwave-webhook') return flutterwaveHandler(req, res);
  return paystackHandler(req, res);
}
