import {newId} from '@/lib/id'
import {teamCode,TEAM_COLORS} from '@/lib/brand'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useStore } from '@/lib/store'
import { guard } from '@/lib/policy'
import type { TeamKind } from '@/lib/types'
import type { Action } from '@/lib/state'
import { toast } from 'sonner'

const KINDS: Record<TeamKind, string> = { fixed: 'ثابت', phase1: 'CD', phase2: 'DD', revit: 'DD / Revit', other: 'مستقل', supervision: 'CA', management: 'MG' }
const selectClass = 'h-9 rounded-md border bg-background px-2 text-[13px]'

export function TeamsAdmin() {
  const { state, dispatch, can } = useStore()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TeamKind>('other')
  const [editing, setEditing] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const send = (a: Action) => {
    const reason = guard(state, a)
    if (reason) { toast.error(reason); return false }
    dispatch(a); return true
  }
  const save = () => {
    const a: Action = editing ? { type: 'teamUpdate', id: editing, patch: { name, kind } } : { type: 'teamAdd', team: { id: `team-${newId()}`, name, kind } }
    if (send(a)) { setEditing(null); setName(''); setKind('other') }
  }
  return <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">تیم سازمانی از مسئولیت‌های پروژه مستقل است. هر نفر یک تیم سازمانی دارد؛ جابه‌جایی اعضا، نقش ثبت‌شدهٔ آن‌ها در پروژه‌ها را تغییر نمی‌دهد. بایگانی تیم سوابق آن را نگه می‌دارد.</p>
    {can.perm('users.manage') && <form className="glass-card flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => { e.preventDefault(); save() }}>
      <div className="min-w-48 flex-1"><Label htmlFor="team-name">نام تیم</Label><Input id="team-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label htmlFor="team-kind">نوع تیم</Label><select id="team-kind" className={selectClass + ' block'} value={kind} onChange={(e) => setKind(e.target.value as TeamKind)}>{Object.entries(KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></div>
      <Button type="submit"><Plus className="h-4 w-4" />{editing ? 'ذخیره تیم' : 'ایجاد تیم'}</Button>
      {editing && <Button variant="ghost" type="button" onClick={() => { setEditing(null); setName('') }}>انصراف</Button>}
    </form>}
    <div className="grid gap-3 md:grid-cols-2">{Object.keys(TEAM_COLORS).map(code=><fieldset key={code} className="rounded-xl border p-3"><legend className="px-2 font-semibold">{code}</legend>{state.teams.filter(t=>teamCode(t)===code).map((t) => <section key={t.id} className="glass-card p-4">
      <div className="flex items-center justify-between gap-2"><div><h3 className="font-semibold">{t.name}{t.archived ? ' — بایگانی' : ''}</h3><p className="text-xs text-muted-foreground">{KINDS[t.kind]} · {state.users.filter((u) => u.teamId === t.id).length} عضو</p></div>
        {can.perm('users.manage') && <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setEditing(t.id); setName(t.name); setKind(t.kind) }}>ویرایش {t.name}</Button><Button size="sm" variant="ghost" onClick={() => send({ type: 'teamArchive', id: t.id, archived: !t.archived })}>{t.archived ? 'فعال‌سازی' : 'بایگانی'}</Button></div>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{state.users.filter((u) => u.teamId === t.id).map((u) => u.name).join('، ') || 'بدون عضو'}</p>
    </section>)}</fieldset>)}</div>
    <section className="glass-card p-4"><h3 className="mb-3 font-semibold">افزودن، جابه‌جایی یا خروج اعضا از تیم</h3>
      <Input aria-label="جستجوی اعضای تیم" placeholder="نام یا شناسه کاربر" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 max-h-96 divide-y overflow-auto">{state.users.filter((u) => u.status !== 'pending' && (!q || u.name.includes(q) || u.username.includes(q))).map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{u.name} <bdi className="text-xs text-muted-foreground">@{u.username}</bdi></span><select className={selectClass} aria-label={`تیم سازمانی ${u.username}`} disabled={!can.perm('users.manage')} value={u.teamId} onChange={(e) => send({ type: 'teamMember', userId: u.id, teamId: e.target.value })}><option value="">بدون تیم</option>{state.teams.filter((t) => !t.archived || t.id === u.teamId).map((t) => <option key={t.id} value={t.id} disabled={t.archived}>{t.name}</option>)}</select></div>)}</div>
    </section>
  </div>
}
