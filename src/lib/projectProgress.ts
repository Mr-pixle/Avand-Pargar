import type { ProjectStage, Task } from './types'
import type { State } from './state'
import { isWorkItem, taskProgress } from './domain'

export const PROJECT_STAGES: readonly ProjectStage[] = ['studies', 'concept', 'phase1_execution', 'municipality', 'coordination', 'interior', 'phase2_preliminary', 'phase2']
export const STAGE_FA: Record<ProjectStage, string> = {
  studies: 'مطالعات پروژه', concept: 'طرح مفهومی پروژه', phase1_execution: 'طراحی فاز ۱ اجرایی', municipality: 'شهرداری',
  coordination: 'هماهنگی با سایر دیسیپلین‌ها', interior: 'طراحی داخلی', phase2_preliminary: 'طراحی فاز ۲ مقدماتی', phase2: 'طراحی فاز ۲',
}
const norm = (s: string) => s.replace(/[ي]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').replace(/[1١]/g, '۱').replace(/[2٢]/g, '۲').trim()
/** Conservative migration/import inference: ambiguous combined headings stay unclassified. */
export function stageFromName(name: string): ProjectStage | undefined {
  const s = norm(name)
  const found: ProjectStage[] = []
  if (/مطالعات/.test(s)) found.push('studies')
  if (/مفهومی|کانسپت/.test(s)) found.push('concept')
  if (/فاز\s*۱.*اجرایی/.test(s)) found.push('phase1_execution')
  if (/شهرداری/.test(s)) found.push('municipality')
  if (/هماهنگی.*دیسیپلین|هماهنگی.*رشته|clash/i.test(s)) found.push('coordination')
  if (/طراحی داخلی/.test(s)) found.push('interior')
  if (/فاز\s*۲.*مقدماتی/.test(s)) found.push('phase2_preliminary')
  else if (/فاز\s*۲|نقشه‌های اجرایی|نقشه های اجرایی/.test(s)) found.push('phase2')
  return found.length === 1 ? found[0] : undefined
}
export function taskStage(tasks: Record<string, Task>, t: Task): ProjectStage | undefined {
  const seen = new Set<string>()
  let cur: Task | undefined = t
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (cur.projectStage) return cur.projectStage
    const inferred = stageFromName(cur.name)
    if (inferred) return inferred
    cur = cur.parentId ? tasks[cur.parentId] : undefined
  }
  return undefined
}
/** Documents and independent manual work items contribute once; their manual checklist subtasks do not add weight. */
export function projectWorkItems(tasks: Record<string, Task>, pid: string) {
  return Object.values(tasks).filter((t) => {
    if (t.projectId !== pid || !isWorkItem(t) || t.removedFromMdr) return false
    const seen = new Set([t.id])
    let p = t.parentId ? tasks[t.parentId] : undefined
    while (p && !seen.has(p.id)) {
      if (isWorkItem(p) || p.removedFromMdr) return false
      seen.add(p.id); p = p.parentId ? tasks[p.parentId] : undefined
    }
    return true
  })
}
export function projectProgress(state: Pick<State, 'tasks' | 'statusSets'>, pid: string) {
  const items = projectWorkItems(state.tasks, pid)
  const classified = items.filter((t) => !!taskStage(state.tasks, t))
  // Use one comparable unit throughout a project; do not mix MDR percentages with person-hours.
  const weighted = classified.length > 0 && classified.every((t) => Number.isFinite(t.weight) && t.weight! >= 0) && classified.some((t) => t.weight! > 0)
  const effort = !weighted && classified.length > 0 && classified.every((t) => Number.isFinite(t.estimation) && t.estimation! > 0)
  const mode = weighted ? 'weight' : effort ? 'effort' : 'equal'
  const weight = (t: Task) => weighted ? t.weight! : effort ? t.estimation! : 1
  const summarize = (tasks: Task[]) => {
    const sum = tasks.reduce((n, t) => n + weight(t), 0)
    return { count: tasks.length, weight: sum, progress: sum > 0 ? tasks.reduce((n, t) => n + taskProgress(state, t) * weight(t), 0) / sum : null }
  }
  return { mode, total: summarize(classified).progress, totalCount: items.length, classifiedCount: classified.length,
    unclassified: items.filter((t) => !taskStage(state.tasks, t)),
    stages: PROJECT_STAGES.map((stage) => ({ stage, ...summarize(classified.filter((t) => taskStage(state.tasks, t) === stage)) })),
  }
}
