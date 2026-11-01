// Parses plain text into passages + questions. No UI or database imports.
const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const norm=s=>s.toLowerCase().replace(/\s+/g,' ').trim();
export function parseText(raw,d){
  const passages=[],questions=[],errors=[];
  let cat='General',P=null,Q=null,f=null,n=0,skipped=0,m;
  const seen=new Set(d.questions.map(q=>norm(q.text)));
  const finish=()=>{
    if(!Q)return;const lab='Question '+Q.n,text=Q.text.trim();
    if(!text)errors.push(lab+' has no question text.');
    else if(Q.options.some(o=>!o.trim()))errors.push(lab+' needs all four options (A to D).');
    else if(!Q.answer)errors.push(lab+' has no "Answer:" line.');
    else if(seen.has(norm(text)))skipped++;
    else{
      let pid=null;
      if(P&&P.lines.length){
        if(P.rid===undefined){const t=P.lines.join('\n'),ex=d.passages.find(p=>norm(p.text)===norm(t));
          if(ex)P.rid=ex.id;else{P.rid=id();passages.push({id:P.rid,title:P.title,text:t,category:cat})}}
        pid=P.rid;}
      seen.add(norm(text));
      questions.push({id:id(),category:cat,passageId:pid,text,options:Q.options.map(o=>o.trim()),answer:Q.answer,
        explanation:Q.explanation.trim(),difficulty:Q.difficulty,status:'Unseen',createdAt:Date.now()+questions.length});
    }
    Q=null;f=null;
  };
  for(const l0 of raw.replace(/\r/g,'').split('\n')){
    const line=l0.trim();if(!line)continue;
    if(m=line.match(/^category\s*:\s*(.*)$/i)){finish();cat=m[1].trim()||'General';continue}
    if(m=line.match(/^passage\s*:\s*(.*)$/i)){finish();const rest=m[1].trim();
      if(/^(none|nil|no)$/i.test(rest)){P=null;f=null}else{P={title:'',lines:rest?[rest]:[]};f='p'}continue}
    if(m=line.match(/^(?:q|question)\s*(\d+)?\s*[.):\-]\s*(.*)$/i)){finish();Q={n:m[1]||++n,text:m[2],options:['','','',''],answer:'',explanation:'',difficulty:'Medium'};f='q';continue}
    if(P&&!Q&&(m=line.match(/^title\s*:\s*(.*)$/i))){P.title=m[1].trim();continue}
    if(Q){
      if(m=line.match(/^\(?([A-D])[.)]\s*(.*)$/i)){const i='ABCD'.indexOf(m[1].toUpperCase());Q.options[i]=m[2];f='o'+i;continue}
      if(m=line.match(/^(?:answer|ans|key|correct(?: answer)?)\s*:\s*\(?([A-D])\b/i)){Q.answer=m[1].toUpperCase();f=null;continue}
      if(m=line.match(/^(?:explanation|exp|reason)\s*:\s*(.*)$/i)){Q.explanation=/^(nil|none|n\/a|-)$/i.test(m[1].trim())?'':m[1];f='e';continue}
      if(m=line.match(/^difficulty\s*:\s*(easy|medium|hard)/i)){const v=m[1].toLowerCase();Q.difficulty=v[0].toUpperCase()+v.slice(1);f=null;continue}
      if(f==='q')Q.text+=' '+line;else if(f&&f[0]==='o')Q.options[+f[1]]+=' '+line;else if(f==='e')Q.explanation+=' '+line;
      else errors.push(`Question ${Q.n}: couldn't read "${line.slice(0,40)}".`);
    }else if(P&&f==='p')P.lines.push(line);
    else errors.push(`Couldn't read "${line.slice(0,40)}". Start with Category:, Passage: or Q1.`);
  }
  finish();
  if(!questions.length&&!errors.length&&!skipped)errors.push('No questions found. Start each question with "Q1." and each option with "A)".');
  return{passages,questions,errors,skipped};
}
