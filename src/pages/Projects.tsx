import {teamStatusStyle} from '@/lib/brand'
import {projectProgressStyle} from '@/lib/brand'
import { MindMapView } from '@/components/MindMap'
import { projectProgress, taskStage } from '@/lib/projectProgress'
import { ProjectStages, StageSummary } from '@/components/ProjectStages'
import { ManualProjectTaskDialog } from '@/components/ManualProjectTaskDialog'
import { useMemo, useState } from 'react'
import { ArrowRight, FileSpreadsheet, Plus, RefreshCw } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useFmt, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { TaskViews, TreeView } from '@/components/TaskViews'
import { Empty, PageHeader, ProgressRing, Segmented, TitleBlock } from '@/components/common'
import { runManualSync } from './SyncRuns'
import { SupervisionPanel } from '@/components/FlowViews'
import { MdrButton, useMdrShortcut } from '@/components/MdrLink'
import { ProjectEditor, ProjectResponsibilities } from '@/components/ProjectEditor'

export function useProjectProgress() {
  const { state } = useStore()
  return (pid: string) => {
    const result = projectProgress(state, pid)
    return { ...result, total: result.total ?? 0 }
  }
}

export function Projects() {
  const store = useStore()
  const { state, dispatch, teamById, workItems, can } = store
  const { n, time } = useFmt()
  const progress = useProjectProgress()
  const [mode, setMode] = useState<'cards' | 'tree'>('cards')
  const [newOpen, setNewOpen] = useState(false)
  const pending = (pid: string) => state.syncItems.filter((x) => x.projectId === pid && x.state === 'pending').length

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="پروژه‌ها" title="پروژه‌های فعال" actions={
        <>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'cards', label: 'فهرست' }, { value: 'tree', label: 'WBS همه' }]} />
          {can.perm('project.define') && <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> تعریف پروژه</Button>}
        </>
      }>
        {n(state.projects.length)} پروژه؛ پیشرفت هشت مرحله بر اساس تسک‌های همان مرحله محاسبه می‌شود. مراحل بدون تسک با «—» مشخص‌اند.
      </PageHeader>

      {mode === 'tree' ? <TreeView tasks={workItems} depth={1} /> : (
        <div className="overflow-hidden glass-card">
          {state.projects.map((p) => {
            const pr = progress(p.id)
            const docs = workItems.filter((t) => t.projectId === p.id)
            const un = docs.filter((t) => !t.assigneeUserId && !t.assigneeTeamId).length
            const pend = pending(p.id)
            return (
              <button key={p.id} onClick={() => dispatch({ type: 'nav', nav: { page: 'project', projectId: p.id } })}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b px-4 py-4 text-start last:border-0 hover:bg-foreground/[0.035] xl:grid-cols-[auto_minmax(0,1fr)_minmax(300px,1.5fr)_auto]">
                <ProgressRing project value={pr.total} size={46} stroke={4} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="mono text-[11.5px] text-muted-foreground">{p.code}</span><span className="text-[11.5px] text-muted-foreground">{p.type}</span></div>
                  <div className="truncate text-[15px] font-bold">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground">{teamById[p.phase1TeamId]?.name} / {teamById[p.phase2TeamId]?.name} (DD / Revit)</div>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5 xl:col-span-1">
                  <StageSummary projectId={p.id} />
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-2 text-[12px] md:col-span-1">
                  <div><div className="eyebrow">سند</div><div className="num font-semibold">{n(docs.length)}</div></div>
                  <div><div className="eyebrow">Unassigned</div><div className="num font-semibold">{n(un)}</div></div>
                  {can.control ? <div><div className="eyebrow">Sync Review</div><div className={pend ? 'num font-semibold text-azure' : 'num font-semibold'}>{n(pend)}</div></div>
                    : <div><div className="eyebrow">انجام‌شده</div><div className="num font-semibold">{n(docs.filter((t) => t.actualFinish).length)}</div></div>}
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground md:col-span-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> {p.lastSync ? time(p.lastSync) : 'هنوز Sync نشده'}
                </div>
              </button>
            )
          })}
        </div>
      )}
      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}

export function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <ProjectEditor open={open} onOpenChange={onOpenChange} /> : null
}

export function ProjectPage({ projectId }: { projectId: string }) {
  const store = useStore()
  const { state, dispatch, projectById, teamById, workItems, teamOf, can } = store
  const { n, time, pct } = useFmt()
  const p = projectById[projectId]
  const progress = useProjectProgress()
  const [manualOpen, setManualOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState('all')
  const tasks = useMemo(() => workItems.filter((t) => t.projectId === projectId && (selectedStage === 'all' || (selectedStage === 'unclassified' ? !taskStage(state.tasks, t) : taskStage(state.tasks, t) === selectedStage))), [workItems, projectId, selectedStage, state.tasks])
  useMdrShortcut(p)
  if (!p) return <Empty title="این پروژه پیدا نشد" hint="از فهرست پروژه‌ها یکی را انتخاب کنید." />
  const pr = progress(p.id)
  const teamTabs = [...new Set(['ctl', 'rd', 'int', 'prs', 'ren', p.phase1TeamId, p.phase2TeamId, ...(p.teamIds ?? [])])].filter((id) => teamById[id] && !['revit','management'].includes(teamById[id].kind))
  const pool = tasks.filter((t) => !t.assigneeUserId && !t.assigneeTeamId)
  const pend = state.syncItems.filter((x) => x.projectId === p.id && x.state === 'pending').length
  const syncing = state.syncRuns.some((r) => r.state === 'running' && (r.projectId === p.id || r.projectId === 'all'))
  const supOpen = Object.values(state.tasks).filter((t) => t.kind === 'supervision' && t.projectId === p.id && t.flow !== 'closed').length
  const supTasks = Object.values(state.tasks).filter((t) => t.kind === 'supervision' && t.projectId === p.id && can.viewTask(t))
  const supGantt = supTasks.length ? { key: 'sup', label: 'نظارت و اجرا', tasks: supTasks } : undefined
  return (
    <div className="flex flex-col gap-5">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground" onClick={() => dispatch({ type: 'nav', nav: { page: 'projects' } })}>
          <ArrowRight className="h-3.5 w-3.5" /> پروژه‌ها
        </button>
        <PageHeader eyebrow={`${p.code}، ${p.type}`} title={p.name} actions={(
          <>
            <MdrButton project={p} />
            {can.perm('project.define') && <Button variant="outline" onClick={() => setEditOpen(true)}>مشخصات و مسئولیت‌ها</Button>}
            {can.syncProject(p.id) && <Button variant="outline" onClick={() => runManualSync(store, p.id)} disabled={syncing} aria-busy={syncing}><RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} /> {syncing ? 'در حال Sync…' : 'Sync با MDR'}</Button>}
            {can.createProjectTask(p.id) && <Button onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" /> تسک دستی</Button>}
          </>
        )} />
      </div>
      <TitleBlock cells={[
        { label: 'پیشرفت مراحل طبقه‌بندی‌شده', value: <span className="num" style={projectProgressStyle(pr.total)}>{pct(pr.total)}</span> },
        { label: 'مدیر پروژه', value: p.managerId ? store.userById[p.managerId]?.name : '—' },
        { label: 'CD', value: teamById[p.phase1TeamId]?.name },
        { label: 'DD', value: teamById[p.phase2TeamId]?.name },
        { label: 'MDR / Tab', value: `${p.mdrTab}`, mono: true },
        { label: 'آخرین Sync', value: p.lastSync ? time(p.lastSync) : '—' },
        can.control
          ? { label: 'در صف Sync Review', value: pend ? <button className="num text-azure hover:underline" onClick={() => dispatch({ type: 'nav', nav: { page: 'review' } })}>{n(pend)} ردیف</button> : <span className="num">{n(0)}</span> }
          : { label: 'تسک‌های پروژه', value: <span className="num">{n(tasks.length)}</span> },
      ]} />
      <ProjectResponsibilities project={p} />
      <ProjectStages projectId={p.id} selected={selectedStage} onSelect={setSelectedStage} />
      {editOpen && <ProjectEditor project={p} open onOpenChange={setEditOpen} />}
      <Tabs defaultValue="wbs" dir="rtl">
        <div className="scroll-x thin-scroll -mx-1 px-1">
          <TabsList className="h-auto w-max justify-start gap-0.5">
            <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
            <TabsTrigger value="wbs" className="text-[13px]">WBS</TabsTrigger>
            {teamTabs.map((id) => <TabsTrigger key={id} value={id} style={teamStatusStyle(teamById[id])} className="team-tab text-[13px]">{id===p.phase1TeamId?'CD':id===p.phase2TeamId?'DD':teamById[id]?.name}</TabsTrigger>)}
            {can.viewSupervision(p.id) && <TabsTrigger value="sup" style={teamStatusStyle(teamById.sup)} className="team-tab text-[13px]">CA{supOpen > 0 && <span className="num ms-1.5 rounded-full bg-azure px-1.5 text-[10.5px] font-semibold text-white">{n(supOpen)}</span>}</TabsTrigger>}
            {can.createProjectTask(p.id) && <TabsTrigger value="pool" className="text-[13px]">Unassigned <span className="num ms-1.5 text-[11px] text-muted-foreground">{n(pool.length)}</span></TabsTrigger>}
          </TabsList>
        </div>
        <TabsContent value="mindmap"><MindMapView key={p.id} projectId={p.id} /></TabsContent>
        <TabsContent value="wbs" className="mt-4">
          <TaskViews tasks={tasks} structuralTasks={Object.values(state.tasks).filter(t=>t.projectId===p.id&&t.source==='manual'&&['phase','stage','doctype'].includes(t.kind)&&!t.removedFromMdr&&can.viewTask(t))} idPrefix={`p-${p.id}-wbs`} defaultView="tree" hideProject treeDepth={4} ganttExtras={supGantt} />
        </TabsContent>
        {teamTabs.map((id) => {
          const list = tasks.filter((t) => teamOf(t) === id || (id === p.phase2TeamId && teamOf(t) === (p.revitTeamId ?? 'rvt')))
          return (
            <TabsContent key={id} value={id} className="mt-4">
              {list.length ? <TaskViews tasks={list} colorTeamId={id} idPrefix={`p-${p.id}-${id}`} defaultView="kanban" hideProject hideTeam treeDepth={4} />
                : <Empty title={`تیم ${teamById[id]?.name} در این پروژه تسکی ندارد`} hint="هر تیم فقط تسک‌های تخصیص‌یافته به خودش یا اعضایش را در این پروژه می‌بیند." />}
            </TabsContent>
          )
        })}
        {can.viewSupervision(p.id) && (
          <TabsContent value="sup" className="mt-4"><SupervisionPanel projectId={p.id} /></TabsContent>
        )}
        {can.createProjectTask(p.id) && (
          <TabsContent value="pool" className="mt-4">
            {pool.length ? <TaskViews tasks={pool} idPrefix={`p-${p.id}-pool`} defaultView="list" hideProject treeDepth={4} />
              : <Empty title="همه‌ی تسک‌های این پروژه تخصیص داده شده‌اند" />}
          </TabsContent>
        )}
      </Tabs>
      {manualOpen && <ManualProjectTaskDialog projectId={p.id} onOpenChange={setManualOpen} />}
    </div>
  )
}
