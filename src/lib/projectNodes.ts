import type {Task} from './types'
import {taskScope} from './organization'
export const PROJECT_NODE_LABELS={manual:'Task',phase:'Phase',stage:'Stage',doctype:'Doc Type',subtask:'Sub Task'} as const
export type ProjectNodeChoice=keyof typeof PROJECT_NODE_LABELS
export function acceptsProjectParent(kind:ProjectNodeChoice,parent:Task|undefined){
 if(kind==='phase')return !parent
 if(kind==='stage')return parent?.kind==='phase'
 if(kind==='doctype')return !!parent&&['stage','group'].includes(parent.kind)
 if(kind==='subtask')return !!parent&&['manual','document'].includes(parent.kind)
 return !parent||['phase','stage','group','doctype'].includes(parent.kind)
}
export function projectNodeProblem(tasks:Record<string,Task>,t:Task){
 if(!['manual','phase','stage','doctype'].includes(t.kind))return 'نوع ساختار پروژه نامعتبر است.'
 const parent=t.parentId?tasks[t.parentId]:undefined
 if(t.parentId&&(!parent||parent.projectId!==t.projectId||parent.removedFromMdr))return 'والد فعال باید متعلق به همین پروژه باشد.'
 const choice=t.kind==='manual'&&parent&&['manual','document'].includes(parent.kind)?'subtask':t.kind as ProjectNodeChoice
 if(!acceptsProjectParent(choice,parent))return 'والد با سطح انتخاب‌شده سازگار نیست: Stage زیر Phase، Doc Type زیر Stage یا Group، و Sub Task زیر Task یا Document قرار می‌گیرد.'
 const scope=parent?taskScope(tasks,parent):undefined
 if(scope&&t.workScope&&scope!==t.workScope&&!(scope==='phase2'&&t.workScope==='revit'))return 'فاز مسئول باید با شاخهٔ والد هماهنگ باشد.'
 if(t.kind!=='manual'&&(t.assigneeUserId||t.assigneeTeamId||t.statusId))return 'وضعیت و پیشرفت سطوح ساختاری از تسک‌های زیرمجموعه محاسبه می‌شود.'
 return null
}
