import type { Priority } from '@/lib/types'
import { PRIORITY_FA, PRIORITY_CLASS } from '@/lib/priority'
export function PriorityChip({p,className=''}:{p?:Priority;className?:string}){const v=p??'none';return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-1.5 text-[10.5px] font-semibold leading-5 ${PRIORITY_CLASS[v]} ${className}`}>{PRIORITY_FA[v]}</span>}
