import {newId} from '@/lib/id'
import { TODAY } from './seed'
import type { State } from './state'
import type { FlowState, Task, User } from './types'
import { FLOW_ORDER,FLOW_FA,flowOf } from './domain'
export interface SupervisionStatus {id:string;name:string;phase:FlowState;color:string}
export interface SupervisionWorkflow {id:string;revision:number;statuses:SupervisionStatus[]}
export const defaultSupervisionStatuses=():SupervisionStatus[]=>FLOW_ORDER.map((phase,i)=>({id:phase,name:FLOW_FA[phase],phase,color:['#64748b','#3b82f6','#2563eb','#1d4ed8','#dc2626','#16a34a'][i]}))
export const supervisionStatuses=(s:State)=>{
 const configured=s.supervisionWorkflows?.office?.statuses
 if(!configured)return defaultSupervisionStatuses()
 const used=new Set(Object.values(s.tasks).filter(t=>t.kind==='supervision').map(flowOf))
 return [...configured,...defaultSupervisionStatuses().filter(x=>used.has(x.phase)&&!configured.some(c=>c.phase===x.phase)).map(x=>({...x,id:'legacy-'+x.id}))]
}
export const supervisionStatus=(s:State,t:Task)=>supervisionStatuses(s).find(x=>x.id===t.supervisionStatusId&&x.phase===flowOf(t))??supervisionStatuses(s).find(x=>x.phase===flowOf(t))??defaultSupervisionStatuses().find(x=>x.phase===flowOf(t))!
export const managesSupervisionStatuses=(s:State,u:User)=>u.status==='active'&&(['ceo','control','inspector'].includes(u.role)||s.teams.some(t=>t.id===u.teamId&&t.kind==='supervision'&&!t.archived))
export type SupervisionAction={type:'supervisionWorkflow';statuses:SupervisionStatus[];revision:number}|{type:'supervisionStatus';taskId:string;statusId:string}
export function supervisionGuard(s:State,a:SupervisionAction):string|null{
 const u=s.users.find(u=>u.id===s.session)
 if(!u||!managesSupervisionStatuses(s,u))return 'مدیریت وضعیت نظارت برای مدیرعامل، کنترل پروژه و تیم نظارت است.'
 if(a.type==='supervisionStatus')return s.tasks[a.taskId]?.kind==='supervision'&&supervisionStatuses(s).some(x=>x.id===a.statusId)?null:'مورد یا وضعیت نظارت نامعتبر است.'
 if(a.revision!==(s.supervisionWorkflows?.office?.revision??0))return 'وضعیت‌ها تغییر کرده‌اند؛ صفحه را تازه کنید.'
 if(!Array.isArray(a.statuses)||!a.statuses.length||a.statuses.length>30||a.statuses.some(x=>!x||!/^[-a-zA-Z0-9_]{1,100}$/.test(x.id)||['__proto__','prototype','constructor'].includes(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>80||!FLOW_ORDER.includes(x.phase)||!/^#[0-9a-fA-F]{6}$/.test(x.color))||new Set(a.statuses.map(x=>x.id)).size!==a.statuses.length||new Set(a.statuses.map(x=>x.name.trim())).size!==a.statuses.length)return 'نام، رنگ و مرحله‌های یکتا و معتبر لازم است.'
 for(const t of Object.values(s.tasks).filter(t=>t.kind==='supervision'))if(!a.statuses.some(x=>x.id===supervisionStatus(s,t).id))return 'ابتدا موارد وضعیت حذف‌شونده را به وضعیت دیگری منتقل کنید.'
 return null
}
export function applySupervision(s:State,a:SupervisionAction):State{
 const at=new Date().toISOString()
 const update=(t:Task,status:SupervisionStatus):Task=>({...t,supervisionStatusId:status.id,flow:status.phase,actualStart:['in_progress','in_review','rework','closed'].includes(status.phase)?t.actualStart??TODAY:t.actualStart,actualFinish:status.phase==='closed'?t.actualFinish??TODAY:undefined})
 if(a.type==='supervisionStatus'){
 const status=supervisionStatuses(s).find(x=>x.id===a.statusId)!,t=s.tasks[a.taskId]
 return {...s,tasks:{...s.tasks,[t.id]:update(t,status)},audit:[{id:`sup-${newId()}`,at,userId:s.session!,kind:'task',taskId:t.id,text:`تغییر وضعیت نظارت: ${supervisionStatus(s,t).name} ← ${status.name}`},...s.audit]}
 }
 const tasks={...s.tasks}
 for(const t of Object.values(tasks).filter(t=>t.kind==='supervision')){const old=supervisionStatus(s,t),next=a.statuses.find(x=>x.id===old.id)!;if(next.phase!==flowOf(t))tasks[t.id]=update(t,next)}
 return {...s,tasks,supervisionWorkflows:{...s.supervisionWorkflows,office:{id:'office',revision:a.revision+1,statuses:a.statuses.map(x=>({id:x.id,name:x.name.trim(),phase:x.phase,color:x.color}))}},audit:[{id:`sup-${newId()}`,at,userId:s.session!,kind:'task',text:'ویرایش تعریف و ترتیب مراحل نظارت'},...s.audit]}
}
