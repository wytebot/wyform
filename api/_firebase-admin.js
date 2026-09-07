import admin from 'firebase-admin';

// IMPORTANT: this used to throw at module load time when the env var was missing
// or malformed. A throw during module evaluation crashes the whole serverless
// function before any handler's try/catch can run, so Vercel serves its generic
// "A server error has occurred" HTML page instead of JSON — which is what broke
// JSON.parse() on the client with "Unexpected token 'A' ... is not valid JSON".
// Deferring the throw into getAdmin() means it only happens inside a handler's
// try/catch, so callers always get a proper JSON error response instead.
export function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('Server is misconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    let creds;
    try {
      creds = JSON.parse(raw);
    } catch {
      throw new Error('Server is misconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  }
  return admin;
}

export function adminDbGet() { return getAdmin().firestore(); }
export function adminAuthGet() { return getAdmin().auth(); }

// Keep the old named exports working for existing call sites, but as lazy
// getters (via Proxy) rather than values computed at import time.
function boundProxy(getInstance) {
  return new Proxy({}, {
    get: (_, prop) => {
      const inst = getInstance();
      const val = inst[prop];
      return typeof val === 'function' ? val.bind(inst) : val;
    }
  });
}
export const adminDb = boundProxy(adminDbGet);
export const adminAuth = boundProxy(adminAuthGet);

export async function bearerUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw new Error('Authentication required.');
  return adminAuthGet().verifyIdToken(h.slice(7));
}
