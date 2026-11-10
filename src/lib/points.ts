// Legacy config schema retained for stored history. Active scoring lives only in server/scores.ts.
import { addDays, isWeekend } from './jalali'
import type { PointConfig } from './types'

export const DEFAULT_POINT_CONFIG: Omit<PointConfig, 'by' | 'at'> = {
  version: 1, multiplier: 100, hoursPerDay: 8, earlyFactor: 1, lateFactor: 1, cap: null,
  reason: 'فرمول پایه: (W.F ÷ Estimation) × ۱۰۰ × نفرساعت تعجیل یا تأخیر؛ روز کاری × ۸ ساعت',
}

/** Working days d with from < d ≤ to (Saturday–Wednesday, official holidays excluded) */
export function workdaysBetween(from: string, to: string, holidays: Set<string>): number {
  let n = 0
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (!isWeekend(d) && !holidays.has(d)) n++
  return n
}

