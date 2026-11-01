import {useEffect,useState} from 'react';
import {put} from './db';
import {unpack,pack,validateQuiz,grade} from './lib';
import {Passage,ShareBox} from './ui';
const L=['A','B','C','D'];
const groupsOf=qs=>{const g=[];qs.forEach(q=>{const l=g[g.length-1];if(q.passageId&&l&&l.pid===q.passageId)l.qs.push(q);else g.push({pid:q.passageId,qs:[q]})});return g};
const Summary=({r})=><div className="stats"><div><b>{r.pct}%</b>Accuracy</div><div><b>{r.correct}</b>Correct</div><div><b>{r.incorrect}</b>Incorrect</div><div><b>{r.unanswered}</b>Unanswered</div></div>;
const Fail=({m})=><div className="shell"><div className="card err"><h2>This link can't be opened</h2><p>{m}</p><p className="muted">Ask the sender to share the quiz link again.</p></div></div>;

export function Quiz({payload}){
  const [quiz,setQuiz]=useState(null),[err,setErr]=useState(''),[ans,setAns]=useState({}),[step,setStep]=useState(0),[ask,setAsk]=useState(false),[res,setRes]=useState(null);
  useEffect(()=>{unpack(payload||'').then(validateQuiz).then(setQuiz).catch(e=>setErr(e.message))},[payload]);
  if(err)return <Fail m={err}/>;
  if(!quiz)return <div className="shell"><p className="muted">Opening quiz…</p></div>;
  if(res)return <Results quiz={quiz} r={res}/>;
  const gs=groupsOf(quiz.questions),g=gs[step],last=step===gs.length-1;
  const done=quiz.questions.filter(q=>ans[q.id]).length,total=quiz.questions.length;
  const submit=async()=>{const r=grade(quiz,ans);setRes(r);scrollTo(0,0);
    try{await put('results',{id:quiz.id+'-'+Date.now(),quizId:quiz.id,title:quiz.title,at:Date.now(),correct:r.correct,total:r.total})}catch{}};
  return <div className="shell take"><header><h1>{quiz.title}</h1>
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><i style={{width:done/total*100+'%'}}/></div>
    <p className="muted">{done} of {total} answered · Part {step+1} of {gs.length}</p></header>
    <Passage p={quiz.passages?.find(p=>p.id===g.pid)}/>
    {g.qs.map(q=><fieldset className="card" key={q.id}><legend className="qt">{quiz.questions.indexOf(q)+1}. {q.text}</legend>
      {!ans[q.id]&&<p className="warn">Not answered yet</p>}
      {q.options.map((t,i)=><label key={i} className={'opt'+(ans[q.id]===L[i]?' on':'')}><input type="radio" name={q.id} checked={ans[q.id]===L[i]} onChange={()=>setAns({...ans,[q.id]:L[i]})}/><b>{L[i]}</b><span>{t}</span></label>)}</fieldset>)}
    {ask&&<div className="card" role="alertdialog" aria-label="Confirm submission"><p>{total-done?`${total-done} question${total-done>1?'s are':' is'} unanswered. `:''}Submit your answers? You can't change them afterwards.</p>
      <div className="row"><button className="btn" onClick={submit}>Submit</button><button className="btn ghost" onClick={()=>setAsk(false)}>Keep going</button></div></div>}
    <div className="row nav"><button className="btn ghost" disabled={!step} onClick={()=>{setStep(step-1);setAsk(false)}}>Back</button>
      {last?<button className="btn" onClick={()=>setAsk(true)}>Review and submit</button>:<button className="btn" onClick={()=>setStep(step+1)}>Next</button>}</div></div>;
}

function Results({quiz,r}){
  const [url,setUrl]=useState('');
  useEffect(()=>{pack({t:quiz.title,n:r.total,c:r.correct,w:r.incorrect,u:r.unanswered,p:r.pct,at:Date.now(),
    it:r.items.map(({q,sel})=>[q.text.slice(0,90),sel,q.answer])}).then(p=>setUrl(location.origin+location.pathname+'#/results/'+p))},[]);
  return <div className="shell take"><h1>Your results</h1><p className="muted">{quiz.title}</p><Summary r={r}/>
    <h2>Share results</h2><p className="muted">Nothing is sent automatically. Send this link to the quiz creator so they can see your score.</p>
    {url&&<ShareBox url={url} title="Quiz results" text={`${quiz.title}: ${r.correct}/${r.total} correct (${r.pct}%).`}/>}
    <h2>Review</h2>{r.items.map(({q,sel},i)=><article className="card" key={q.id}>
      <p className="qt">{i+1}. {q.text}</p>
      {q.options.map((t,j)=><div key={j} className={'opt'+(q.answer===L[j]?' right':sel===L[j]?' wrong':'')}><b>{L[j]}</b><span>{t}</span></div>)}
      <p className="muted">{sel?`You chose ${sel}. `:'You skipped this. '}Correct answer: {q.answer}.</p><p>{q.explanation}</p></article>)}</div>;
}

export function SharedResult({payload}){
  const [r,setR]=useState(null),[err,setErr]=useState(''),[saved,setSaved]=useState(false);
  useEffect(()=>{unpack(payload||'').then(x=>{if(!x||!Array.isArray(x.it)||typeof x.n!=='number')throw Error('This results link is incomplete.');setR(x)}).catch(e=>setErr(e.message))},[payload]);
  if(err)return <Fail m={err}/>;if(!r)return <div className="shell"><p className="muted">Opening results…</p></div>;
  const save=async()=>{await put('results',{id:'shared-'+r.at,title:r.t,at:r.at,correct:r.c,total:r.n});setSaved(true)};
  return <div className="shell take"><h1>Participant results</h1><p className="muted">{r.t}</p>
    <Summary r={{pct:r.p,correct:r.c,incorrect:r.w,unanswered:r.u}}/>
    {r.it.map(([t,s,a],i)=><article className="card" key={i}><p className="qt">{i+1}. {t}</p>
      <p className={s===a?'ok':'errtxt'}>{s?`Chose ${s}`:'Skipped'} · Correct: {a}</p></article>)}
    <div className="row"><button className="btn" onClick={save} disabled={saved}>{saved?'Saved to history':'Save to this device'}</button><a className="btn ghost" href="#/">Open studio</a></div></div>;
}
