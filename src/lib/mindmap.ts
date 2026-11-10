import type {MindNode} from './workspace'
import {TEAM_COLORS,type TeamCode} from './brand'
export function branchIds(nodes:MindNode[],id:string){const ids=new Set([id]);let next=[id];while(next.length){const batch=nodes.filter(n=>n.parentId&&next.includes(n.parentId)&&!ids.has(n.id)).map(n=>n.id);for(const x of batch)ids.add(x);next=batch}return ids}
export function visibleNodes(nodes:MindNode[]){const byId=new Map(nodes.map(n=>[n.id,n]));return nodes.filter(n=>{const seen=new Set([n.id]);let p=n.parentId?byId.get(n.parentId):undefined;while(p){if(p.collapsed||seen.has(p.id))return false;seen.add(p.id);p=p.parentId?byId.get(p.parentId):undefined}return true})}
export function nodeTeam(nodes:MindNode[],node:MindNode):TeamCode{const seen=new Set<string>();let cur:MindNode|undefined=node;while(cur&&!seen.has(cur.id)){if(cur.color&&cur.color in TEAM_COLORS)return cur.color as TeamCode;seen.add(cur.id);cur=nodes.find(n=>n.id===cur!.parentId)}return 'DD'}
export function layoutMap(nodes:MindNode[],direction:'both'|'right'|'left'='both'){
 const root=nodes.find(n=>!n.parentId);if(!root)return nodes
 const kids=(id:string)=>nodes.filter(n=>n.parentId===id),size=(n:MindNode):number=>n.collapsed?1:Math.max(1,kids(n.id).reduce((s,c)=>s+size(c),0))
 const positions=new Map<string,{x:number;y:number}>([[root.id,{x:0,y:0}]])
 const place=(n:MindNode,depth:number,y:number,side:number)=>{positions.set(n.id,{x:side*Math.min(depth*280,98000),y});let top=y-size(n)*104/2;for(const c of kids(n.id)){const height=size(c)*104;place(c,depth+1,top+height/2,side);top+=height}}
 const branches=kids(root.id);for(const side of [-1,1]){const list=branches.filter((_,i)=>direction==='left'?side===-1:direction==='right'?side===1:(i%2?1:-1)===side);let top=-list.reduce((s,n)=>s+size(n)*104,0)/2;for(const n of list){const height=size(n)*104;place(n,1,top+height/2,side);top+=height}}
 return nodes.map(n=>({...n,...positions.get(n.id)}))
}
export function mapCurve(a:MindNode,b:MindNode){const left=b.x<a.x,x1=a.x+(left?0:200),x2=b.x+(left?200:0),y1=a.y+35,y2=b.y+35,mid=(x1+x2)/2;return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
