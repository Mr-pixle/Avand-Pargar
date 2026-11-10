import {newId} from '@/lib/id'
import { useState } from 'react'
import { toast } from 'sonner'
import { getRemote, useStore } from './store'
import { api, SERVER_MODE } from './remote'
import { guard } from './policy'
import type { Action } from './state'
export const newWorkspaceId = () => newId()
export function useWorkspaceSave() {
  const { state, dispatch } = useStore()
  const [busy, setBusy] = useState(false)
  const save = async (action: Action, message = 'تغییرات ذخیره شد') => {
    const error = guard(state, action)
    if (error) { toast.error(error); return false }
    setBusy(true)
    try {
      if (SERVER_MODE) { await api('/api/action', { action }); await getRemote().load() } else dispatch(action)
      if (message) toast.success(message)
      return true
    } catch (e) { toast.error(e instanceof Error ? e.message : 'ذخیره انجام نشد؛ دوباره تلاش کنید.'); return false }
    finally { setBusy(false) }
  }
  return { save, busy }
}
export const tehranInput = (iso: string) => iso ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)).replace(' ', 'T') : ''
export const fromTehranInput = (value: string) => {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(value)) return ''
  const at = `${value}+03:30`
  return Number.isFinite(Date.parse(at)) ? new Date(at).toISOString() : ''
}
