import crypto from 'node:crypto';
import {supabaseAdmin,getUser,json,method,hostFromUrl} from './_supabase.js';
function key(){return crypto.randomBytes(9).toString('base64url')}
const patchable=['name','email_subject','auto_reply_subject','auto_reply_body','success_message','success_redirect','sheet_id','sheet_range','webhook_url','webhook_secret','notification_email','template_id','template_category','description','builder_title','builder_description'];
export default async function handler(req,res){
  if(!method(req,res,['GET','POST','PUT','DELETE'])) return;
  try{
    const user=await getUser(req),db=supabaseAdmin();
    if(req.method==='GET'){
      const {data,error}=await db.from('forms').select('*').eq('owner_id',user.uid).order('created_at',{ascending:false});
      if(error)throw error; return json(res,200,{forms:data||[]});
    }
    if(req.method==='POST'){
      await db.from('profiles').upsert({owner_id:user.uid,email:user.email,updated_at:new Date().toISOString()},{onConflict:'owner_id'});
      const body=req.body||{},name=String(body.name||'contact').trim().slice(0,80),domain=hostFromUrl(body.domain||'');
      if(!name||!domain)return json(res,400,{error:'Form name and website domain are required.'});
      const form={owner_id:user.uid,name,domain,form_key:key(),active:true,branding:true,gmail_enabled:true,auto_reply:false,webhook_enabled:false,capture_utm:true,duplicate_window_minutes:10,retention_days:30,attachment_mode:'google_drive',version:1,webhook_secret:crypto.randomBytes(24).toString('base64url'),template_id:String(body.templateId||'blank').slice(0,80),template_category:String(body.templateCategory||'General').slice(0,80),description:String(body.description||'').slice(0,500),email_subject:`New ${name} submission`,success_message:'Thanks! Your message has been received.',allowed_origins:[domain],created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      const {data,error}=await db.from('forms').insert(form).select('*').single();if(error)throw error;return json(res,201,{form:data});
    }
    const id=String(req.query?.id||'');if(!id)return json(res,400,{error:'Form id required.'});
    const {data:current,error:ce}=await db.from('forms').select('*').eq('id',id).eq('owner_id',user.uid).single();if(ce||!current)return json(res,404,{error:'Form not found.'});
    if(req.method==='PUT'){
      const b=req.body||{},patch={updated_at:new Date().toISOString(),version:Number(current.version||1)+1};
      for(const k of patchable)if(b[k]!==undefined)patch[k]=String(b[k]).slice(0,20000);
      for(const k of ['auto_reply','gmail_enabled','webhook_enabled','capture_utm'])if(b[k]!==undefined)patch[k]=!!b[k];
      if(b.sheet_id!==undefined)patch.sheet_id=String(b.sheet_id).slice(0,300);
      if(b.sheet_range!==undefined)patch.sheet_range=String(b.sheet_range).slice(0,300);
      if(b.webhook_url!==undefined)patch.webhook_url=String(b.webhook_url).slice(0,1000);
      if(b.webhook_secret!==undefined)patch.webhook_secret=String(b.webhook_secret).slice(0,200);
      if(b.duplicate_window_minutes!==undefined)patch.duplicate_window_minutes=Math.max(1,Math.min(1440,Number(b.duplicate_window_minutes)||10));
      if(b.retention_days!==undefined)patch.retention_days=Math.max(0,Math.min(3650,Number(b.retention_days)||0));
      if(b.attachment_mode!==undefined)patch.attachment_mode=['google_drive','metadata_only','disabled'].includes(b.attachment_mode)?b.attachment_mode:'google_drive';
      if(b.fields_schema!==undefined)patch.fields_schema=Array.isArray(b.fields_schema)?b.fields_schema.slice(0,80).map((f,i)=>({id:String(f.id||`field_${i+1}`).slice(0,60),name:String(f.name||`field_${i+1}`).trim().slice(0,80),label:String(f.label||'Field').slice(0,120),type:['text','textarea','email','tel','number','date','time','url','select','radio','checkbox','file','rating','currency','hidden'].includes(f.type)?f.type:'text',required:!!f.required,placeholder:String(f.placeholder||'').slice(0,200),help:String(f.help||'').slice(0,300),options:Array.isArray(f.options)?f.options.slice(0,50).map(x=>String(x).slice(0,100)):[]})):[];
      if(b.allowed_origins!==undefined)patch.allowed_origins=Array.isArray(b.allowed_origins)?b.allowed_origins.map(x=>hostFromUrl(x)||String(x)).slice(0,20):[];
      if(b.active!==undefined)patch.active=!!b.active;
      const {data,error}=await db.from('forms').update(patch).eq('id',id).eq('owner_id',user.uid).select('*').single();if(error)throw error;return json(res,200,{form:data});
    }
    const {error}=await db.from('forms').delete().eq('id',id).eq('owner_id',user.uid);if(error)throw error;return json(res,200,{ok:true});
  }catch(e){console.error(e);return json(res,500,{error:e.message||'Request failed.'})}
}
