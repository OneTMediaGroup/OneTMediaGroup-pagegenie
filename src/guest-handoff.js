// Capture only a visitor-created draft after their explicit Keep action. Never adopt
// an unrelated saved device draft merely because someone signs in on that device.
export function guestHandoff(storage,makeId=()=>crypto.randomUUID()){
 const key='pagegenie:guest-handoff:v1';let memory=null,inFlight=null;
 function read(){try{return memory||JSON.parse(storage.getItem(key)||'null')}catch{return memory}}
 function write(value){memory=value;try{storage.setItem(key,JSON.stringify(value))}catch{}}
 return {
  read,
  prepare(draft){const old=read();if(old?.owner)return;write({draft:JSON.stringify(draft),projectId:old?.projectId||makeId(),owner:null,saved:false});},
  async claim(uid,save){const item=read();if(!item||item.owner&&item.owner!==uid)return null;if(inFlight)return inFlight;if(!item.owner){item.owner=uid;write(item)}const work=async()=>{if(!item.saved){const draft=JSON.parse(item.draft);draft.guestPreview=false;item.draft=JSON.stringify(draft);write(item);await save(item.projectId,{name:draft.fields.business,draft:item.draft});item.saved=true;write(item)}return {...item};};inFlight=work();try{return await inFlight}finally{inFlight=null}},
  clear(){memory=null;try{storage.removeItem(key)}catch{}}
 };
}
