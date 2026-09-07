import {initializeApp} from 'firebase/app';import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'firebase/auth';import {isSupported,getAnalytics} from 'firebase/analytics';
// Firebase web config is not a secret (it's shipped to every browser anyway), so it's hardcoded
// here rather than pulled from VITE_FIREBASE_* env vars — no environment variables need to be set
// for auth/analytics to work.
const cfg={apiKey:'AIzaSyAmC8_Q5xWTsXkW9TawGVfZu6_IJ97CHsI',authDomain:'wyform1.firebaseapp.com',projectId:'wyform1',storageBucket:'wyform1.firebasestorage.app',messagingSenderId:'128057255491',appId:'1:128057255491:web:f6a3d3aec21567497896f6',measurementId:'G-W48EE274ZN'};
const app=initializeApp(cfg);export const auth=getAuth(app);export const googleProvider=new GoogleAuthProvider();export {signInWithPopup,signOut,onAuthStateChanged};
// measurementId is optional and analytics only works in a supported browser context, so init lazily and never let it block auth/app startup.
export let analytics=null;
isSupported().then(ok=>{if(ok)analytics=getAnalytics(app)}).catch(()=>{});
