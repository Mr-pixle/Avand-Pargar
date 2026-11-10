import type { State } from './state'
import { projectPeople } from './organization'
export function myResponsibilityProjects(s:State,userId:string){
 const assigned=new Set(Object.values(s.tasks).filter(t=>!t.removedFromMdr&&(t.assigneeUserId===userId||t.reviewerId===userId||t.participantIds?.includes(userId))).map(t=>t.projectId))
 for(const v of Object.values(s.siteVisits))if(v.assigneeId===userId||v.participantIds.includes(userId))assigned.add(v.projectId)
 return s.projects.filter(p=>p.managerId===userId||projectPeople(p).includes(userId)||assigned.has(p.id))
}
