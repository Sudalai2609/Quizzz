import {useEffect,useState} from 'react';
import {useData} from './db';
import {Dashboard,Questions,QuestionForm,Passages,CreateQuiz} from './Admin';
import {Quiz,SharedResult} from './Participant';
const NAV=[['','Home'],['questions','Questions'],['passages','Passages'],['create-quiz','Create quiz']];
function Admin({seg}){
  const {d,err,reload}=useData();const p=seg[0]||'';const props={d,reload};let page;
  if(err)page=<div className="card err">Storage unavailable: {err} Private browsing can block IndexedDB.</div>;
  else if(!d)page=<p className="muted">Loading…</p>;
  else page=p===''?<Dashboard {...props}/>:p==='questions'?(seg[1]?<QuestionForm {...props} id={seg[1]}/>:<Questions {...props}/>)
    :p==='passages'?<Passages {...props}/>:p==='create-quiz'?<CreateQuiz {...props}/>:<div className="card">Page not found. <a href="#/">Go home</a></div>;
  return <div className="shell"><header className="top"><b className="brand">Passage Quiz Studio</b>
    <nav aria-label="Main">{NAV.map(([h,t])=><a key={h} href={'#/'+h} aria-current={p===h?'page':undefined}>{t}</a>)}</nav></header><main>{page}</main></div>;
}
export default function App(){
  const [h,setH]=useState(location.hash);
  useEffect(()=>{const f=()=>{setH(location.hash);scrollTo(0,0)};addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);
  const seg=h.replace(/^#/,'').split('/').filter(Boolean);
  if(seg[0]==='quiz')return <Quiz payload={seg[1]}/>;
  if(seg[0]==='results')return <SharedResult payload={seg[1]}/>;
  return <Admin seg={seg}/>;
}
