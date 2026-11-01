import {useState} from 'react';
export const Passage=({p})=>p?<section className="passage"><h2>{p.title||'Passage'}</h2>{p.text.split(/\n+/).map((t,i)=><p key={i}>{t}</p>)}</section>:null;
export function ShareBox({url,text,title}){
  const [m,setM]=useState('');
  const copy=async s=>{try{await navigator.clipboard.writeText(s);setM('Copied to clipboard.')}catch{
    const t=document.getElementById('sharebox');t.select();
    setM(document.execCommand&&document.execCommand('copy')?'Copied to clipboard.':'Copy failed. Select the link above and copy it manually.')}};
  const share=async()=>{try{await navigator.share({title,text,url})}catch(e){if(e.name!=='AbortError')copy(url)}};
  return <div className="card"><textarea id="sharebox" readOnly value={url} rows={3} onFocus={e=>e.target.select()} aria-label="Link"/>
    <div className="row"><button className="btn" onClick={()=>copy(url)}>Copy link</button>
    {navigator.share&&<button className="btn ghost" onClick={share}>Share</button>}
    {text&&<button className="btn ghost" onClick={()=>copy(text+'\n'+url)}>Copy message</button>}</div>
    <p className="muted" role="status">{m}</p></div>;
}
