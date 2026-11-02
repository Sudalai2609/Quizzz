// Pure logic: selection, grouping, URL encoding, validation, grading. No UI imports.
export const LIMITS={warn:6000,max:32000};
const enc=new TextEncoder(),dec=new TextDecoder();
const toB64=b=>{let s='';b.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const fromB64=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
const pipe=async(bytes,stream)=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
// 'z' prefix = deflate-raw compressed, 'p' = plain JSON (fallback when CompressionStream is missing)
export async function pack(obj){
  const raw=enc.encode(JSON.stringify(obj));
  if(typeof CompressionStream!=='undefined'){try{return 'z'+toB64(await pipe(raw,new CompressionStream('deflate-raw')))}catch{}}
  return 'p'+toB64(raw);
}
export async function unpack(s){
  try{const b=fromB64(s.slice(1));
    const raw=s[0]==='z'?await pipe(b,new DecompressionStream('deflate-raw')):s[0]==='p'?b:null;
    return JSON.parse(dec.decode(raw));
  }catch{throw new Error('This link is damaged, incomplete or needs a newer browser.')}
}
export function validateQuiz(q){
  const bad=m=>{throw new Error(m)};
  if(!q||!Array.isArray(q.questions)||!q.questions.length)bad('This quiz contains no questions.');
  const pids=new Set((q.passages||[]).map(p=>p.id));
  q.questions.forEach(x=>{
    if(!x.id||!x.text||!Array.isArray(x.options)||x.options.length!==4||!['A','B','C','D'].includes(x.answer))bad('A question in this quiz is malformed.');
    if(x.passageId&&!pids.has(x.passageId))bad('A passage in this quiz is missing.');
  });
  return q;
}
export const validQuestion=q=>q&&q.id&&q.text&&q.category&&Array.isArray(q.options)&&q.options.length===4&&['A','B','C','D'].includes(q.answer);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export function selectQuiz(qs,passages,o){
  const pool=qs.filter(q=>(!o.category||q.category===o.category)&&(!o.difficulty||q.difficulty===o.difficulty)&&
    (q.status==='Needs Revision'?o.revision:q.status==='Unseen'||!o.unseenOnly)&&!(o.used&&o.used.has(q.id)));
  const m=new Map(),groups=[];
  pool.forEach(q=>{if(q.passageId){if(!m.has(q.passageId)){const g={pid:q.passageId,qs:[]};m.set(q.passageId,g);groups.push(g)}m.get(q.passageId).qs.push(q)}else groups.push({qs:[q]})});
  let pick=null;
  for(let i=0;i<80&&!pick;i++){let t=0;const p=[];
    for(const g of shuffle(groups)){if(t+g.qs.length<=o.n){p.push(g);t+=g.qs.length}if(t===o.n)break}
    if(t===o.n)pick=p;}
  if(!pick)return{error:pool.length<o.n?`Only ${pool.length} matching question${pool.length===1?'':'s'} available, but ${o.n} requested. Loosen the filters or add questions.`
    :`Exactly ${o.n} questions isn't possible without splitting a passage's questions. Questions that share a passage are always kept together, so try a different count or filters.`};
  const ids=new Set(pick.map(g=>g.pid).filter(Boolean));
  return{questions:pick.flatMap(g=>g.qs).map(q=>({id:q.id,passageId:q.passageId||null,category:q.category,difficulty:q.difficulty,text:q.text,options:q.options,answer:q.answer,explanation:q.explanation})),
    passages:passages.filter(p=>ids.has(p.id)).map(p=>({id:p.id,title:p.title||'',text:p.text,category:p.category||''}))};
}
export function grade(quiz,ans){
  let correct=0,incorrect=0,unanswered=0;
  const items=quiz.questions.map(q=>{const sel=ans[q.id]||null;if(!sel)unanswered++;else if(sel===q.answer)correct++;else incorrect++;return{q,sel}});
  const total=items.length;
  return{total,correct,incorrect,unanswered,pct:Math.round(correct/total*100),items};
}

// Compact wire format (v2): arrays instead of keyed objects, no UUIDs. Old v1 links still open.
const DIFFS=['Easy','Medium','Hard'];
export const compact=q=>{const pi=new Map((q.passages||[]).map((p,i)=>[p.id,i]));
  return{v:2,i:q.id,t:q.title,p:(q.passages||[]).map(p=>[p.title||'',p.text]),
    q:q.questions.map(x=>[x.passageId?pi.get(x.passageId):-1,x.text,x.options,'ABCD'.indexOf(x.answer),x.explanation||'',x.category||'',DIFFS.indexOf(x.difficulty)])}};
export const expand=c=>{
  if(c&&c.v===1)return c;
  if(!c||c.v!==2||!Array.isArray(c.q)||!Array.isArray(c.p))throw new Error('This link is damaged or incomplete.');
  return{id:c.i,title:c.t,passages:c.p.map(([title,text],i)=>({id:'p'+i,title,text})),
    questions:c.q.map(([pi,text,options,a,explanation,category,d],i)=>({id:'q'+i,passageId:pi>=0?'p'+pi:null,text,options,answer:'ABCD'[a],explanation,category,difficulty:DIFFS[d]||''}))}};
