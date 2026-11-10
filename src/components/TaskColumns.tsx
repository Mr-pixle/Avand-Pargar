import {taskColorStyle} from '@/lib/brand'
import {TODAY} from '@/lib/seed'
import {useState} from 'react'
import type {Task} from '@/lib/types'
import {useStore,useFmt,statusOf} from '@/lib/store'
import {L,type FieldKey} from '@/lib/taskFields'
import {PriorityChip} from './Priority'
import {Assignee,StatusPill} from './common'
export const COLUMN_KEYS:FieldKey[]=['priority','docNumber','project','pkg','floor','assignee','team','reviewer','participants','estimation','baselineEstimation','start','due','baselineDue','planIssue','status','progress','actualStart','actualFinish','weight','description']
export const LIST_COLUMNS:FieldKey[]=['priority','project','pkg','floor','assignee','estimation','start','due','status']
export const TREE_COLUMNS:FieldKey[]=['priority','estimation','start','due','status']
export function useTaskColumns(scope:string,view:string){
 const {me}=useStore(),key=`taraz-columns:${me.id}:${scope}:${view}`
 const defaults=view==='tree'?TREE_COLUMNS:LIST_COLUMNS
 const [cache,setCache]=useState<Record<string,FieldKey[]>>({})
 let stored:FieldKey[]|undefined
 try{const v=JSON.parse(localStorage.getItem(key)??'null');if(Array.isArray(v))stored=v.filter(x=>COLUMN_KEYS.includes(x))}catch{}
 const columns=cache[key]??stored??defaults
 const setColumns=(next:FieldKey[])=>{setCache(s=>({...s,[key]:next}));try{localStorage.setItem(key,JSON.stringify(next))}catch{}}
 return {columns,setColumns,defaults}
}
export function ColumnPicker({columns,onChange,defaults,hideProject}:{columns:FieldKey[];onChange:(c:FieldKey[])=>void;defaults:FieldKey[];hideProject?:boolean}){
 return <details className="relative"><summary className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-xs">ستون‌های نمایشی</summary><div className="absolute start-0 z-30 mt-2 grid max-h-80 w-64 gap-2 overflow-y-auto rounded-xl border bg-background p-3 shadow-lg"><label className="flex gap-2 text-xs"><input type="checkbox" checked disabled/>عنوان (ثابت)</label>{COLUMN_KEYS.filter(k=>!hideProject||k!=='project').map(k=><label className="flex gap-2 text-xs" key={k}><input type="checkbox" checked={columns.includes(k)} onChange={e=>onChange(e.target.checked?COLUMN_KEYS.filter(c=>c===k||columns.includes(c)):columns.filter(c=>c!==k))}/>{L(k)}</label>)}<button className="rounded border p-1 text-xs" onClick={()=>onChange(defaults)}>بازگشت به ستون‌های پیش‌فرض</button></div></details>
}
export function TaskColumn({task:t,column:k,tree=false}:{task:Task;column:FieldKey;tree?:boolean}){
 const store=useStore(),{state,userById,teamById,projectById,roll,teamOf}=store,{d,n,pct}=useFmt(),r=roll[t.id],work=t.kind==='manual'||t.kind==='document'
 if(k==='priority')return <PriorityChip p={t.priority}/>
 if(k==='assignee')return <Assignee task={t}/>
 if(k==='status')return tree&&!work?<span>{n(r?.done??0)}/{n(r?.items??0)} صادر</span>:<StatusPill task={t} status={statusOf(state, t)}/>
 if(k==='progress')return <span className="rounded px-2 py-1" style={work?taskColorStyle(state,t):undefined}>{pct(tree?r?.progress??0:statusOf(state,t)?.progress??0)}</span>
 if(k==='project')return <>{projectById[t.projectId]?.name??'—'}</>
 if(k==='team')return <>{teamById[teamOf(t)??'']?.name??'—'}</>
 if(k==='reviewer')return <>{userById[t.reviewerId??'']?.name??'—'}</>
 if(k==='participants')return <>{t.participantIds?.map(id=>userById[id]?.name??id).join('، ')||'—'}</>
 if(k==='estimation')return <>{n(tree?r?.est??0:t.estimation??0)}</>
 if(['start','due','baselineDue','planIssue','actualStart','actualFinish'].includes(k))return <span className={k==='due'&&t.due&&t.due<TODAY&&statusOf(state,t)?.category!=='done'?'font-semibold text-destructive':undefined}>{d(tree&&k==='start'?r?.start:tree&&k==='due'?r?.due:t[k as keyof Task] as string|undefined)}</span>
 const parent=t.kind==='manual'&&t.parentId?state.tasks[t.parentId]:undefined
 const value=(k==='pkg'||k==='floor')?t[k]??parent?.[k]:t[k as keyof Task]
 return <span className="line-clamp-2" title={String(value??'')}>{value==null?'—':typeof value==='number'?n(value):String(value)}</span>
}
