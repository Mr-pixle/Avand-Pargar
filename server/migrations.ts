import { standardTeams } from '../src/lib/brand'
import { diffData, getMeta, loadData, setMeta, tx, writeChanges, type Db } from './db'
import { taskStage } from '../src/lib/projectProgress'
import { staffingOf, taskScope } from '../src/lib/organization'
import type { Data } from '../src/lib/collections'
import type { WorkScope } from '../src/lib/types'

export const ORGANIZATION_MIGRATION = '20261106_01_project_organization'
export const WORKSPACE_MIGRATION = '20261107_01_workspace'
export const OFFICE_MIGRATION = '20261107_02_deadline_visits'
export async function migrateOffice(db: Db) {
  await tx(db, async c => {
    await c.query('SELECT pg_advisory_xact_lock(20261107, 2)')
    if (await getMeta(c, OFFICE_MIGRATION)) return
    await setMeta(c, OFFICE_MIGRATION, { appliedAt: new Date().toISOString(), collections: ['deadlinePreferences', 'deadlineEvents', 'siteVisits'] })
  })
}
/** New JSON entity kinds need no destructive DDL. Missing collections load as empty records. */
export async function migrateWorkspace(db: Db) {
  await tx(db, async c => {
    await c.query('SELECT pg_advisory_xact_lock(20261107, 1)')
    if (await getMeta(c, WORKSPACE_MIGRATION)) return
    await setMeta(c, WORKSPACE_MIGRATION, { appliedAt: new Date().toISOString(), collections: ['documents', 'importantLinks', 'mindMaps', 'stickyNotes', 'reminders'] })
  })
}
export function upgradeOrganization(data: Data): Data {
  const projects = data.projects.map((p) => p.staffing ? p : { ...p, revitTeamId: p.revitTeamId ?? (data.teams.some((t) => t.id === 'rvt') ? 'rvt' : undefined), staffing: staffingOf(p, data.users) })
  const tasks = Object.fromEntries(Object.entries(data.tasks).map(([id, t]) => {
    if (t.workScope || (t.kind !== 'document' && t.kind !== 'manual')) return [id, t]
    const teamId = t.assigneeTeamId ?? data.users.find((u) => u.id === t.assigneeUserId)?.teamId
    const kind = data.teams.find((tm) => tm.id === teamId)?.kind
    const scope: WorkScope | undefined = kind === 'revit' ? 'revit' : taskScope(data.tasks, t) ?? (kind === 'phase1' || kind === 'phase2' ? kind : undefined)
    return [id, scope ? { ...t, workScope: scope } : t]
  }))
  return { ...data, projects, tasks }
}

export const STAGES_MIGRATION = '20261106_02_project_stages'
export function upgradeStages(data: Data): Data {
  const tasks = Object.fromEntries(Object.entries(data.tasks).map(([id, t]) => {
    if (t.projectStage || (t.kind !== 'manual' && t.kind !== 'document')) return [id, t]
    const stage = taskStage(data.tasks, t)
    return [id, stage ? { ...t, projectStage: stage } : t]
  }))
  return { ...data, tasks }
}

/** Version marker and data writes share a transaction; the lock makes reruns/concurrent startups safe. */
export async function migrateOrganization(db: Db) {
  await tx(db, async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(20261106, 1)')
    if (await getMeta(c, ORGANIZATION_MIGRATION)) return
    const before = await loadData(c)
    const after = upgradeOrganization(before)
    await writeChanges(c, diffData(before, after))
    await setMeta(c, ORGANIZATION_MIGRATION, { appliedAt: new Date().toISOString(), projects: after.projects.length, tasks: Object.keys(after.tasks).length })
  })
}

export async function migrateStages(db: Db) {
  await tx(db, async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(20261106, 2)')
    if (await getMeta(c, STAGES_MIGRATION)) return
    const before = await loadData(c)
    const after = upgradeStages(before)
    await writeChanges(c, diffData(before, after))
    await setMeta(c, STAGES_MIGRATION, { appliedAt: new Date().toISOString(), tasks: Object.keys(after.tasks).length })
  })
}

export async function migrateAvandTeams(db: Db) {
 await tx(db,async c=>{await c.query('SELECT pg_advisory_xact_lock(20261109, 1)');if(await getMeta(c,'20261109_avand_teams'))return;const before=await loadData(c);const after={...before,teams:standardTeams(before.teams)};await writeChanges(c,diffData(before,after));await setMeta(c,'20261109_avand_teams',{appliedAt:new Date().toISOString()})})
}
