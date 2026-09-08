import authHandler from '../lib/api/google-auth.js';
import callbackHandler from '../lib/api/google-callback.js';
import tokenHandler from '../lib/api/google-token.js';
import driveHandler from '../lib/api/google-drive.js';
import gmailHandler from '../lib/api/gmail-status.js';
import sheetsHandler from '../lib/api/sheets-sync.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || 'google-auth');

  // Defensive compatibility: if Google was previously configured with the
  // legacy /api/google-auth URL as its redirect URI, Google returns the
  // authorization code to this endpoint as a GET request. Treat callback
  // parameters as an OAuth callback instead of passing the request to the
  // authenticated auth-start handler (which would return Unauthorized).
  if (route === 'google-callback') return callbackHandler(req, res);
  if (route === 'google-auth' && req.method === 'GET' &&
      (req.query?.code || req.query?.state || req.query?.error)) {
    return callbackHandler(req, res);
  }
  if (route === 'google-token') return tokenHandler(req, res);
  if (route === 'google-drive') return driveHandler(req, res);
  if (route === 'gmail-status') return gmailHandler(req, res);
  if (route === 'sheets-sync') return sheetsHandler(req, res);
  return authHandler(req, res);
}
