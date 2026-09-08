import { auth } from './firebase';

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('You are signed out. Please sign in again.');
  return user.getIdToken();
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 500) }; }
  }
  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data ?? {};
}

export async function api(path, options = {}) {
  const { headers: suppliedHeaders = {}, body, ...rest } = options;
  const token = await getToken();
  const headers = new Headers(suppliedHeaders);
  headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined && !headers.has('Content-Type') && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, {
    ...rest,
    body,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return parseResponse(res);
}

export async function copyText(value) {
  const text = String(value ?? '');
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch {}
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if(ok) return true;
  } catch {}
  return false;
}
