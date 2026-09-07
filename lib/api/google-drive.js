import {supabaseAdmin,getUser,json,method,originOf,hostFromUrl,cors} from './_supabase.js';
import {googleAccessToken} from './google-token.js';

const db=()=>supabaseAdmin();

async function driveRequest(token,url,options={}){
  const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})}});
  const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok) throw new Error(data.error?.message||`Google Drive returned ${r.status}`);
  return {data,headers:r.headers};
}

async function ensureFolder(token,name,parentId='root'){
  const q=`name='${String(name).replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
  const found=await driveRequest(token,`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=1&fields=files(id,name)`);
  if(found.data.files?.[0]) return found.data.files[0].id;
  const made=await driveRequest(token,'https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[parentId]})});
  return made.data.id;
}

async function ownedForm(formKey,submissionId){
  const d=db();
  const {data:form,error}=await d.from('forms').select('*').eq('form_key',formKey).eq('active',true).single();
  if(error||!form) throw new Error('Form not found.');
  const {data:submission}=await d.from('submissions').select('id,form_id,files').eq('id',submissionId).eq('form_id',form.id).single();
  if(!submission) throw new Error('Submission not found.');
  return {form,submission};
}

export default async function handler(req,res){
  if(req.method==='OPTIONS'){cors(res,req.headers.origin||'*');return res.status(204).end()}
  if(!method(req,res,['GET','POST']))return;
  try{
    if(req.method==='GET'){
      const user=await getUser(req); const d=db();
      const {data}=await d.from('integrations').select('google_email,scope,updated_at').eq('owner_id',user.uid).eq('provider','google').maybeSingle();
      return json(res,200,{connected:!!data,driveEnabled:!!data?.scope?.includes('drive.file'),integration:data||null});
    }
    const body=req.body||{}; const action=String(body.action||'');
    if(action==='init'){
      const formKey=String(body.formKey||'').trim(),submissionId=String(body.submissionId||'').trim(),name=String(body.name||'attachment').slice(0,180),type=String(body.type||'application/octet-stream').slice(0,160),size=Number(body.size||0);
      if(!formKey||!submissionId||!Number.isFinite(size)||size<1)return json(res,400,{error:'Missing upload details.'});
      const {form}=await ownedForm(formKey,submissionId);
      const requestOrigin=originOf(req),incomingHost=hostFromUrl(requestOrigin);
      if(form.allowed_origins?.length&&incomingHost&&!form.allowed_origins.some(x=>hostFromUrl(x)===incomingHost||String(x).toLowerCase()===incomingHost))return json(res,403,{error:'This website is not allowed for this form.'});
      cors(res,requestOrigin||'*');
      if(form.attachment_mode==='disabled')return json(res,403,{error:'File uploads are disabled for this form.'});
      if(form.attachment_mode!=='google_drive')return json(res,409,{error:'This form is not configured for Google Drive uploads.'});
      const plan=(await db().from('profiles').select('plan').eq('owner_id',form.owner_id).maybeSingle()).data?.plan||'free'; const max=plan==='pro'?25:plan==='starter'?10:5; if(size>max*1024*1024)return json(res,413,{error:`This plan allows files up to ${max}MB.`});
      const existingRow=await db().from('submissions').select('files').eq('id',submissionId).eq('form_id',form.id).single();if(existingRow.error)throw existingRow.error;const existing=Array.isArray(existingRow.data?.files)?existingRow.data.files:[];
      const total=existing.reduce((n,f)=>n+Number(f?.size||0),0); const count=existing.length; const maxTotal=(plan==='pro'?250:plan==='starter'?100:50)*1024*1024;
      if(count>=20)return json(res,413,{error:'This submission already has the maximum of 20 attachments.'});
      if(total+size>maxTotal)return json(res,413,{error:`This submission can store up to ${maxTotal/1024/1024}MB of attachments.`});
      const token=await googleAccessToken(form.owner_id); const root=await ensureFolder(token,'WyForm Attachments'); const folder= form.drive_folder_id || await ensureFolder(token,form.name.slice(0,80),root);
      if(!form.drive_folder_id){const saved=await db().from('forms').update({drive_folder_id:folder,updated_at:new Date().toISOString()}).eq('id',form.id);if(saved.error)throw saved.error;form.drive_folder_id=folder;}
      const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Upload-Content-Type':type,'X-Upload-Content-Length':String(size)},body:JSON.stringify({name,parents:[folder]})});
      if(!r.ok) throw new Error((await r.text())||'Could not start Google Drive upload.'); const uploadUrl=r.headers.get('location'); if(!uploadUrl)throw new Error('Google Drive did not return an upload URL.');
      return json(res,200,{uploadUrl,folderId:folder,maxBytes:max*1024*1024});
    }
    if(action==='complete'){
      const formKey=String(body.formKey||''),submissionId=String(body.submissionId||''),fileId=String(body.fileId||''); if(!formKey||!submissionId||!fileId)return json(res,400,{error:'Missing uploaded file details.'});
      const {form,submission}=await ownedForm(formKey,submissionId); const requestOrigin=originOf(req),incomingHost=hostFromUrl(requestOrigin);if(form.allowed_origins?.length&&incomingHost&&!form.allowed_origins.some(x=>hostFromUrl(x)===incomingHost||String(x).toLowerCase()===incomingHost))return json(res,403,{error:'This website is not allowed for this form.'});cors(res,requestOrigin||'*');if(form.attachment_mode!=='google_drive')return json(res,409,{error:'This form is not configured for Google Drive uploads.'});const token=await googleAccessToken(form.owner_id); const file=(await driveRequest(token,`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,parents,webViewLink`)).data;
      if(!file.parents?.includes(form.drive_folder_id))return json(res,403,{error:'Uploaded file does not belong to this form.'});
      const files=Array.isArray(submission.files)?submission.files:[]; const item={id:file.id,name:file.name,type:file.mimeType,size:Number(file.size||0),url:file.webViewLink||`https://drive.google.com/open?id=${file.id}`,storage:'google-drive',uploaded_at:new Date().toISOString()};
      await db().from('submissions').update({files:[...files,item].slice(0,20)}).eq('id',submission.id); return json(res,200,{ok:true,file:item});
    }
    return json(res,400,{error:'Unknown Drive action.'});
  }catch(e){console.error(e);return json(res,500,{error:e.message||'Google Drive request failed.'});}
}
