import crypto from 'node:crypto';
import { supabaseAdmin, json } from './_supabase.js';
import { appUrl, hasRequiredScopes, oauthSecret, redirectUri, timingSafeEqualText } from './google-config.js';

function enc(text) {
  const key = crypto.createHash('sha256').update(oauthSecret()).digest();
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const out = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return `${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${out.toString('base64url')}`;
}

function errorPage(message) {
  const jsSafe = JSON.stringify(String(message)).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const safe = String(message).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const origin = appUrl();
  return `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:40px;text-align:center"><h2>Google connection failed</h2><p>${safe}</p><p>You can close this window and return to WyForm.</p><script>(function(){const message=${jsSafe};if(window.opener&&!window.opener.closed){try{window.opener.postMessage({type:'wyform-google-error',message},${JSON.stringify(origin)});window.close();return;}catch(e){}}window.location.replace(${JSON.stringify(origin+'/integrations?error=')}+encodeURIComponent(message));})();</script></body>`;
}

function successPage(email) {
  const origin = appUrl();
  const safeEmail = String(email || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  return `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:40px;text-align:center"><h2>Google connected</h2><p>${safeEmail ? `Connected as ${safeEmail}.` : 'Google is connected.'}</p><p>You can close this window and return to WyForm.</p><script>(function(){if(window.opener&&!window.opener.closed){try{window.opener.postMessage({type:'wyform-google-connected'},${JSON.stringify(origin)});setTimeout(()=>window.close(),500);return;}catch(e){}}window.location.replace(${JSON.stringify(origin+'/integrations?google=connected')});})();</script></body>`;
}

function parseState(raw) {
  const packed = String(raw);
  const dot = packed.lastIndexOf('.');
  if (dot <= 0) throw new Error('Invalid OAuth state.');
  const payloadB64 = packed.slice(0, dot);
  const sig = packed.slice(dot + 1);
  const expected = crypto.createHmac('sha256', oauthSecret()).update(payloadB64).digest('base64url');
  if (!timingSafeEqualText(sig, expected)) throw new Error('Invalid OAuth state.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (payload.v !== 1 || !payload.uid || !payload.nonce) throw new Error('Invalid OAuth state.');
  if (!Number.isFinite(payload.exp) || Date.now() > payload.exp) throw new Error('OAuth state expired.');
  return payload;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed.');
    if (req.query?.error) {
      const description = String(req.query.error_description || req.query.error);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(errorPage(description));
    }

    const code = String(req.query?.code || '').trim();
    const rawState = String(req.query?.state || '').trim();
    if (!code || !rawState) return res.status(400).send(errorPage('Missing OAuth response.'));
    const state = parseState(rawState);

    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) throw new Error('Google OAuth credentials are not configured.');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) throw new Error(tokens.error_description || 'Google token exchange failed.');
    if (!hasRequiredScopes(tokens.scope)) throw new Error('Google did not grant all required WyForm permissions. Please reconnect and approve Gmail, Sheets, and Drive access.');

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json();
    if (!infoRes.ok || !info.email) throw new Error('Google account information could not be verified.');

    const db = supabaseAdmin();
    const { data: existing } = await db.from('integrations').select('refresh_token').eq('owner_id', state.uid).eq('provider', 'google').maybeSingle();
    const row = {
      owner_id: state.uid,
      provider: 'google',
      google_email: info.email,
      access_token: enc(tokens.access_token),
      refresh_token: tokens.refresh_token ? enc(tokens.refresh_token) : (existing?.refresh_token || null),
      scope: tokens.scope || '',
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from('integrations').upsert(row, { onConflict: 'owner_id,provider' });
    if (error) throw error;

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(successPage(info.email));
  } catch (e) {
    console.error('Google OAuth callback:', e);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(errorPage(e.message || 'Google connection failed.'));
  }
}
