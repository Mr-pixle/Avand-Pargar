import { useState } from 'react'
import { AlarmClockPlus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from './ui/dialog'
import { fromTehranInput,newWorkspaceId,useWorkspaceSave } from '@/lib/useWorkspaceSave'
export function QuickReminder(){
  const [open,setOpen]=useState(false),[id,setId]=useState(''),{save,busy}=useWorkspaceSave()
  return <><button className="key key-surface inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-label="یادآوری تازه" title="یادآوری تازه" onClick={()=>{setId(newWorkspaceId());setOpen(true)}}><AlarmClockPlus className="h-4 w-4"/></button><Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v)}}><DialogContent dir="rtl"><DialogHeader><DialogTitle>یادآوری تازه</DialogTitle><DialogDescription>یادآوری خصوصی شما؛ تاریخ میلادی و ساعت تهران. در اعلان‌ها قابل پیگیری است.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(await save({type:'reminderSave',reminder:{id,title:String(f.get('title')??''),description:String(f.get('description')??''),dueAt:fromTehranInput(String(f.get('dueAt')??'')),status:'active'}}))setOpen(false)}}><label>عنوان<Input name="title" required maxLength={200}/></label><label>توضیحات<textarea name="description" maxLength={20000} rows={3} className="w-full rounded-md border bg-background p-2"/></label><label>تاریخ و ساعت تهران<Input name="dueAt" required type="datetime-local"/></label><div className="flex gap-2"><Button disabled={busy}>ذخیره یادآوری</Button><Button type="button" variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>لغو</Button></div></form></DialogContent></Dialog></>
}
