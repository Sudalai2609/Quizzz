import {useCallback,useEffect,useState} from 'react';
const STORES=['questions','passages','quizzes','results'];
let dbp;
const open=()=>dbp||(dbp=new Promise((res,rej)=>{
  if(!window.indexedDB)return rej(new Error('IndexedDB is not available in this browser.'));
  const r=indexedDB.open('passage-quiz-studio',1);
  r.onupgradeneeded=()=>STORES.forEach(s=>r.result.createObjectStore(s,{keyPath:'id'}));
  r.onsuccess=()=>res(r.result);
  r.onerror=()=>{dbp=null;rej(r.error)};
}));
const tx=async(s,mode,fn)=>{const db=await open();return new Promise((res,rej)=>{
  const t=db.transaction(s,mode);const rq=fn(t.objectStore(s));
  t.oncomplete=()=>res(rq&&rq.result);t.onerror=t.onabort=()=>rej(t.error);});};
export const all=s=>tx(s,'readonly',o=>o.getAll());
export const put=(s,v)=>tx(s,'readwrite',o=>o.put(v));
export const del=(s,id)=>tx(s,'readwrite',o=>o.delete(id));
export const bulkPut=async(s,vs)=>{const db=await open();return new Promise((res,rej)=>{
  const t=db.transaction(s,'readwrite');vs.forEach(v=>t.objectStore(s).put(v));
  t.oncomplete=res;t.onerror=t.onabort=()=>rej(t.error);});};
export const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);
export function useData(){
  const [d,setD]=useState(null),[err,setErr]=useState(null);
  const load=useCallback(async()=>{try{
    const [questions,passages,quizzes,results]=await Promise.all(STORES.map(all));
    setD({questions,passages,quizzes,results});}catch(e){setErr(e.message)}},[]);
  useEffect(()=>{load()},[load]);
  return{d,err,reload:load};
}
