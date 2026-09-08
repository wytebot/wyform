import React,{useEffect,useState} from 'react';
import {NavLink,useNavigate} from 'react-router-dom';
import {LayoutDashboard,Code2,Inbox,Plug,CreditCard,BookOpen,LogOut,Menu,KanbanSquare,Activity,ShieldCheck,X} from 'lucide-react';
import {signOut,auth} from '../lib/firebase';
const links=[['/','Dashboard',LayoutDashboard],['/forms','Forms',Code2],['/pipeline','Pipeline',KanbanSquare],['/submissions','Submissions',Inbox],['/health','Health',Activity],['/integrations','Integrations',Plug],['/billing','Billing',CreditCard]];
export default function Layout({user,children}){
  const [open,setOpen]=useState(false); const nav=useNavigate();
  const close=()=>setOpen(false);
  useEffect(()=>{ if(!open)return; const onKey=e=>e.key==='Escape'&&close(); const onResize=()=>window.innerWidth>820&&close(); document.addEventListener('keydown',onKey); window.addEventListener('resize',onResize); return()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize)}},[open]);
  const logout=async()=>{close();await signOut(auth);nav('/')};
  return <div className="shell">
    {open&&<button aria-label="Close menu" className="menuBackdrop" onPointerDown={close} onTouchStart={close}/>} 
    <aside className={'sidebar '+(open?'mobileOpen':'')} aria-hidden={!open&&typeof window!=='undefined'&&window.innerWidth<=820}>
      <div className="mobileMenuHead"><b>Menu</b><button className="iconBtn" aria-label="Close menu" onClick={close}><X size={18}/></button></div>
      <div className="brand"><span className="logoMark"><ShieldCheck size={18}/></span>Wy<span>Form</span></div><div className="tagline">Backend for forms</div>
      <nav>{links.map(([to,label,Icon])=><NavLink end={to==='/' } key={to} to={to} onClick={close}><Icon size={18}/>{label}</NavLink>)}<NavLink to="/how-it-works" onClick={close}><BookOpen size={18}/>How it works</NavLink></nav>
      <div className="sideBottom"><div className="userMini"><div className="avatar">{(user.displayName||user.email||'U')[0].toUpperCase()}</div><div><b>{user.displayName||'Developer'}</b><small>{user.email}</small></div></div><button className="ghost signOutBtn" onClick={logout}><LogOut size={16}/> Sign out</button></div>
    </aside>
    <main className="main" onPointerDown={e=>{if(open&&e.target.closest('.main'))close()}} onTouchStart={e=>{if(open&&e.target.closest('.main'))close()}}>
      <header className="topbar"><button className="mobileOnly iconBtn" aria-label="Open menu" onClick={()=>setOpen(true)}><Menu/></button><div><b>WyForm</b><span className="muted"> · Your forms, handled.</span></div></header>
      <section className="content">{children}</section>
    </main>
  </div>
}
