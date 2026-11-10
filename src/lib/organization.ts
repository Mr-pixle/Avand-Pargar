import type { PhaseStaff, Project, ProjectStaffing, Task, User, WorkScope } from './types'

export const WORK_SCOPES: readonly WorkScope[] = ['phase1', 'phase2', 'revit']
export const SCOPE_FA: Record<WorkScope, string> = { phase1: 'CD', phase2: 'DD', revit: 'DD / Revit' }
export const emptyStaffing = (): ProjectStaffing => ({ phase1: { designerIds: [], assistantIds: [] }, phase2: { designerIds: [], assistantIds: [] }, revit: { designerIds: [], assistantIds: [] } })
export const scopeTeam = (p: Project, scope: WorkScope) => scope === 'phase1' ? p.phase1TeamId : scope === 'phase2' ? p.phase2TeamId : p.revitTeamId ?? 'rvt'
export const phasePeople = (s: PhaseStaff) => [...new Set([s.managerId, ...s.designerIds, ...s.assistantIds].filter((id): id is string => !!id))]
export const projectPeople = (p: Project) => p.staffing ? [...new Set([p.staffing.chiefArchitectId, ...WORK_SCOPES.flatMap((s) => phasePeople(p.staffing![s]))].filter((id): id is string => !!id))] : p.managerId ? [p.managerId] : []
export const managedScopes = (p: Project | undefined, userId: string) => p?.staffing ? WORK_SCOPES.filter((s) => p.staffing![s].managerId === userId) : []

/** One-time legacy snapshot. The prior project manager keeps their existing project-wide scope explicitly. */
export function staffingOf(p: Project, users: User[]): ProjectStaffing {
  if (p.staffing) return p.staffing
  const result = emptyStaffing()
  for (const scope of WORK_SCOPES) result[scope] = {
    ...(p.managerId ? { managerId: p.managerId } : {}),
    designerIds: users.filter((u) => u.teamId === scopeTeam(p, scope) && u.status === 'active').map((u) => u.id), assistantIds: [],
  }
  return result
}

/** Explicit task scope wins; otherwise inherit a scope from WBS, never infer authority from the assignee's current team. */
export function taskScope(tasks: Record<string, Task>, t: Task): WorkScope | undefined {
  const seen = new Set<string>()
  let cur: Task | undefined = t
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (cur.workScope) return cur.workScope
    if (['phase', 'stage', 'group', 'doctype'].includes(cur.kind) && /رویت|revit/i.test(cur.name)) return 'revit'
    if (cur.kind === 'phase') {
      if (/فاز\s*[۱1١]/.test(cur.name)) return 'phase1'
      if (/فاز\s*[۲2٢]/.test(cur.name)) return 'phase2'
      if (/رویت|revit/i.test(cur.name)) return 'revit'
    }
    cur = cur.parentId ? tasks[cur.parentId] : undefined
  }
  return undefined
}

export function staffingProblem(raw: unknown, users: User[]): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'ساختار مسئولیت‌های پروژه نامعتبر است.'
  const obj = raw as Record<string, unknown>
  if (Object.keys(obj).some((k) => ![...WORK_SCOPES, 'chiefArchitectId'].includes(k))) return 'مسئولیت ناشناخته است.'
  const valid = (id: unknown) => typeof id === 'string' && users.some((u) => u.id === id)
  if (obj.chiefArchitectId != null && !valid(obj.chiefArchitectId)) return 'معمار ارشد را از کاربران تعریف‌شده انتخاب کنید.'
  for (const scope of WORK_SCOPES) {
    const s = obj[scope] as Record<string, unknown> | undefined
    if (!s || typeof s !== 'object' || Array.isArray(s) || Object.keys(s).some((k) => !['managerId', 'designerIds', 'assistantIds'].includes(k))) return 'ساختار اعضای فاز نامعتبر است.'
    if (s.managerId != null && !valid(s.managerId)) return 'مدیر فاز باید از کاربران تعریف‌شده باشد.'
    for (const key of ['designerIds', 'assistantIds']) {
      const ids = s[key]
      if (!Array.isArray(ids) || ids.length > users.length || ids.some((id) => !valid(id)) || new Set(ids).size !== ids.length) return 'فهرست اعضای فاز نامعتبر یا تکراری است.'
    }
  }
  return null
}
