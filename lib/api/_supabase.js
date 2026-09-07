import { createClient } from '@supabase/supabase-js';

export function supabaseAdmin(){
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Supabase is not configured.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function getUser(req){
  const a=req.headers.authorization||'';
  if(!a.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token=a.slice(7).trim();
  if(!token||token.length>4096) throw new Error('Unauthorized');
  const {getAdmin}=await import('./_firebase-admin.js');
  return getAdmin().auth().verifyIdToken(token);
}
export function json(res,status,body){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.status(status).json(body);
}
export function cors(res,origin='*'){
  let value='*';
  try{ if(origin&&origin!=='null') value=new URL(origin).origin; }catch{}
  res.setHeader('Access-Control-Allow-Origin',value);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST,GET,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-WyForm-Key, X-WyForm-Signature');
  res.setHeader('Access-Control-Max-Age','86400');
}
export function securityHeaders(res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
}
export function method(req,res,allowed){
  if(!allowed.includes(req.method)){
    res.setHeader('Allow',allowed.join(', '));
    json(res,405,{error:'Method not allowed'}); return false;
  }
  return true;
}
export function originOf(req){return req.headers.origin||req.headers.referer||''}
export function hostFromUrl(value){try{return new URL(value).hostname.toLowerCase()}catch{return ''}}
export async function rawBody(req){
  if(req.rawBody)return Buffer.isBuffer(req.rawBody)?req.rawBody.toString('utf8'):String(req.rawBody);
  const chunks=[]; for await(const chunk of req) chunks.push(typeof chunk==='string'?Buffer.from(chunk):chunk);
  return Buffer.concat(chunks).toString('utf8');
}
export function activePlan(profile){
  const plan=profile?.plan||'free';
  if(plan==='free')return 'free';
  if(profile?.plan_expires_at&&new Date(profile.plan_expires_at)<=new Date())return 'free';
  return ['starter','pro'].includes(plan)?plan:'free';
}
export function limitNumber(value,min,max,fallback){
  const n=Number(value); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
