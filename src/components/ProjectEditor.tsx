import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { useStore } from '@/lib/store'
import { guard } from '@/lib/policy'
import { emptyStaffing, SCOPE_FA, scopeTeam, staffingOf, WORK_SCOPES } from '@/lib/organization'
import { mdrHref } from '@/lib/mdr'
import type { Project, ProjectStaffing, WorkScope } from '@/lib/types'
import type { Action } from '@/lib/state'

const selectClass = 'mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm'
export function ProjectEditor({ project, open, onOpenChange }: { project?: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const [f, setF] = useState({ code: project?.code ?? '', name: project?.name ?? '', type: project?.type ?? 'مسکونی', phase1TeamId: project?.phase1TeamId ?? '', phase2TeamId: project?.phase2TeamId ?? '', revitTeamId: project?.revitTeamId ?? '', mdrUrl: project?.mdrUrl ?? '', mdrTab: project?.mdrTab ?? 'MDR', teamIds: project?.teamIds ?? [] })
  const [staffing, setStaffing] = useState<ProjectStaffing>(() => project ? structuredClone(staffingOf(project, state.users)) : emptyStaffing())
  const [q, setQ] = useState('')
  const people = state.users.filter((u) => u.status !== 'pending' && u.status !== 'rejected')
  const pickPerson = (label: string, value: string | undefined, change: (value?: string) => void) => <div><Label>{label}</Label><select aria-label={label} className={selectClass} value={value ?? ''} onChange={(e) => change(e.target.value || undefined)}><option value="">تعیین نشده</option>{people.map((u) => <option key={u.id} value={u.id}>{u.name} (@{u.username}){u.status !== 'active' ? ' — غیرفعال' : ''}</option>)}</select></div>
  const teamField = (scope: WorkScope) => {
    const key = scope === 'phase1' ? 'phase1TeamId' : scope === 'phase2' ? 'phase2TeamId' : 'revitTeamId'
    return <div key={key}><Label htmlFor={`project-${key}`}>تیم سازمانی {SCOPE_FA[scope]}</Label><select id={`project-${key}`} className={selectClass} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}><option value="">انتخاب تیم</option>{state.teams.filter((t) => !t.archived || t.id === f[key]).map((t) => <option key={t.id} value={t.id} disabled={t.archived}>{t.name}</option>)}</select></div>
  }
  const submit = () => {
    const code = f.code.trim().toUpperCase()
    const url = mdrHref(f.mdrUrl)
    // Existing sample projects can be edited without replacing an intentionally missing MDR.
    if ((!project || f.mdrUrl !== project.mdrUrl) && !url) { toast.error('لینک معتبر Google Sheet پروژه لازم است.'); return }
    const values = { name: f.name.trim(), type: f.type.trim(), phase1TeamId: f.phase1TeamId, phase2TeamId: f.phase2TeamId, revitTeamId: f.revitTeamId, teamIds: f.teamIds, staffing, mdrTab: f.mdrTab.trim() }
    const action: Action = project ? { type: 'projectUpdate', id: project.id, patch: { ...values, ...(f.mdrUrl !== project.mdrUrl ? { mdrUrl: url! } : {}) } } : { type: 'projectAdd', project: { ...values, id: code, code, mdrUrl: url! } }
    const error = guard(state, action)
    if (error) { toast.error(error); return }
    dispatch(action); onOpenChange(false)
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader className="text-start"><DialogTitle>{project ? 'ویرایش مشخصات و مسئولیت‌های پروژه' : 'تعریف پروژه'}</DialogTitle><DialogDescription>مسئولیت‌ها فقط متعلق به همین پروژه‌اند. انتخاب مدیر، طراح و کمک‌طراح مستقل از نقش و تیم سازمانی است. تغییر تیم سازمانی، فهرست افراد پروژه را خودکار تغییر نمی‌دهد.</DialogDescription></DialogHeader>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><Label htmlFor="np-code">کد پروژه</Label><Input id="np-code" dir="ltr" value={f.code} disabled={!!project} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
      <div><Label htmlFor="np-name">نام پروژه</Label><Input id="np-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label htmlFor="np-type">نوع پروژه</Label><Input id="np-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} /></div>
      {WORK_SCOPES.map(teamField)}
      <div className="sm:col-span-2"><Label htmlFor="np-url">لینک MDR</Label><Input id="np-url" dir="ltr" value={f.mdrUrl} onChange={(e) => setF({ ...f, mdrUrl: e.target.value })} /></div>
      <div><Label htmlFor="np-tab">نام برگه MDR</Label><Input id="np-tab" value={f.mdrTab} onChange={(e) => setF({ ...f, mdrTab: e.target.value })} /></div>
      {pickPerson('معمار ارشد پروژه', staffing.chiefArchitectId, (id) => setStaffing({ ...staffing, chiefArchitectId: id }))}
    </div>
    <fieldset className="rounded-xl border p-3"><legend className="px-1 text-sm font-semibold">سایر تیم‌های مرتبط</legend><div className="flex flex-wrap gap-3">{state.teams.filter((t) => !['management','revit'].includes(t.kind) && (!t.archived || f.teamIds.includes(t.id))).map((t) => <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.teamIds.includes(t.id)} onChange={(e) => setF({ ...f, teamIds: e.target.checked ? [...f.teamIds, t.id] : f.teamIds.filter((id) => id !== t.id) })} />{t.name}</label>)}</div></fieldset>
    <Input aria-label="جستجوی افراد پروژه" placeholder="جستجوی نام یا شناسه در فهرست طراحان و کمک‌طراحان" value={q} onChange={(e) => setQ(e.target.value)} />
    {WORK_SCOPES.map((scope) => <fieldset key={scope} className="rounded-xl border p-3"><legend className="px-1 font-semibold">مسئولیت‌های {SCOPE_FA[scope]}</legend>
      {pickPerson(`مدیر پروژه ${SCOPE_FA[scope]}`, staffing[scope].managerId, (id) => setStaffing({ ...staffing, [scope]: { ...staffing[scope], managerId: id } }))}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{(['designerIds', 'assistantIds'] as const).map((key) => <fieldset key={key}><legend className="mb-1 text-sm">{key === 'designerIds' ? 'طراحان' : 'کمک‌طراحان'} {SCOPE_FA[scope]} ({staffing[scope][key].length})</legend><div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">{people.filter((u) => !q || u.name.includes(q) || u.username.includes(q)).map((u) => <label key={u.id} className="flex items-center gap-2 text-sm"><input aria-label={`${key === 'designerIds' ? 'طراح' : 'کمک‌طراح'} ${SCOPE_FA[scope]} ${u.username}`} type="checkbox" checked={staffing[scope][key].includes(u.id)} onChange={(e) => setStaffing({ ...staffing, [scope]: { ...staffing[scope], [key]: e.target.checked ? [...staffing[scope][key], u.id] : staffing[scope][key].filter((id) => id !== u.id) } })} />{u.name}</label>)}</div></fieldset>)}</div>
    </fieldset>)}
    <DialogFooter className="gap-2 sm:justify-start"><Button onClick={submit}>{project ? 'ذخیره مشخصات پروژه' : 'تعریف پروژه'}</Button><Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function ProjectResponsibilities({ project }: { project: Project }) {
  const { state, userById, teamById } = useStore()
  const staff = staffingOf(project, state.users)
  const names = (ids: string[]) => ids.map((id) => userById[id]?.name ?? id).join('، ') || 'تعیین نشده'
  return <section className="glass-card p-4" aria-label="مسئولیت‌های پروژه"><h2 className="font-semibold">ساختار اجرایی پروژه</h2><p className="mt-2 text-sm">معمار ارشد: {staff.chiefArchitectId ? names([staff.chiefArchitectId]) : 'تعیین نشده'}</p><div className="mt-3 grid gap-4 md:grid-cols-3">{WORK_SCOPES.map((scope) => <div key={scope} className="rounded-xl border p-3 text-sm"><h3 className="font-semibold">{SCOPE_FA[scope]} · {teamById[scopeTeam(project, scope)]?.name ?? 'بدون تیم'}</h3><p className="mt-2">مدیر: {staff[scope].managerId ? names([staff[scope].managerId!]) : 'تعیین نشده'}</p><p className="mt-2">طراحان: {names(staff[scope].designerIds)}</p><p className="mt-2">کمک‌طراحان: {names(staff[scope].assistantIds)}</p></div>)}</div></section>
}
