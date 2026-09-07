import authHandler from '../lib/api/google-auth.js';
import callbackHandler from '../lib/api/google-callback.js';
import tokenHandler from '../lib/api/google-token.js';
import driveHandler from '../lib/api/google-drive.js';
import gmailHandler from '../lib/api/gmail-status.js';
import sheetsHandler from '../lib/api/sheets-sync.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || 'google-auth');
  if (route === 'google-callback') return callbackHandler(req, res);
  if (route === 'google-token') return tokenHandler(req, res);
  if (route === 'google-drive') return driveHandler(req, res);
  if (route === 'gmail-status') return gmailHandler(req, res);
  if (route === 'sheets-sync') return sheetsHandler(req, res);
  return authHandler(req, res);
}
