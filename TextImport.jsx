import {useState} from 'react';
import {bulkPut} from './db';
import {parseText} from './parse';
const SAMPLE=`Category: Science
Passage: Bees
Bees pollinate many crops. A single hive can hold tens of thousands of workers.
Q1. What do bees mainly do for crops?
A) Eat them
B) Pollinate them
C) Water them
D) Harvest them
Answer: B
Explanation: Bees carry pollen between flowers.
Q2. Roughly how many workers can a hive hold?
A) Dozens
B) Hundreds
C) Tens of thousands
D) Millions
Answer: C`;
export function TextImport({d,reload}){
  const [t,setT]=useState(''),[r,setR]=useState(null),[msg,setMsg]=useState('');
  const load=async e=>{const f=e.target.files[0];e.target.value='';if(f){setT(await f.text());setR(null);setMsg('')}};
  const go=async()=>{try{await bulkPut('passages',r.passages);await bulkPut('questions',r.questions);
    setMsg(`Imported ${r.questions.length} questions and ${r.passages.length} new passages.`+(r.skipped?` Skipped ${r.skipped} already in your bank.`:''));setR(null);setT('');reload()}
    catch(e){setMsg('Import failed: '+e.message)}};
  return <><h1>Import from text</h1>
    <div className="card form"><p className="muted">Paste text (copying from Word works) or load a .txt file. Each passage is followed by its questions. Explanation is optional. Category, Title and Difficulty lines are optional.</p>
      <textarea rows={12} value={t} onChange={e=>{setT(e.target.value);setR(null);setMsg('')}} placeholder={SAMPLE} aria-label="Question text"/>
      <label>Or load a text file<input type="file" accept=".txt,text/plain" onChange={load}/></label>
      <div className="row"><button className="btn" disabled={!t.trim()} onClick={()=>{setMsg('');setR(parseText(t,d))}}>Check</button></div></div>
    {r&&(r.errors.length?<div className="card err" role="alert"><h2>Fix these first</h2><ul>{r.errors.map((e,i)=><li key={i}>{e}</li>)}</ul><p className="muted">Nothing was imported.</p></div>
      :<div className="card"><p>Ready: {r.questions.length} questions, {r.passages.length} new passages{r.skipped?`, ${r.skipped} skipped as already in your bank`:''}.</p>
        <button className="btn" disabled={!r.questions.length} onClick={go}>Import</button></div>)}
    {msg&&<p role="status">{msg}</p>}</>;
}
