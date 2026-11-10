import type { Priority } from './types'
export const PRIORITY_FA:Record<Priority,string>={none:'بدون اولویت',low:'پایین',normal:'متوسط',high:'بالا',urgent:'بحرانی'}
export const PRIORITY_RANK:Record<Priority,number>={none:-1,low:0,normal:1,high:2,urgent:3}
export const PRIORITY_CLASS:Record<Priority,string>={none:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',low:'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',normal:'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',high:'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',urgent:'bg-red-900 text-white'}
