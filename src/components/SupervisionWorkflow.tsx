import {useState} from 'react'
import {useStore} from '@/lib/store'
import {FLOW_FA,FLOW_ORDER} from '@/lib/domain'
import {managesSupervisionStatuses,supervisionStatuses,supervisionStatus} from '@/lib/supervision'
import type {Task,FlowState} from '@/lib/types'
import {newWorkspaceId,useWorkspaceSave} from '@/lib/useWorkspaceSave'
import {Button} from './ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog'
const field='rounded-md border bg-background p-2 text-sm'
export function SupervisionWorkflowEditor(){
 const {state,me}=useStore(),{save,busy}=useWorkspaceSave(),[open,setOpen]=useState(false),[draft,setDraft]=useState(supervisionStatuses(state)),[revision,setRevision]=useState(0)
 if(!managesSupervisionStatuses(state,me))return null
 return <><Button size="sm" variant="outline" onClick={()=>{setDraft(supervisionStatuses(state).map(x=>({...x})));setRevision(state.supervisionWorkflows?.office?.revision??0);setOpen(true)}}>مدیریت وضعیت‌های نظارت</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>تعریف مراحل نظارت کارگاهی</DialogTitle><DialogDescription>نام، ترتیب، رنگ و عملکرد مراحل را تغییر دهید. حذف وضعیتِ در حال استفاده نیازمند انتقال موارد آن است. تغییر عملکرد روی زمان شروع/پایان و گزارش پیشرفت اثر می‌گذارد.</DialogDescription></DialogHeader><div className="grid gap-3">{draft.map((x,i)=><fieldset key={x.id} className="flex flex-wrap gap-2 rounded-lg border p-2"><legend>مرحله {i+1}</legend><input aria-label={`نام مرحله ${i+1}`} className={field} maxLength={80} value={x.name} onChange={e=>setDraft(draft.map(s=>s.id===x.id?{...s,name:e.target.value}:s))}/><select aria-label={`عملکرد مرحله ${i+1}`} className={field} value={x.phase} onChange={e=>setDraft(draft.map(s=>s.id===x.id?{...s,phase:e.target.value as FlowState}:s))}>{FLOW_ORDER.map(f=><option key={f} value={f}>{FLOW_FA[f]}</option>)}</select><input type="color" aria-label={`رنگ مرحله ${i+1}`} value={x.color} onChange={e=>setDraft(draft.map(s=>s.id===x.id?{...s,color:e.target.value}:s))}/><Button size="sm" variant="outline" disabled={!i} onClick={()=>{const a=[...draft];[a[i-1],a[i]]=[a[i],a[i-1]];setDraft(a)}}>بالاتر</Button><Button size="sm" variant="ghost" onClick={()=>setDraft(draft.filter(s=>s.id!==x.id))}>حذف مرحله</Button></fieldset>)}</div><Button variant="outline" onClick={()=>setDraft([...draft,{id:newWorkspaceId(),name:'مرحله جدید',phase:'in_progress',color:'#2563eb'}])}>افزودن مرحله</Button><Button disabled={busy} onClick={async()=>{if(await save({type:'supervisionWorkflow',statuses:draft,revision}))setOpen(false)}}>ذخیره مراحل نظارت</Button></DialogContent></Dialog></>
}
export function SupervisionStatusSelect({task}:{task:Task}){
 const {state,me}=useStore(),{save,busy}=useWorkspaceSave()
 if(task.kind!=='supervision')return null
 const status=supervisionStatus(state,task)
 return <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border px-2 py-1 text-xs" style={{borderColor:status.color,color:status.color}}>{status.name}</span>{managesSupervisionStatuses(state,me)&&<label className="text-xs">تغییر وضعیت نظارت <select aria-label="تغییر وضعیت نظارت" className={field} disabled={busy} value={status.id} onChange={e=>void save({type:'supervisionStatus',taskId:task.id,statusId:e.target.value})}>{supervisionStatuses(state).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}</div>
}
