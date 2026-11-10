// Empty startup configuration; no company or demonstration records.
import {addDays,isWeekend,tehranISO} from './jalali'
import type {
  Allocation, Attachment, AuditEntry, ChatMessage, Comment, Holiday, InternalProject, Leave, Notification, PointConfig, PointEntry, Project, ReviewRound, WorkLog, Status, SyncItem, SyncRun, Task, Team, User, AdminRequest, TimesheetDay, TimesheetConfig, MonthClose, PersonalTask, PersonalBoard,
} from './types'
export let TODAY=tehranISO(new Date())
export function refreshToday(now=new Date()){const t=tehranISO(now),changed=t!==TODAY;TODAY=t;return changed}
export function addWorkdays(iso: string, n: number) {
  let d = iso
  const step = n >= 0 ? 1 : -1
  let left = Math.abs(n)
  while (isWeekend(d)) d = addDays(d, 1)
  while (left > 0) {
    d = addDays(d, step)
    if (!isWeekend(d)) left--
  }
  return d
}


export const TEAMS: Team[] = [
  { id: 'ctl', name: 'کنترل پروژه', kind: 'fixed' },
  { id: 'int', name: 'طراحی داخلی', kind: 'fixed' },
  { id: 'prs', name: 'ارائه', kind: 'fixed' },
  { id: 'ren', name: 'رندر', kind: 'fixed' },
  { id: 'p1a', name: 'فاز ۱ – الف', kind: 'phase1' },
  { id: 'p1b', name: 'فاز ۱ – ب', kind: 'phase1' },
  { id: 'p1c', name: 'فاز ۱ – پ', kind: 'phase1' },
  { id: 'p1d', name: 'فاز ۱ – ت', kind: 'phase1' },
  { id: 'p2a', name: 'فاز ۲ – الف', kind: 'phase2' },
  { id: 'p2b', name: 'فاز ۲ – ب', kind: 'phase2' },
  { id: 'p2c', name: 'فاز ۲ – پ', kind: 'phase2' },
  { id: 'rvt', name: 'Revit', kind: 'revit' },
  { id: 'rd', name: 'R&D', kind: 'fixed' },
  { id: 'sup', name: 'نظارت و اجرا', kind: 'supervision' },
  { id: 'mgt', name: 'مدیریت', kind: 'management' },
]


export const FLOOR_LABEL: Record<string, string> = {
  B3: 'زیرزمین سوم', B2: 'زیرزمین دوم', B1: 'زیرزمین اول', GF: 'همکف', '01': 'طبقه اول', '02': 'طبقه دوم',
  '03': 'طبقه سوم', TYP: 'طبقات تیپ', '15': 'طبقه پانزدهم', RF: 'بام',
}


export const OFFICE_STATUSES: Status[] = [
  { id: 'st-todo', name: 'شروع نشده', category: 'todo', progress: 0 },
  { id: 'st-design', name: 'در حال طراحی', category: 'doing', progress: 25 },
  { id: 'st-review', name: 'بررسی داخلی', category: 'doing', progress: 60 },
  { id: 'st-fix', name: 'اصلاحات', category: 'doing', progress: 75 },
  { id: 'st-client', name: 'ارسال برای کارفرما', category: 'doing', progress: 90 },
  { id: 'st-issued', name: 'صادر شد', category: 'done', progress: 100 },
]

export interface Seed {
  teams: Team[]; users: User[]; projects: Project[]; tasks: Record<string, Task>
  statusSets: Record<string, Status[]>; allocations: Allocation[]; holidays: Holiday[]; leaves: Leave[]
  syncItems: SyncItem[]; syncRuns: SyncRun[]; audit: AuditEntry[]
  comments: Comment[]; messages: ChatMessage[]; notifications: Notification[]
  internalProjects: InternalProject[]; reviewRounds: ReviewRound[]; attachments: Attachment[]
  pointConfigs: PointConfig[]; pointEntries: PointEntry[]; workLogs: WorkLog[]
  adminRequests: AdminRequest[]; timesheets: Record<string, TimesheetDay>; timesheetConfigs: TimesheetConfig[]; monthCloses: MonthClose[]
  personalTasks: Record<string, PersonalTask>; personalBoards: Record<string, PersonalBoard>
}


export function buildSeed():Seed{return {teams:TEAMS.map(t=>({...t})),users:[],projects:[],tasks:{},statusSets:{office:OFFICE_STATUSES.map(s=>({...s}))},allocations:[],holidays:[],leaves:[],syncItems:[],syncRuns:[],audit:[],comments:[],messages:[],notifications:[],internalProjects:[],reviewRounds:[],attachments:[],pointConfigs:[],pointEntries:[],workLogs:[],adminRequests:[],timesheets:{},timesheetConfigs:[],monthCloses:[],personalTasks:{},personalBoards:{}}}
