import assert from 'node:assert/strict'
import {productionState} from '../server/bootstrap'
import {initialState} from '../src/lib/state'
const empty=initialState()
assert.equal(empty.users.length,0);assert.equal(empty.projects.length,0);assert.equal(Object.keys(empty.tasks).length,0)
const {state,passwords}=productionState({username:'test-admin',password:'test-only-not-a-deployed-password',name:'Test administrator'})
assert.equal(state.users.length,1);assert.equal(state.users[0].password,undefined)
assert.equal(passwords.length,1)
for(const key of ['projects','allocations','leaves','comments','messages','notifications','attachments','workLogs','pointEntries','internalProjects','reviewRounds','adminRequests','personalBoards','personalTasks','tasks','timesheets','documents','importantLinks','mindMaps','stickyNotes'] as const){assert.equal(Object.keys(state[key]).length,0,key)}
console.log('Data-free startup: one configured administrator, no business/demo records or embedded passwords')
