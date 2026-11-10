import type { State, NewFile } from './state'
import type { User } from './types'
import { projectPeople } from './organization'

export const CATEGORIES = { checklists: 'چک‌لیست‌ها', forms: 'فرم‌ها', standards: 'استانداردها', regulations: 'آیین‌نامه‌ها', others: 'سایر' } as const
export interface DocumentEntry { id: string; title: string; category: keyof typeof CATEGORIES; file: NewFile; uploadedBy: string; uploadedAt: string; updatedAt: string }
export interface ImportantLink { id: string; title: string; kind: 'website' | 'email'; address: string; description: string; icon: string; updatedAt: string }
export interface MindNode { id: string; parentId: string | null; title: string; description: string; x: number; y: number; color?: string; shape?: 'card' | 'pill' | 'plain'; fontSize?: number; bold?: boolean; collapsed?: boolean }
export interface MindMap { id: string; nodes: MindNode[]; edges: { from: string; to: string }[]; revision: number; updatedAt: string; updatedBy: string }
export interface StickyNote { pinned?: boolean; createdAt?: string; id: string; ownerId: string; title: string; text: string; color: string; priority: 'high' | 'medium' | 'low'; status: 'active' | 'completed' | 'archived'; reminderAt: string; updatedAt: string }
export interface Reminder { id: string; ownerId: string; title: string; description: string; dueAt: string; status: 'active' | 'completed' | 'expired'; noteId?: string; notifiedAt?: string; updatedAt: string }
export interface WorkspaceData { documents: Record<string, DocumentEntry>; importantLinks: Record<string, ImportantLink>; mindMaps: Record<string, MindMap>; stickyNotes: Record<string, StickyNote>; reminders: Record<string, Reminder> }
export const emptyWorkspace = (): WorkspaceData => ({ documents: {}, importantLinks: {}, mindMaps: {}, stickyNotes: {}, reminders: {} })
export type WorkspaceAction =
  | { type: 'docSave'; id: string; title: string; category: DocumentEntry['category']; files?: NewFile[] }
  | { type: 'docDelete'; id: string }
  | { type: 'linkSave'; link: Omit<ImportantLink, 'updatedAt'> }
  | { type: 'linkDelete'; id: string }
  | { type: 'mapSave'; projectId: string; revision: number; nodes: MindNode[]; edges: MindMap['edges'] }
  | { type: 'noteSave'; note: Omit<StickyNote, 'ownerId' | 'updatedAt'> }
  | { type: 'noteDelete'; id: string }
  | { type: 'reminderSave'; reminder: Pick<Reminder, 'id' | 'title' | 'description' | 'dueAt' | 'status'> }
  | { type: 'reminderDelete'; id: string }
  | { type: 'sysReminders'; now: string }
export const WORKSPACE_ACTIONS = new Set(['docSave', 'docDelete', 'linkSave', 'linkDelete', 'mapSave', 'noteSave', 'noteDelete', 'reminderSave', 'reminderDelete', 'sysReminders'])
export const managesLibrary = (u: User) => u.status === 'active' && ['ceo', 'control'].includes(u.role)
export function editsMap(s: State, u: User, pid: string) {
  const p = s.projects.find((p) => p.id === pid)
  if (!p || u.status !== 'active') return false
  return ['ceo','control'].includes(u.role) || projectPeople(p).includes(u.id) || [p.phase1TeamId, p.phase2TeamId, p.revitTeamId, ...(p.teamIds ?? [])].filter(Boolean).includes(u.teamId)
}
const text = (x: unknown, max: number, required = false): x is string => typeof x === 'string' && x.length <= max && (!required || !!x.trim())
const validId = (x: unknown): x is string => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(x) && !['__proto__', 'constructor', 'prototype'].includes(x)
const date = (x: unknown) => typeof x === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(x) && Number.isFinite(Date.parse(x))
export function safeAddress(kind: string, address: string) {
  if (kind === 'email') return /^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(address)
  try { const u = new URL(address); return kind === 'website' && ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password } catch { return false }
}
export function workspaceGuard(s: State, raw: unknown): string | null {
  const a = raw as WorkspaceAction
  if (a.type === 'sysReminders') return s.session === null && date(a.now) ? null : 'این عملیات مختص سرور است.'
  const me = s.users.find((u) => u.id === s.session)
  if (!me || me.status !== 'active') return 'حساب فعال لازم است.'
  if (['docSave', 'docDelete', 'linkSave', 'linkDelete'].includes(a.type) && !managesLibrary(me)) return 'مدیریت این بخش فقط برای مدیرعامل و کنترل پروژه است.'
  const invalid = 'اطلاعات واردشده معتبر نیست.'
  switch (a.type) {
    case 'docDelete': return validId(a.id) && !!s.documents[a.id] ? null : invalid
    case 'docSave': {
      if (!validId(a.id) || !text(a.title, 200, true) || !Object.hasOwn(CATEGORIES, a.category)) return invalid
      if (a.files !== undefined && (!Array.isArray(a.files) || a.files.length !== 1)) return invalid
      const f = a.files?.[0] ?? s.documents[a.id]?.file
      return f && text(f.name, 200, true) && text(f.mime, 100, true) && Number.isFinite(f.size) && f.size > 0 && f.size <= 3 * 1024 * 1024 && text(f.dataUrl, 5 * 1024 * 1024, true) && /^(data:|\/api\/files\/fl-)/.test(f.dataUrl) ? null : 'یک فایل معتبر با حجم حداکثر ۳ مگابایت انتخاب کنید.'
    }
    case 'linkDelete': return validId(a.id) && !!s.importantLinks[a.id] ? null : invalid
    case 'linkSave': {
      const l = a.link
      return l && validId(l.id) && text(l.title, 200, true) && text(l.address, 2000, true) && safeAddress(l.kind, l.address) && text(l.description, 2000) && ['globe', 'building', 'book', 'mail', 'folder', 'link'].includes(l.icon) ? null : invalid
    }
    case 'mapSave': {
      if (!editsMap(s, me, a.projectId)) return 'ویرایش نقشه فقط برای اعضا و مسئولان همین پروژه است.'
      if (a.revision !== (s.mindMaps[a.projectId]?.revision ?? 0)) return 'نقشه توسط همکار دیگری تغییر کرده است؛ نسخهٔ تازه را بارگذاری کنید.'
      if (!Array.isArray(a.nodes) || !Array.isArray(a.edges) || a.nodes.length > 1000 || a.edges.length > 3000) return invalid
      const ids = new Set(a.nodes.map((n) => n?.id))
      if (ids.size !== a.nodes.length || a.nodes.some((n) => !n || !validId(n.id) || !text(n.title, 200, true) || !text(n.description, 5000) || !Number.isFinite(n.x) || !Number.isFinite(n.y) || Math.abs(n.x) > 100000 || Math.abs(n.y) > 100000 || (n.parentId !== null && !ids.has(n.parentId)))) return invalid
      if(a.nodes.some(n=>(n.color!==undefined&&!['PM','PD','CD','DD','IN','CA','CG','GD','MG'].includes(n.color))||(n.shape!==undefined&&!['card','pill','plain'].includes(n.shape))||(n.fontSize!==undefined&&![12,14,18].includes(n.fontSize))||(n.bold!==undefined&&typeof n.bold!=='boolean')||(n.collapsed!==undefined&&typeof n.collapsed!=='boolean')))return invalid
      if (a.nodes.length && a.nodes.filter((n) => n.parentId === null).length !== 1) return 'نقشه باید یک گره اصلی داشته باشد.'
      const byId = new Map(a.nodes.map((n) => [n.id, n]))
      for (const n of a.nodes) { const seen = new Set<string>(); let cur: MindNode | undefined = n; while (cur) { if (seen.has(cur.id)) return 'رابطهٔ سلسله‌مراتبی حلقه دارد.'; seen.add(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined } }
      if (a.edges.some((e) => !e || !ids.has(e.from) || !ids.has(e.to) || e.from === e.to) || new Set(a.edges.map((e) => `${e.from}|${e.to}`)).size !== a.edges.length) return invalid
      return null
    }
    case 'noteSave': {
      const n = a.note
      if (!n || (n.pinned !== undefined && typeof n.pinned !== 'boolean') || !validId(n.id) || !text(n.title, 200, true) || !text(n.text, 20000) || !['yellow', 'blue', 'green', 'pink', 'purple'].includes(n.color) || !['high', 'medium', 'low'].includes(n.priority) || !['active', 'completed', 'archived'].includes(n.status) || (n.reminderAt !== '' && !date(n.reminderAt))) return invalid
      return s.stickyNotes[n.id] && s.stickyNotes[n.id].ownerId !== me.id ? 'یادداشت متعلق به شما نیست.' : null
    }
    case 'noteDelete': return validId(a.id) && s.stickyNotes[a.id]?.ownerId === me.id ? null : 'یادداشت متعلق به شما نیست.'
    case 'reminderSave': {
      const r = a.reminder
      if (!r || !validId(r.id) || r.id.startsWith('note-') || !text(r.title, 200, true) || !text(r.description, 20000) || !date(r.dueAt) || !['active', 'completed'].includes(r.status)) return invalid
      return s.reminders[r.id] && s.reminders[r.id].ownerId !== me.id ? 'یادآوری متعلق به شما نیست.' : null
    }
    case 'reminderDelete': return validId(a.id) && s.reminders[a.id]?.ownerId === me.id ? null : 'یادآوری متعلق به شما نیست.'
  }
}
export function applyWorkspace(s: State, a: WorkspaceAction): State {
  const now = new Date().toISOString(), ownerId = s.session!
  const remove = <T,>(r: Record<string, T>, id: string) => { const next = { ...r }; delete next[id]; return next }
  switch (a.type) {
    case 'docSave': { const old = s.documents[a.id]; return { ...s, documents: { ...s.documents, [a.id]: { id: a.id, title: a.title.trim(), category: a.category, file: a.files?.[0] ?? old.file, uploadedBy: a.files ? ownerId : old.uploadedBy, uploadedAt: a.files ? now : old.uploadedAt, updatedAt: now } } } }
    case 'docDelete': return { ...s, documents: remove(s.documents, a.id) }
    case 'linkSave': return { ...s, importantLinks: { ...s.importantLinks, [a.link.id]: { ...a.link, updatedAt: now } } }
    case 'linkDelete': return { ...s, importantLinks: remove(s.importantLinks, a.id) }
    case 'mapSave': return { ...s, mindMaps: { ...s.mindMaps, [a.projectId]: { id: a.projectId, nodes: a.nodes, edges: a.edges, revision: a.revision + 1, updatedAt: now, updatedBy: ownerId } } }
    case 'noteSave': {
      const n: StickyNote = { ...a.note, ownerId, createdAt: s.stickyNotes[a.note.id]?.createdAt ?? s.stickyNotes[a.note.id]?.updatedAt ?? now, updatedAt: now }, id = `note-${n.id}`, old = s.reminders[id]
      const reminders = remove(s.reminders, id)
      if (n.reminderAt && n.status !== 'archived') reminders[id] = { id, ownerId, noteId: n.id, title: n.title, description: n.text, dueAt: n.reminderAt, status: n.status === 'completed' ? 'completed' : old?.dueAt === n.reminderAt && old.notifiedAt ? 'expired' : 'active', notifiedAt: old?.dueAt === n.reminderAt ? old.notifiedAt : undefined, updatedAt: now }
      return { ...s, stickyNotes: { ...s.stickyNotes, [n.id]: n }, reminders }
    }
    case 'noteDelete': return { ...s, stickyNotes: remove(s.stickyNotes, a.id), reminders: remove(s.reminders, `note-${a.id}`) }
    case 'reminderSave': {
      const r = a.reminder, old = s.reminders[r.id]
      return { ...s, reminders: { ...s.reminders, [r.id]: { ...r, ownerId, updatedAt: now, status: r.status === 'active' && old?.dueAt === r.dueAt && old.notifiedAt ? 'expired' : r.status, notifiedAt: old?.dueAt === r.dueAt ? old.notifiedAt : undefined } } }
    }
    case 'reminderDelete': {
      const r = s.reminders[a.id], note = r.noteId ? s.stickyNotes[r.noteId] : undefined
      return { ...s, reminders: remove(s.reminders, a.id), stickyNotes: note ? { ...s.stickyNotes, [note.id]: { ...note, reminderAt: '', updatedAt: now } } : s.stickyNotes }
    }
    case 'sysReminders': {
      const due = Object.values(s.reminders).filter((r) => r.status === 'active' && !r.notifiedAt && Date.parse(r.dueAt) <= Date.parse(a.now))
      if (!due.length) return s
      const reminders = { ...s.reminders }
      const notifications = [...s.notifications]
      for (const r of due) {
        const id = `reminder-${r.id}-${Date.parse(r.dueAt)}`
        if (!notifications.some((n) => n.id === id)) notifications.unshift({ id, userId: r.ownerId, at: a.now, kind: 'reminder', title: r.title, body: r.description, read: false, link: { type: 'page', page: r.noteId ? 'personal' : 'notifications' } })
        reminders[r.id] = { ...r, notifiedAt: a.now, status: 'expired' }
      }
      return { ...s, reminders, notifications }
    }
  }
}
