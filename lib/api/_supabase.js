import { createClient } from '@supabase/supabase-js';
export function supabaseAdmin(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Supabase is not configured.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function getUser(req){const a=req.headers.authorization||'';if(!a.startsWith('Bearer '))throw new Error('Unauthorized');const {getAdmin}=await import('./_firebase-admin.js');return getAdmin().auth().verifyIdToken(a.slice(7))}
export function json(res,status,body){return res.status(status).json(body)}
export function cors(res,origin='*'){let value='*';try{if(origin&&origin!=='null')value=new URL(origin).origin}catch{}res.setHeader('Access-Control-Allow-Origin',value);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');}
export function method(req,res,allowed){if(!allowed.includes(req.method)){res.setHeader('Allow',allowed.join(', '));json(res,405,{error:'Method not allowed'});return false}return true}
export function originOf(req){return req.headers.origin||req.headers.referer||''}
export function hostFromUrl(value){try{return new URL(value).hostname.toLowerCase()}catch{return ''}}
export async function rawBody(req){if(req.rawBody)return Buffer.isBuffer(req.rawBody)?req.rawBody.toString('utf8'):String(req.rawBody);const chunks=[];for await(const chunk of req)chunks.push(typeof chunk==='string'?Buffer.from(chunk):chunk);return Buffer.concat(chunks).toString('utf8')}

export function activePlan(profile){const plan=profile?.plan||'free';if(plan==='free')return 'free';if(profile?.plan_expires_at&&new Date(profile.plan_expires_at)<=new Date())return 'free';return ['starter','pro'].includes(plan)?plan:'free'}
