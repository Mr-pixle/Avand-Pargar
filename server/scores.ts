import { isDeepStrictEqual } from 'node:util'
import { isClosed, isFinTask, isFlowTask, isWorkItem, teamOfTask } from '../src/lib/domain'
import { addDays, isWeekend, startOfJMonth, startOfWeek } from '../src/lib/jalali'
import type { State } from '../src/lib/state'
import type { Task } from '../src/lib/types'
import type { ScoreRecord, ScoreReport } from '../src/lib/scores'

export function validDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
}
/** Signed (from,to] interval, using the same Thursday/Friday weekend as the app calendar. */
export function workingDays(from: string, to: string, holidays: Set<string>): number {
  if (from > to) return -workingDays(to, from, holidays)
  let count = 0
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (!isWeekend(d) && !holidays.has(d)) count++
  return count
}
export function taskScore(t: Task, holidays: Set<string>): Pick<ScoreRecord, 'score' | 'error' | 'duration' | 'delta'> {
  if (!validDate(t.actualStart)) return { score: null, error: 'شروع واقعی ثبت نشده یا نامعتبر است.' }
  if (!validDate(t.due)) return { score: null, error: 'سررسید ثبت نشده یا نامعتبر است.' }
  if (!validDate(t.actualFinish)) return { score: null, error: 'پایان واقعی ثبت نشده یا نامعتبر است.' }
  if (t.actualFinish < t.actualStart) return { score: null, error: 'پایان واقعی پیش از شروع واقعی است.' }
  if (t.due <= t.actualStart) return { score: null, error: 'سررسید باید پس از شروع واقعی باشد.' }
  const duration = workingDays(t.actualStart, t.due, holidays)
  if (duration <= 0) return { score: null, error: 'بین شروع واقعی و سررسید روز کاری وجود ندارد.' }
  const delta = workingDays(t.due, t.actualFinish, holidays)
  return { score: 60 * (1 - delta / duration), duration, delta }
}
const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
const valid = (rows: ScoreRecord[]) => rows.filter((r) => r.score !== null)
const avgRows = (rows: ScoreRecord[]) => average(valid(rows).map((r) => r.score!))

/** Rebuild the small materialized projection on every transaction (including sync, calendar and membership edits).
 * Stable identities prevent needless DB writes/SSE deltas. Original tasks and historical ledger are untouched. */
export function reconcileScores(s: State): Record<string, ScoreRecord> {
  const out: Record<string, ScoreRecord> = {}, holidays = new Set(s.holidays.map((h) => h.date))
  const put = (r: ScoreRecord) => { const normalized = JSON.parse(JSON.stringify(r)) as ScoreRecord; const old = s.scores?.[r.id]; out[r.id] = old && isDeepStrictEqual(old, normalized) ? old : normalized }
  for (const t of Object.values(s.tasks)) {
    if (t.removedFromMdr || isFinTask(t) || !(isWorkItem(t) || isFlowTask(t)) || !isClosed(s, t)) continue
    put({ id: `task:${t.id}`, version: 2, kind: 'task', taskId: t.id, userId: t.assigneeUserId,
      teamId: teamOfTask(s, t) ?? undefined, projectId: t.projectId, count: 1,
      actualStart: t.actualStart, due: t.due, actualFinish: t.actualFinish, ...taskScore(t, holidays) })
  }
  const rows = Object.values(out)
  for (const u of s.users) {
    const tasks = valid(rows.filter((r) => r.userId === u.id))
    put({ id: `user:${u.id}`, version: 2, kind: 'user', userId: u.id, teamId: u.teamId, score: avgRows(tasks), count: tasks.length })
  }
  for (const team of s.teams) {
    const users = s.users.filter((u) => u.teamId === team.id && u.status === 'active').map((u) => out[`user:${u.id}`])
    put({ id: `team:${team.id}`, version: 2, kind: 'team', teamId: team.id, score: avgRows(users), count: valid(users).length })
    for (const project of s.projects) {
      const tasks = valid(rows.filter((r) => r.teamId === team.id && r.projectId === project.id))
      put({ id: `projectTeam:${project.id}:${team.id}`, version: 2, kind: 'projectTeam', teamId: team.id, projectId: project.id, score: avgRows(tasks), count: tasks.length })
    }
  }
  return out
}

/** Filtered reports and chart averages are also computed only on the server. */
export function scoreReport(rows: ScoreRecord[], period: 'week' | 'month' = 'week'): ScoreReport {
  const tasks = valid(rows), users = [...new Set(tasks.map((r) => r.userId).filter(Boolean))]
  const ranking: ScoreRecord[] = users.map((userId) => {
    const own = tasks.filter((r) => r.userId === userId)
    return { id: `user:${userId}`, version: 2, kind: 'user', userId, score: avgRows(own), count: own.length }
  })
  ranking.sort((a, b) => b.score! - a.score!)
  const groups = new Map<string, ScoreRecord[]>()
  for (const r of tasks) {
    const key = period === 'month' ? startOfJMonth(r.actualFinish!) : startOfWeek(r.actualFinish!)
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return { rows, average: avgRows(tasks), count: tasks.length, invalid: rows.length - tasks.length,
    early: tasks.filter((r) => r.delta! < 0).length, late: tasks.filter((r) => r.delta! > 0).length, ontime: tasks.filter((r) => r.delta === 0).length,
    ranking, trend: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, rr]) => ({ date, score: avgRows(rr)!, count: rr.length })) }
}
