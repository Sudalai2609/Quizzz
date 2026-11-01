import {useMemo,useState} from 'react';
import {put,del,bulkPut,uid} from './db';
import {selectQuiz,pack,validQuestion,LIMITS} from './lib';
import {ShareBox,Passage} from './ui';
const DIFF=['Easy','Medium','Hard'],STAT=['Unseen','Practised','Needs Revision'],L=['A','B','C','D'];
const link=p=>location.origin+location.pathname+'#/'+p;
const cats=qs=>[...new Set(qs.map(q=>q.category))].sort();
const Sel=({v,on,opts,label,all})=><select value={v} onChange={on} aria-label={label}>{all&&<option value="">{all}</option>}{opts.map(o=><option key={o}>{o}</option>)}</select>;

export function Dashboard({d,reload}){
  const [msg,setMsg]=useState('');
  const by={};d.questions.forEach(q=>by[q.category]=(by[q.category]||0)+1);
  const act=[...d.quizzes.map(q=>({at:q.createdAt,t:`Generated “${q.title}” (${q.count} questions)`})),
    ...d.results.map(r=>({at:r.at,t:`Result for “${r.title}”: ${r.correct}/${r.total}`}))].sort((a,b)=>b.at-a.at).slice(0,5);
  const exp=()=>{const b=new Blob([JSON.stringify({app:'passage-quiz-studio',version:1,exportedAt:Date.now(),...d},null,1)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='passage-quiz-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  const imp=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
    try{const j=JSON.parse(await f.text());
      if(j.app!=='passage-quiz-studio')throw Error('This is not a Passage Quiz Studio backup.');
      const qs=j.questions||[],ps=j.passages||[];
      if(!Array.isArray(qs)||!Array.isArray(ps))throw Error('The backup has no questions or passages list.');
      const bad=qs.findIndex(q=>!validQuestion(q));if(bad>=0)throw Error(`Question ${bad+1} in the backup is invalid.`);
      if(ps.some(p=>!p||!p.id||!p.text))throw Error('A passage in the backup is invalid.');
      const hq=new Set(d.questions.map(q=>q.id)),hp=new Set(d.passages.map(p=>p.id));
      const nq=qs.filter(q=>!hq.has(q.id)),np=ps.filter(p=>!hp.has(p.id));
      await bulkPut('passages',np);await bulkPut('questions',nq);
      for(const s of['quizzes','results'])if(Array.isArray(j[s]))await bulkPut(s,j[s].filter(x=>x&&x.id));
      setMsg(`Restored ${nq.length} questions and ${np.length} passages. Skipped ${qs.length-nq.length} questions and ${ps.length-np.length} passages whose IDs already exist here.`);reload();
    }catch(x){setMsg('Import failed: '+x.message)}};
  return <>
    <h1>Dashboard</h1>
    <div className="stats"><div><b>{d.questions.length}</b>Questions</div><div><b>{d.passages.length}</b>Passages</div><div><b>{d.quizzes.length}</b>Quizzes generated</div></div>
    <div className="row"><a className="btn" href="#/questions/new">Add question</a><a className="btn ghost" href="#/questions">Question bank</a>
      <a className="btn ghost" href="#/create-quiz">Create quiz</a><button className="btn ghost" onClick={exp} disabled={!d.questions.length&&!d.passages.length}>Export backup</button></div>
    <section className="card"><h2>By category</h2>{Object.keys(by).length?<ul className="plain">{Object.entries(by).map(([c,n])=><li key={c}><span>{c}</span><b>{n}</b></li>)}</ul>
      :<p className="muted">No questions yet. Add your first question to get started.</p>}</section>
    <section className="card"><h2>Recent activity</h2>{act.length?<ul className="plain">{act.map((a,i)=><li key={i}><span>{a.t}</span><span className="muted">{new Date(a.at).toLocaleDateString()}</span></li>)}</ul>
      :<p className="muted">Nothing yet. Generated quizzes and saved results appear here.</p>}</section>
    <section className="card"><h2>Restore from backup</h2><p className="muted">Import a JSON backup. Items whose IDs already exist are skipped, never overwritten.</p>
      <input type="file" accept="application/json,.json" onChange={imp} aria-label="Backup file"/>{msg&&<p role="status">{msg}</p>}</section>
  </>;
}

export function Questions({d,reload}){
  const [f,setF]=useState({s:'',c:'',d:'',st:'',sort:'new'});const set=k=>e=>setF({...f,[k]:e.target.value});
  const pt=id=>d.passages.find(p=>p.id===id);
  const rows=useMemo(()=>{const s=f.s.toLowerCase();
    const r=d.questions.filter(q=>(!s||(q.text+' '+q.category).toLowerCase().includes(s))&&(!f.c||q.category===f.c)&&(!f.d||q.difficulty===f.d)&&(!f.st||q.status===f.st));
    const k={new:(a,b)=>b.createdAt-a.createdAt,cat:(a,b)=>a.category.localeCompare(b.category),diff:(a,b)=>DIFF.indexOf(a.difficulty)-DIFF.indexOf(b.difficulty)};
    return r.sort(k[f.sort])},[d,f]);
  const rm=async q=>{if(confirm('Delete this question? This cannot be undone.')){await del('questions',q.id);reload()}};
  return <>
    <div className="between"><h1>Question bank</h1><a className="btn" href="#/questions/new">Add question</a></div>
    <div className="filters"><input type="search" placeholder="Search questions" value={f.s} onChange={set('s')} aria-label="Search"/>
      <Sel v={f.c} on={set('c')} opts={cats(d.questions)} label="Category" all="All categories"/>
      <Sel v={f.d} on={set('d')} opts={DIFF} label="Difficulty" all="Any difficulty"/>
      <Sel v={f.st} on={set('st')} opts={STAT} label="Status" all="Any status"/>
      <select value={f.sort} onChange={set('sort')} aria-label="Sort"><option value="new">Newest first</option><option value="cat">Category</option><option value="diff">Difficulty</option></select></div>
    {!d.questions.length?<div className="card"><p className="muted">Your question bank is empty. Add a question to begin.</p></div>
      :!rows.length?<div className="card"><p className="muted">No questions match these filters.</p></div>
      :rows.map(q=><article className="card q" key={q.id}><p className="qt">{q.text}</p>
        <p className="muted">{q.category} · {q.difficulty} · {q.status}{q.passageId&&pt(q.passageId)?` · Passage: ${pt(q.passageId).title||'Untitled'}`:''}</p>
        <div className="row"><a className="btn ghost sm" href={'#/questions/'+q.id}>Edit</a><button className="btn danger sm" onClick={()=>rm(q)}>Delete</button></div></article>)}
  </>;
}

export function QuestionForm({d,id,reload}){
  const ex=d.questions.find(q=>q.id===id);
  const [f,setF]=useState(()=>ex?{...ex,passageId:ex.passageId||'',options:[...ex.options]}:{category:'',passageId:'',text:'',options:['','','',''],answer:'A',explanation:'',difficulty:'Medium',status:'Unseen'});
  const [np,setNp]=useState({title:'',text:''}),[prev,setPrev]=useState(false),[err,setErr]=useState('');
  if(id!=='new'&&!ex)return <div className="card">Question not found. <a href="#/questions">Back to questions</a></div>;
  const set=k=>e=>setF({...f,[k]:e.target.value});
  const opt=i=>e=>setF({...f,options:f.options.map((o,j)=>j===i?e.target.value:o)});
  const save=async()=>{
    const q={...f,id:ex?ex.id:uid(),createdAt:ex?ex.createdAt:Date.now(),category:f.category.trim(),text:f.text.trim(),options:f.options.map(o=>o.trim()),explanation:f.explanation.trim()};
    const m=!q.category?'Add a category.':!q.text?'Write the question text.':q.options.some(o=>!o)?'Fill in all four answer options.':!q.explanation?'Add an explanation for the correct answer.':f.passageId==='__new'&&!np.text.trim()?'Write the passage text or choose another passage option.':'';
    if(m)return setErr(m);
    try{if(f.passageId==='__new'){const p={id:uid(),title:np.title.trim(),text:np.text.trim(),category:q.category};await put('passages',p);q.passageId=p.id}
      await put('questions',q);reload();location.hash='#/questions';
    }catch(e){setErr('Could not save: '+e.message)}};
  const pas=f.passageId==='__new'?(np.text?{title:np.title,text:np.text}:null):d.passages.find(p=>p.id===f.passageId);
  if(prev)return <><h1>Preview</h1><Passage p={pas}/><div className="card"><p className="qt">{f.text||'(no question text)'}</p>
    {f.options.map((o,i)=><div key={i} className={'opt'+(f.answer===L[i]?' right':'')}><b>{L[i]}</b><span>{o}</span></div>)}
    <p className="muted">Correct: {f.answer}. {f.explanation}</p></div><div className="row"><button className="btn ghost" onClick={()=>setPrev(false)}>Back to editing</button></div></>;
  return <><h1>{ex?'Edit question':'Add question'}</h1><div className="card form">
    <label>Category<input list="cats" value={f.category} onChange={set('category')} maxLength={60}/></label>
    <datalist id="cats">{cats(d.questions).map(c=><option key={c} value={c}/>)}</datalist>
    <label>Passage<select value={f.passageId} onChange={set('passageId')}><option value="">No passage (standalone)</option>
      {d.passages.map(p=><option key={p.id} value={p.id}>{p.title||p.text.slice(0,40)}</option>)}<option value="__new">+ Create new passage</option></select></label>
    {f.passageId==='__new'&&<><label>Passage title (optional)<input value={np.title} onChange={e=>setNp({...np,title:e.target.value})}/></label>
      <label>Passage text<textarea rows={7} value={np.text} onChange={e=>setNp({...np,text:e.target.value})}/></label></>}
    {f.passageId&&f.passageId!=='__new'&&<Passage p={pas}/>}
    <label>Question<textarea rows={3} value={f.text} onChange={set('text')}/></label>
    {L.map((l,i)=><label key={l}>Option {l}<input value={f.options[i]} onChange={opt(i)}/></label>)}
    <label>Correct answer<Sel v={f.answer} on={set('answer')} opts={L}/></label>
    <label>Explanation<textarea rows={3} value={f.explanation} onChange={set('explanation')}/></label>
    <div className="two"><label>Difficulty<Sel v={f.difficulty} on={set('difficulty')} opts={DIFF}/></label><label>Status<Sel v={f.status} on={set('status')} opts={STAT}/></label></div>
    {err&&<p className="errtxt" role="alert">{err}</p>}
    <div className="row"><button className="btn" onClick={save}>Save question</button><button className="btn ghost" onClick={()=>setPrev(true)}>Preview</button><a className="btn ghost" href="#/questions">Cancel</a></div></div></>;
}

export function Passages({d,reload}){
  const [e,setE]=useState(null),[err,setErr]=useState('');
  const n=id=>d.questions.filter(q=>q.passageId===id).length;
  const save=async()=>{if(!e.text.trim())return setErr('Passage text is required.');
    await put('passages',{...e,title:e.title.trim(),text:e.text.trim()});setE(null);setErr('');reload()};
  const rm=async p=>{const c=n(p.id);
    if(!confirm(c?`${c} question${c>1?'s use':' uses'} this passage. Deleting it leaves ${c>1?'them':'it'} as standalone and the passage text will be gone. Delete anyway?`:'Delete this passage?'))return;
    for(const q of d.questions.filter(q=>q.passageId===p.id))await put('questions',{...q,passageId:null});
    await del('passages',p.id);reload()};
  return <><div className="between"><h1>Passages</h1><button className="btn" onClick={()=>setE({id:uid(),title:'',text:'',category:''})}>New passage</button></div>
    {e&&<div className="card form"><label>Title (optional)<input value={e.title} onChange={x=>setE({...e,title:x.target.value})}/></label>
      <label>Category (optional)<input value={e.category||''} onChange={x=>setE({...e,category:x.target.value})}/></label>
      <label>Text<textarea rows={8} value={e.text} onChange={x=>setE({...e,text:x.target.value})}/></label>
      {err&&<p className="errtxt" role="alert">{err}</p>}<div className="row"><button className="btn" onClick={save}>Save passage</button><button className="btn ghost" onClick={()=>{setE(null);setErr('')}}>Cancel</button></div></div>}
    {!d.passages.length&&!e?<div className="card"><p className="muted">No passages yet. Create one here or while adding a question.</p></div>
      :d.passages.map(p=><article className="card" key={p.id}><h2>{p.title||'Untitled passage'}</h2><p className="muted clamp">{p.text}</p>
        <p className="muted">{n(p.id)} linked question{n(p.id)===1?'':'s'}</p>
        <div className="row"><button className="btn ghost sm" onClick={()=>setE({...p})}>Edit</button><button className="btn danger sm" onClick={()=>rm(p)}>Delete</button></div></article>)}</>;
}

export function CreateQuiz({d,reload}){
  const [o,setO]=useState({n:4,category:'',difficulty:'',unseenOnly:false,revision:true});
  const [quiz,setQuiz]=useState(null),[err,setErr]=useState(''),[title,setTitle]=useState(''),[out,setOut]=useState(null);
  const gen=()=>{setOut(null);const r=selectQuiz(d.questions,d.passages,o);
    if(r.error){setQuiz(null);return setErr(r.error)}setErr('');setQuiz(r);setTitle((o.category||'Practice quiz')+' · '+new Date().toLocaleDateString())};
  const publish=async()=>{
    const full={v:1,id:uid(),title:title.trim()||'Practice quiz',createdAt:Date.now(),...quiz};
    try{const url=link('quiz/'+await pack(full));
      if(url.length>LIMITS.max)return setErr(`This link would be ${url.length.toLocaleString()} characters, above the ${LIMITS.max.toLocaleString()} limit. Choose fewer questions or shorter passages.`);
      await put('quizzes',{id:full.id,title:full.title,createdAt:full.createdAt,count:full.questions.length});reload();setErr('');setOut({url,title:full.title})}
    catch(e){setErr('Could not create the link: '+e.message)}};
  const pas=id=>quiz.passages.find(p=>p.id===id);
  return <><h1>Create quiz</h1><div className="card form">
    <div className="two"><label>Questions<Sel v={o.n} on={e=>setO({...o,n:+e.target.value})} opts={[3,4,5]}/></label>
      <label>Difficulty<Sel v={o.difficulty} on={e=>setO({...o,difficulty:e.target.value})} opts={DIFF} all="Any"/></label></div>
    <label>Category<Sel v={o.category} on={e=>setO({...o,category:e.target.value})} opts={cats(d.questions)} all="All categories"/></label>
    <label className="chk"><input type="checkbox" checked={o.unseenOnly} onChange={e=>setO({...o,unseenOnly:e.target.checked})}/>Only unseen questions</label>
    <label className="chk"><input type="checkbox" checked={o.revision} onChange={e=>setO({...o,revision:e.target.checked})}/>Include “Needs Revision” questions</label>
    <p className="muted">Questions that share a passage are always kept together, so the count must be reachable without splitting a passage.</p>
    <button className="btn" onClick={gen}>{quiz?'Pick again':'Generate preview'}</button></div>
    {err&&<div className="card err" role="alert">{err}</div>}
    {quiz&&<><h2>Preview</h2><label className="card form">Quiz title<input value={title} onChange={e=>setTitle(e.target.value)}/></label>
      {quiz.questions.map((q,i)=><div key={q.id}>{q.passageId&&q.passageId!==quiz.questions[i-1]?.passageId&&<Passage p={pas(q.passageId)}/>}
        <article className="card"><p className="qt">{i+1}. {q.text}</p>{q.options.map((t,j)=><div key={j} className={'opt'+(q.answer===L[j]?' right':'')}><b>{L[j]}</b><span>{t}</span></div>)}</article></div>)}
      <button className="btn" onClick={publish}>Create share link</button></>}
    {out&&<><h2>Share link</h2><ShareBox url={out.url} title={out.title} text={`Quiz: ${out.title}`}/>
      <p className="muted">{out.url.length.toLocaleString()} characters.{out.url.length>LIMITS.warn&&' This is long. Some messaging apps may cut it off, so check it opens before sending.'}</p>
      <p className="muted">The quiz and its answer key live inside the link. Anyone technical can decode the answers, so use it for casual practice only. Results don't sync automatically: the participant sends you a results link.</p></>}</>;
}
