import { reconcileScores } from './scores'
// The authoritative state of the office, kept in memory and in PostgreSQL. Every change — a person's action or a job
// of the system — runs one at a time through the same guarded reducer as the browser, and is committed to the
// database in one transaction before anybody can read it.
import { reducer, type Action, type State } from '../src/lib/state'
import type { AuditEntry } from '../src/lib/types'
import { diffData, tx, writeChanges, type Db, type Tx } from './db'

export interface Outcome { denial?: string; state: State }

export class Core {
  version = 1
  private chain: Promise<unknown> = Promise.resolve()
  private listeners = new Set<(v: number) => void>()
  private seq = 0

  readonly db: Db
  state: State
  constructor(db: Db, state: State) { this.db = db; this.state = state }

  /** Runs fn alone: no other change starts until it has finished (and committed) */
  exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn)
    this.chain = run.catch(() => {})
    return run
  }

  subscribe(fn: (v: number) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn) }

  /** Writes the difference to the database and only then makes the new state the current one */
  async commit(next: State, extra?: (c: Tx) => Promise<void>) {
    const clean: State = { ...next, scores: reconcileScores(next), session: null, denial: null }
    // Keep the existing completion notifications/audit feature, now driven by authoritative results.
    // Initial migration is silent; historical business records are not rewritten.
    if (Object.keys(this.state.scores ?? {}).length) {
      const keys = new Set([...Object.keys(this.state.scores ?? {}), ...Object.keys(clean.scores ?? {})])
      for (const key of keys) {
        if (!key.startsWith('task:')) continue
        const before = this.state.scores?.[key], after = clean.scores?.[key]
        if (before === after || (before?.score === after?.score && before?.error === after?.error && before?.userId === after?.userId && before?.teamId === after?.teamId && before?.projectId === after?.projectId)) continue
        const taskId = (after ?? before)!.taskId!, at = new Date().toISOString(), id = `score-${Date.now().toString(36)}-${this.seq++}`
        const text = after ? after.error ?? `امتیاز جدید: ${after.score?.toFixed(2)}` : 'تسک دیگر در امتیاز محسوب نمی‌شود.'
        clean.audit = [{ id: `a-${id}`, at, userId: next.session ?? 'system', taskId, kind: 'points', text }, ...clean.audit]
        for (const userId of new Set([before?.userId, after?.userId].filter((u): u is string => !!u))) {
          clean.notifications = [{ id: `${id}-${userId}`, userId, at, kind: 'points', title: `امتیاز «${next.tasks[taskId]?.name ?? taskId}» به‌روز شد`, body: text, read: false, link: { type: 'page', page: 'mypoints' } }, ...clean.notifications]
        }
      }
    }
    const changes = diffData(this.state, clean)
    if (!changes.length && !extra) return
    await tx(this.db, async (c) => {
      await writeChanges(c, changes)
      if (extra) await extra(c)
    })
    this.state = clean
    this.version++
    for (const l of this.listeners) { try { l(this.version) } catch { /* a closed stream */ } }
  }

  /**
   * Applies an action as `userId` (null = the system itself). A refusal changes nothing but the AuditLog line the
   * reducer writes for it, which is committed like any other change.
   */
  dispatch(userId: string | null, action: Action, extra?: (c: Tx, next: State) => Promise<void>): Promise<Outcome> {
    return this.exclusive(async () => {
      const next = reducer({ ...this.state, session: userId, denial: null }, action)
      if (next.denial) {
        await this.commit(next)
        return { denial: next.denial.text, state: this.state }
      }
      await this.commit(next, extra ? (c) => extra(c, next) : undefined)
      return { state: this.state }
    })
  }

  /** A security or admin line written by the server itself (a forged request, a password reset) */
  audit(entry: Omit<AuditEntry, 'id' | 'at'>) {
    return this.exclusive(() => this.commit({ ...this.state, audit: [{ id: `a-srv-${Date.now().toString(36)}-${this.seq++}`, at: new Date().toISOString(), ...entry }, ...this.state.audit] }))
  }
}
