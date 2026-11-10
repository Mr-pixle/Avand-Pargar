/** Persisted server results. Clients format these values; they never calculate scores. */
export interface ScoreRecord {
  id: string; version: 2; kind: 'task' | 'user' | 'team' | 'projectTeam'
  score: number | null; count: number
  taskId?: string; userId?: string; teamId?: string; projectId?: string
  error?: string; actualStart?: string; due?: string; actualFinish?: string
  duration?: number; delta?: number
}
export interface ScoreReport {
  rows: ScoreRecord[]; average: number | null; count: number; invalid: number
  early: number; late: number; ontime: number
  ranking: ScoreRecord[]
  trend: { date: string; score: number; count: number }[]
}
export const SCORE_FORMULA = '۶۰ × (۱ − روزهای کاریِ تأخیر ÷ روزهای کاری از شروع واقعی تا سررسید)'

/** Fixed display scale only; never changes stored or computed scores. */
export function scorePresentation(value:number|null|undefined){return value==null||!Number.isFinite(value)?null:{width:Math.max(0,Math.min(100,value)),tone:value>50?'green':value>=35?'yellow':'red'}}
