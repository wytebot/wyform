import crypto from 'node:crypto';
import {supabaseAdmin,getUser,json,method} from './_supabase.js';

async function paystack(reference){
  const r=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`}});
  const d=await r.json();
  if(!r.ok||!d.status) throw new Error(d.message||'Paystack verification failed.');
  return {status:d.data?.status==='success'?'success':(d.data?.status||'pending'),amount:Number(d.data?.amount||0)/100,currency:d.data?.currency||'' ,gateway:d.data};
}
async function flutterwave(reference){
  const tokenRes=await fetch('https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.FLW_CLIENT_ID||'',client_secret:process.env.FLW_CLIENT_SECRET||'',grant_type:'client_credentials'})});
  const tokenData=await tokenRes.json(); if(!tokenRes.ok||!tokenData.access_token) throw new Error('Flutterwave authentication failed.');
  const base=process.env.FLW_API_BASE_URL||'https://f4bexperience.flutterwave.com';
  const r=await fetch(`${base}/charges?reference=${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${tokenData.access_token}`,'X-Trace-Id':crypto.randomUUID()}});
  const d=await r.json(); if(!r.ok) throw new Error(d.message||'Flutterwave verification failed.');
  const item=Array.isArray(d.data)?d.data[0]:d.data;
  return {status:item?.status||'pending',amount:Number(item?.amount||0),currency:item?.currency||'',gateway:item};
}
export default async function handler(req,res){if(!method(req,res,['GET']))return;try{const u=await getUser(req),reference=String(req.query?.reference||'');if(!reference)return json(res,400,{error:'Reference required.'});const db=supabaseAdmin();const {data:event,error}=await db.from('billing_events').select('*').eq('reference',reference).eq('owner_id',u.uid).maybeSingle();if(error)throw error;if(!event)return json(res,404,{error:'Payment reference not found.'});if(event.status==='success')return json(res,200,{status:'success',plan:event.plan,provider:event.provider,reference});let result;if(event.provider==='paystack')result=await paystack(reference);else if(event.provider==='flutterwave')result=await flutterwave(reference);else return json(res,400,{error:'Unsupported payment provider.'});if(result.status==='success'||result.status==='succeeded'){if(result.amount!==Number(event.amount)||result.currency!==event.currency)return json(res,409,{status:'mismatch',error:'Payment amount or currency did not match the order.'});await db.from('billing_events').update({status:'success',paid_at:new Date().toISOString(),gateway_data:result.gateway}).eq('reference',reference);await db.from('profiles').upsert({owner_id:u.uid,plan:event.plan,plan_expires_at:new Date(Date.now()+30*86400000).toISOString(),updated_at:new Date().toISOString()},{onConflict:'owner_id'});return json(res,200,{status:'success',plan:event.plan,provider:event.provider,reference});}return json(res,200,{status:result.status||'pending',plan:event.plan,provider:event.provider,reference});}catch(e){return json(res,500,{error:e.message||'Payment verification failed.'})}}
