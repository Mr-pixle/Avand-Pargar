import {scorePresentation} from '@/lib/scores'
import { useEffect, useState } from 'react'
import { useFmt, useStore } from '@/lib/store'
import { api, SERVER_MODE } from '@/lib/remote'
import { SCORE_FORMULA, type ScoreRecord, type ScoreReport } from '@/lib/scores'
import { Empty } from './common'

export function useSigned() { const { n } = useFmt(); return (x: number, frac = 1) => `\u2066${x > 0 ? '+' : x < 0 ? '−' : ''}${n(Math.abs(x), frac)}\u2069` }
export const deltaCls = (x: number) => x > 0 ? 'text-leaf-ink' : x < 0 ? 'text-destructive' : 'text-muted-foreground'
export function ScoreValue({ value }: { value: number | null | undefined }) {
 const {n}=useFmt(),p=scorePresentation(value)
 if(!p)return <span className="num text-muted-foreground">N/A</span>
 return <span className="inline-flex min-w-[88px] flex-col gap-1 align-middle text-xs" dir="ltr" style={{color:`var(--score-${p.tone})`}}><span className="num font-semibold">{n(value!,2)} <span className="text-muted-foreground">/ {n(100)}</span></span><span role="meter" aria-label="امتیاز در مقیاس ۱۰۰" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.width} aria-valuetext={`امتیاز واقعی ${value}؛ مقیاس نمایش ۱۰۰`} className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{width:`${p.width}%`,background:'currentColor'}}/></span></span>
}
export function useScoreReport(filters: Record<string, string | undefined>) {
  const { state } = useStore(), query = new URLSearchParams(Object.entries(filters).filter(([,v]) => !!v) as [string,string][]).toString()
  const [result, setResult] = useState<{query: string; report?: ScoreReport; error?: string}>({query: ''})
  useEffect(() => {
    let cancelled = false
    if (!SERVER_MODE) { setResult({query,error:'محاسبه امتیاز به اتصال سرور نیاز دارد.'}); return }
    setResult({query})
    api<ScoreReport>(`/api/scores/report?${query}`).then(report => { if(!cancelled) setResult({query,report}) }).catch(e => { if(!cancelled) setResult({query,error:String(e.message)}) })
    return () => { cancelled = true }
  }, [query, state.scores])
  return result.query === query ? result : {query}
}
export function UserScore({userId}: {userId: string}) {
  const {state} = useStore(), r = state.scores?.[`user:${userId}`]
  return <div className="glass-card p-3 text-sm">امتیاز کاربر: <b><ScoreValue value={r?.score}/></b><span className="ms-2 text-xs text-muted-foreground">میانگین تسک‌های تکمیل‌شده معتبر</span></div>
}
export function TaskScore({taskId}: {taskId: string}) {
  const {state,me,can} = useStore(), {n} = useFmt(), t = state.tasks[taskId], r = state.scores?.[`task:${taskId}`]
  if (!t || (!can.perm('points.manage') && t.assigneeUserId !== me.id)) return null
  return <section className="mt-3 rounded-xl border bg-background/45 p-3"><div className="eyebrow">امتیاز تسک</div><b className="text-xl"><ScoreValue value={r?.score}/></b><p className="text-xs text-muted-foreground">{r?.error ?? (!r ? 'پس از تکمیل و ثبت پایان واقعی، روی سرور محاسبه می‌شود.' : `۶۰ × (۱ − (${n(r.delta!,2)}) ÷ ${n(r.duration!,2)})؛ اختلاف‌ها بر حسب روز کاری`)}</p></section>
}
export function ScoreTiles({report:r}: {report:ScoreReport}) {
 const {n} = useFmt()
 return <div className="grid grid-cols-2 overflow-hidden glass-card lg:grid-cols-4">{[
 ['میانگین امتیاز تسک‌ها',<ScoreValue value={r.average}/>],['تسک معتبر',n(r.count)],['تاریخ نامعتبر / ناقص',n(r.invalid)],['زودتر / سر موعد / دیرتر',`${n(r.early)} / ${n(r.ontime)} / ${n(r.late)}`]
 ].map(([label,value],i)=><div className="border-s p-4" key={i}><div className="eyebrow">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>)}</div>
}
export function ScoreTasks({rows}: {rows:ScoreRecord[]}) {
 const {state,dispatch,can,userById,teamById} = useStore(), {d,n} = useFmt()
 if(!rows.length) return <Empty title="تسک تکمیل‌شده‌ای در این محدوده نیست"/>
 return <div className="scroll-x thin-scroll rounded-xl border"><table className="w-full min-w-[740px] text-xs"><thead><tr>{['تسک','مسئول / گروه','شروع واقعی','سررسید','پایان واقعی','امتیاز / دلیل'].map(x=><th className="p-3 text-start" key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=>{const t=state.tasks[r.taskId!];return <tr key={r.id} className="border-t"><td className="p-3">{t && can.viewTask(t)?<button className="text-start hover:underline" onClick={()=>{dispatch({type:'openProfile',id:null});dispatch({type:'openTask',id:t.id})}}>{t.name}</button>:'تسک خارج از دسترسی'}</td><td className="p-3">{userById[r.userId??'']?.name??'بدون مسئول فردی'}<div className="text-muted-foreground">{teamById[r.teamId??'']?.name??'بدون گروه'}</div></td>{[r.actualStart,r.due,r.actualFinish].map((v,i)=><td key={i} className="num whitespace-nowrap p-3">{v?d(v):'—'}</td>)}<td className="p-3"><b><ScoreValue value={r.score}/></b><div className="text-muted-foreground">{r.error??`${n(r.duration!)} روز کاری برنامه، ${n(r.delta!)} روز کاری تأخیر (منفی: زودتر)`}</div></td></tr>})}</tbody></table></div>
}
export function MyPoints({userId}: {userId:string}) {
 const {report,error}=useScoreReport({user:userId})
 return <div className="flex flex-col gap-4"><p className="text-xs text-muted-foreground">{SCORE_FORMULA}؛ شنبه تا چهارشنبه، بدون تعطیلات ثبت‌شده در تقویم. سر موعد: ۶۰. امتیاز محدود نمی‌شود.</p>{error?<p role="alert">{error}</p>:!report?<p>در حال دریافت امتیازات…</p>:<><ScoreTiles report={report}/><ScoreTasks rows={report.rows}/></>}</div>
}
export function TeamScore({teamId}: {teamId:string}) {
 const {state,can,dispatch}=useStore(),{n}=useFmt(),r=state.scores?.[`team:${teamId}`], [open,setOpen]=useState(false)
 const {report,error}=useScoreReport({team:teamId})
 return <section className="glass-card p-4"><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">امتیاز کلی گروه: <ScoreValue value={r?.score}/></h2><span className="text-xs text-muted-foreground">میانگین امتیاز {n(r?.count??0)} عضو فعال دارای امتیاز؛ مستقل از امتیاز گروه در پروژه</span><button className="ms-auto text-sm underline" onClick={()=>setOpen(!open)}>جزئیات امتیاز</button></div>{open&&<div className="mt-4 space-y-3">{!can.perm('points.manage')&&<p className="text-xs text-muted-foreground">جزئیات فقط شامل تسک‌های خودتان است؛ امتیاز کلی گروه از تمام اعضای واجد شرایط محاسبه شده است.</p>}{error?<p role="alert">{error}</p>:report?<><div className="flex flex-wrap gap-3">{Object.values(state.scores??{}).filter(u=>u.kind==='user'&&u.teamId===teamId&&u.score!==null&&state.users.find(x=>x.id===u.userId)?.status==='active').map(u=><button className="underline" key={u.id} onClick={()=>dispatch({type:"openProfile",id:u.userId!,tab:"points"})}>{state.users.find(x=>x.id===u.userId)?.name}: <ScoreValue value={u.score}/></button>)}</div><ScoreTasks rows={report.rows.filter(r=>state.users.some(u=>u.id===r.userId&&u.status==='active'&&u.teamId===teamId))}/></>:<p>در حال دریافت…</p>}</div>}</section>
}
