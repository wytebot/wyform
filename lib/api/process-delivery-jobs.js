import crypto from 'node:crypto';
import {supabaseAdmin,json,method} from './_supabase.js';
import {sendViaGmail} from './send-email.js';
import {googleAccessToken} from './google-token.js';
function authCron(req){const secret=process.env.CRON_SECRET;return secret&&req.headers.authorization===`Bearer ${secret}`}
async function run(job){
  const p=job.payload||{};
  if(job.kind==='gmail'){await sendViaGmail(job.owner_id,p.to,p.subject,p.html);return}
  if(job.kind==='sheets'){const token=await googleAccessToken(job.owner_id);const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(p.sheet_id)}/values/${encodeURIComponent(p.range||'Sheet1!A:Z')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[p.values||[]]})});if(!r.ok)throw new Error('Sheets append failed.');return}
  if(job.kind==='webhook'){const body=JSON.stringify(p.body||{});const headers={'Content-Type':'application/json','User-Agent':'WyForm/3.0'};if(p.secret)headers['X-WyForm-Signature']='sha256='+crypto.createHmac('sha256',p.secret).update(body).digest('hex');const r=await fetch(p.url,{method:'POST',headers,body,signal:AbortSignal.timeout(7000)});if(!r.ok)throw new Error(`Webhook returned ${r.status}`);return}
  throw new Error('Unknown delivery job.');
}
export default async function handler(req,res){
  if(!method(req,res,['GET','POST']))return;
  try{if(!authCron(req))return json(res,401,{error:'Unauthorized'});
    const db=supabaseAdmin();const {data:jobs,error}=await db.from('delivery_jobs').select('*').eq('status','pending').lte('next_attempt_at',new Date().toISOString()).order('next_attempt_at',{ascending:true}).limit(25);if(error)throw error;let ok=0,failed=0;
    for(const job of jobs||[]){try{await run(job);await db.from('delivery_jobs').update({status:'done',updated_at:new Date().toISOString()}).eq('id',job.id);const {count:remaining}=await db.from('delivery_jobs').select('*',{count:'exact',head:true}).eq('submission_id',job.submission_id).eq('status','pending');if(!remaining){await db.from('submissions').update({delivery_status:'delivered',delivery_error:null,updated_at:new Date().toISOString()}).eq('id',job.submission_id)}ok++}catch(e){failed++;const attempts=Number(job.attempts||0)+1;if(attempts>=5){await db.from('delivery_jobs').update({status:'failed',attempts,last_error:e.message,updated_at:new Date().toISOString()}).eq('id',job.id)}else{const delay=Math.min(86400000,60000*Math.pow(2,attempts-1));await db.from('delivery_jobs').update({attempts,last_error:e.message,next_attempt_at:new Date(Date.now()+delay).toISOString(),updated_at:new Date().toISOString()}).eq('id',job.id)}}}
    return json(res,200,{ok:true,processed:(jobs||[]).length,succeeded:ok,failed});
  }catch(e){console.error(e);return json(res,500,{error:e.message||'Queue failed.'})}
}
