import crypto from 'node:crypto';
import { getUser, json, method } from './_supabase.js';
import { GOOGLE_SCOPES, oauthSecret, redirectUri } from './google-config.js';

function buildState(uid) {
  const payload = JSON.stringify({
    v: 1,
    uid,
    nonce: crypto.randomBytes(24).toString('base64url'),
    iat: Date.now(),
    exp: Date.now() + 10 * 60 * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', oauthSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const user = await getUser(req);
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured.');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GOOGLE_SCOPES.join(' '),
      state: buildState(user.uid),
    });

    return json(res, 200, {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Could not start Google connection.' });
  }
}
