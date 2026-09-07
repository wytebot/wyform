import dns from 'node:dns/promises';

function privateIp(ip){
  const s=String(ip||'').toLowerCase();
  if(s.includes(':')){
    return s==='::1'||s==='::'||s.startsWith('fc')||s.startsWith('fd')||
      s.startsWith('fe8')||s.startsWith('fe9')||s.startsWith('fea')||
      s.startsWith('feb')||s.startsWith('ff');
  }
  const p=s.split('.').map(Number);
  if(p.length!==4||p.some(Number.isNaN)) return false;
  return p[0]===10||p[0]===127||p[0]===0||
    (p[0]===169&&p[1]===254)||(p[0]===192&&p[1]===168)||
    (p[0]===172&&p[1]>=16&&p[1]<=31);
}
export async function safePublicUrl(value){
  try{
    const u=new URL(String(value));
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password) return null;
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')) return null;
    const answers=await dns.lookup(h,{all:true,verbatim:true});
    if(!answers.length||answers.some(x=>privateIp(x.address))) return null;
    return u.toString();
  }catch{return null}
}
export {privateIp};
