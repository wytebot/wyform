import React,{useEffect,useRef,useState} from 'react';
import {Mail,Table2,HardDrive,CheckCircle2,ExternalLink,RefreshCw} from 'lucide-react';
import {api} from '../lib/api';

export default function Integrations(){
  const [google,setGoogle]=useState(null),[sheet,setSheet]=useState(''),[range,setRange]=useState('Sheet1!A:Z'),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
  const timerRef=useRef(null);
  async function load(){try{const data=await api('/api/gmail-status');setGoogle(data);return data}catch(e){setMsg(e.message||'Could not load Google connection.');return null}}
  useEffect(()=>{
    load();
    const params=new URLSearchParams(window.location.search);
    const googleResult=params.get('google');
    const googleError=params.get('error');
    if(googleResult==='connected'){setMsg('Google connected successfully.');window.history.replaceState({},'',window.location.pathname);load();}
    if(googleError){setMsg(googleError);window.history.replaceState({},'',window.location.pathname);}
    return()=>{if(timerRef.current)clearInterval(timerRef.current)};
  },[]);
  async function connect(){
    setBusy(true);setMsg('Opening Google authorization…');
    let popup=null;
    const onMessage=async e=>{
      if(e.origin!==window.location.origin)return;
      if(e.data?.type==='wyform-google-connected'){setMsg('Google connected successfully.');await load();cleanup();}
      if(e.data?.type==='wyform-google-error'){setMsg(e.data.message||'Google connection failed.');cleanup();}
    };
    const cleanup=()=>{window.removeEventListener('message',onMessage);if(timerRef.current)clearInterval(timerRef.current);setBusy(false)};
    window.addEventListener('message',onMessage);
    try{
      const {authUrl}=await api('/api/google-auth',{method:'POST'});
      if(!authUrl || !/^https:\/\/accounts\.google\.com\//i.test(authUrl)){
        throw new Error('Google authorization is not configured correctly. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL and GOOGLE_REDIRECT_URI in Vercel.');
      }
      popup=window.open(authUrl,'wyform-google','width=600,height=760,noopener=false');
      if(!popup){
        setMsg('Pop-up was blocked. Continuing Google authorization in this tab…');
        window.location.assign(authUrl);
        return;
      }
      try{popup.focus()}catch{}
      timerRef.current=setInterval(()=>{
        if(popup.closed){cleanup();setMsg('Google authorization window closed. No changes were made.');}
      },500);
    }catch(e){cleanup();setMsg(e.message||'Could not start Google connection.');}
  }
  async function testSheets(){
    if(!sheet.trim())return setMsg('Enter a Spreadsheet ID first.');
    setBusy(true);setMsg('Testing Google Sheets…');
    try{await api('/api/sheets-sync',{method:'POST',body:JSON.stringify({spreadsheetId:sheet.trim(),range:range.trim()||'Sheet1!A:Z',values:['WyForm test',new Date().toISOString()]})});setMsg('Test row added to your sheet.')}catch(e){setMsg(e.message)}finally{setBusy(false)}
  }
  return <><div className="pageHead"><div><div className="eyebrow">ZERO-COST INTEGRATIONS</div><h1>Integrations</h1><p className="muted">Use the tools your business already pays for. WyForm avoids storing attachment bytes on its own servers.</p></div></div><div className="grid2"><div className="card"><Mail/><h3>Gmail + Google Sheets</h3><p className="muted">Connect once. Notifications and auto-replies are sent from your Gmail, while submissions can be appended to Sheets.</p>{google?.connected?<><div className="connectedPill"><CheckCircle2 size={16}/> Connected: {google.integration.google_email}</div><p className="tiny">Scopes: {google.integration.scope||'unknown'}</p></>:null}<button className="primary" disabled={busy} onClick={connect}><RefreshCw size={16}/>{busy?'Connecting…':google?.connected?'Reconnect Google':'Connect Google'}</button><p className="tiny">WyForm requests only the Gmail send, Sheets, and Drive file permissions required for these integrations.</p></div><div className="card"><HardDrive/><h3>Google Drive attachments</h3><p className="muted">Uploaded files go directly into your Google Drive under a WyForm Attachments folder. WyForm keeps only file metadata and the Drive link.</p><div className={google?.integration?.scope?.includes('drive.file')?'connectedPill':'badge'}>{google?.integration?.scope?.includes('drive.file')?<><CheckCircle2 size={16}/> Drive enabled</>:'Reconnect Google to enable Drive uploads'}</div><p className="tiny">Free users: 5MB/file · Starter: 10MB/file · Pro: 25MB/file. Retention can automatically remove old submissions and their Drive attachments.</p></div></div><div className="grid2"><div className="card"><Table2/><h3>Google Sheets test</h3><p className="muted">Use the connected Google account to test a spreadsheet before assigning it to a form.</p><input value={sheet} onChange={e=>setSheet(e.target.value)} placeholder="Spreadsheet ID"/><input value={range} onChange={e=>setRange(e.target.value)} placeholder="Sheet1!A:Z"/><button className="secondary wide" disabled={!sheet.trim()||!google?.connected||busy} onClick={testSheets}>{busy?'Testing…':'Test Sheets connection'}</button>{msg&&<p className="tiny">{msg}</p>}</div><div className="card"><h3>Permissions & cost control</h3><p className="muted">WyForm does not run a separate email or file-storage bill for your customers. Gmail, Sheets and Drive remain under the customer's Google account and its own quotas.</p><a className="link" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Manage Google permissions <ExternalLink size={14}/></a></div></div></>}
