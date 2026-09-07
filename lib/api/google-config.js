import crypto from 'node:crypto';

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function appUrl() {
  const raw = required('APP_URL').replace(/\/+$/, '');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('APP_URL must use HTTPS in production.');
  return url.origin;
}

export function redirectUri() {
  const configured = String(process.env.GOOGLE_REDIRECT_URI || '').trim();
  const fallback = `${appUrl()}/api/google-callback`;
  const value = configured || fallback;
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('GOOGLE_REDIRECT_URI must use HTTPS in production.');
  if (url.origin !== appUrl()) throw new Error('GOOGLE_REDIRECT_URI must use the same origin as APP_URL.');
  return url.toString().replace(/\/$/, '');
}

export function oauthSecret() {
  const value = required('OAUTH_ENCRYPTION_KEY');
  if (value.length < 32) throw new Error('OAUTH_ENCRYPTION_KEY must be at least 32 characters.');
  return value;
}

export function timingSafeEqualText(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export const GOOGLE_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
]);

export function scopeSet(value) {
  return new Set(String(value || '').split(/\s+/).filter(Boolean));
}

export function hasRequiredScopes(value) {
  const scopes = scopeSet(value);
  return GOOGLE_SCOPES.every((scope) => scopes.has(scope));
}
