import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useStore } from '@/lib/store'
import { defaultDeadlineRules } from '@/lib/office'
import { useWorkspaceSave } from '@/lib/useWorkspaceSave'
export function DeadlineSettings(){
  const {state,me}=useStore(),{save,busy}=useWorkspaceSave()
  const [rules,setRules]=useState(()=>state.deadlinePreferences[me.id]?.rules??defaultDeadlineRules())
  const [units,setUnits]=useState(['hours','hours','hours','hours'])
  return <section className="glass-card p-4" aria-label="تنظیمات اعلان"><h2 className="font-semibold">تنظیمات اعلان (Notification Settings)</h2><p className="my-2 text-xs text-muted-foreground">هشدار شخصی پیش از پایان روز ددلاین به وقت تهران؛ تخمین نامشخص در گروه اول است. بازه‌ها برای مقادیر اعشاری نیز پیوسته‌اند.</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{['۰ تا ۲۰ ساعت','بیش از ۲۰ تا ۵۰ ساعت','بیش از ۵۰ تا ۱۰۰ ساعت','بیش از ۱۰۰ ساعت'].map((label,i)=><fieldset key={i} className="rounded-xl border p-3"><legend className="px-1 text-sm">{label}</legend><label className="flex gap-2 text-sm"><input type="checkbox" checked={rules[i].enabled} onChange={e=>setRules(r=>r.map((x,j)=>i===j?{...x,enabled:e.target.checked}:x))}/>هشدار فعال</label><label className="mt-2 block text-xs">زمان پیش از ددلاین<Input aria-label={`زمان هشدار گروه ${i+1}`} type="number" min={0} max={units[i]==='days'?365:8760} step="any" disabled={!rules[i].enabled} value={rules[i].hours/(units[i]==='days'?24:1)} onChange={e=>setRules(r=>r.map((x,j)=>i===j?{...x,hours:Number(e.target.value)*(units[i]==='days'?24:1)}:x))}/></label><select aria-label={`واحد هشدار گروه ${i+1}`} className="mt-2 w-full rounded-md border bg-background p-2 text-sm" value={units[i]} onChange={e=>setUnits(u=>u.map((x,j)=>j===i?e.target.value:x))}><option value="hours">ساعت</option><option value="days">روز</option></select></fieldset>)}</div><Button className="mt-3" disabled={busy} onClick={()=>void save({type:'deadlineSettings',rules})}>ذخیره تنظیمات اعلان</Button></section>
}
