import { useState, type ReactNode } from 'react'
import { Button } from './ui/button'
import { TODAY } from '@/lib/seed'
import { addDays,addJMonths,J_MONTHS,startOfJMonth,startOfWeek,toJalali,WEEKDAYS_SHORT } from '@/lib/jalali'
/** Shared date layout only; visits and issues retain their own records and workflows. */
export function DateBoard<T>({items,dateOf,render}:{items:T[];dateOf:(x:T)=>string;render:(x:T)=>ReactNode}){
  const [month,setMonth]=useState(startOfJMonth(TODAY)),j=toJalali(month),first=startOfWeek(month)
  return <div className="glass-card p-3"><div className="mb-3 flex items-center justify-between"><Button variant="outline" onClick={()=>setMonth(addJMonths(month,-1))}>ماه قبل</Button><span>{J_MONTHS[j.jm-1]} {j.jy}</span><Button variant="outline" onClick={()=>setMonth(addJMonths(month,1))}>ماه بعد</Button></div><div className="overflow-x-auto"><div className="grid min-w-[680px] grid-cols-7">{WEEKDAYS_SHORT.map(d=><div key={d} className="p-2 text-center text-xs">{d}</div>)}{Array.from({length:42},(_,i)=>addDays(first,i)).map(day=><section key={day} className={`min-h-28 border p-1 ${toJalali(day).jm!==j.jm?'bg-muted/40':''}`} aria-label={day}><div className="p-1 text-xs">{toJalali(day).jd}</div><div className="grid gap-1">{items.filter(x=>dateOf(x)===day).map(render)}</div></section>)}</div></div>{items.some(x=>!dateOf(x))&&<div className="mt-3 border-t pt-2"><h3 className="mb-2 text-sm">بدون تاریخ</h3>{items.filter(x=>!dateOf(x)).map(render)}</div>}</div>
}
