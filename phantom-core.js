/* 11 x 11 Phantom D puzzle generator and validator. No fixed layouts. */
(function(root){
'use strict';
const N=11,SIZE=N*N,rand=n=>Math.floor(Math.random()*n);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeSolution(){for(let k=0;k<2000;k++){const p=shuffle(Array.from({length:N},(_,i)=>i));if(p.every((c,r)=>!r||Math.abs(c-p[r-1])>1))return p;}throw Error('배치 생성 실패');}
function makeRegions(solution){
 const regions=Array(SIZE).fill(-1),sizes=Array(N).fill(1),front=Array.from({length:N},()=>new Set());
 const around=i=>{const r=Math.floor(i/N),c=i%N,a=[];if(r)a.push(i-N);if(r<N-1)a.push(i+N);if(c)a.push(i-1);if(c<N-1)a.push(i+1);return a;};
 for(let r=0;r<N;r++)regions[r*N+solution[r]]=r;
 for(let r=0;r<N;r++)for(const q of around(r*N+solution[r]))if(regions[q]===-1)front[r].add(q);
 let remaining=SIZE-N;
 while(remaining){
  const available=[];
  for(let r=0;r<N;r++){for(const q of front[r])if(regions[q]!==-1)front[r].delete(q);if(front[r].size)available.push(r);}
  if(!available.length)throw Error('구역 생성 실패');
  const low=Math.min(...available.map(r=>sizes[r])),eligible=available.filter(r=>sizes[r]<=low+1);
  const region=eligible[rand(eligible.length)],options=[...front[region]],cell=options[rand(options.length)];
  regions[cell]=region;sizes[region]++;remaining--;
  for(const q of around(cell))if(regions[q]===-1)front[region].add(q);
 }
 return regions;
}
function solutionCount(regions,clues=[],limit=2){
 const forbidden=new Set(clues);let count=0;
 function visit(row,usedCols,usedRegions,prev){
  if(count>=limit)return;
  if(row===N){count++;return;}
  for(let c=0;c<N;c++){const i=row*N+c,k=regions[i],cb=1<<c,rb=1<<k;
   if(forbidden.has(i)||(usedCols&cb)||(usedRegions&rb)||(prev>=0&&Math.abs(c-prev)<=1))continue;
   visit(row+1,usedCols|cb,usedRegions|rb,c);if(count>=limit)return;
  }
 }
 visit(0,0,0,-1);return count;
}
function makePuzzle(){
 let best=null;
 for(let attempt=0;attempt<12;attempt++){
  const solution=makeSolution(),regions=makeRegions(solution),correct=new Set(solution.map((c,r)=>r*N+c));
  const candidates=shuffle(Array.from({length:SIZE},(_,i)=>i).filter(i=>!correct.has(i)));
  const clues=[];
  while(solutionCount(regions,clues)>1&&candidates.length)clues.push(candidates.pop());
  if(!best||clues.length<best.clues.length)best={regions,clues,solution,variantOffset:rand(4)};
  if(clues.length<=24)break;
 }
 for(const i of shuffle(best.clues.slice())){
  const fewer=best.clues.filter(x=>x!==i);
  if(solutionCount(best.regions,fewer)===1)best.clues=fewer;
 }
 return best;
}
function isSolved(cols,regions,clues=[]){
 if(!Array.isArray(cols)||cols.length!==N||!Array.isArray(regions)||regions.length!==SIZE)return false;
 const usedCols=new Set(),usedRegions=new Set(),blocked=new Set(clues);
 for(let r=0;r<N;r++){
  const c=cols[r];if(!Number.isInteger(c)||c<0||c>=N)return false;
  const idx=r*N+c,region=regions[idx];
  if(blocked.has(idx)||usedCols.has(c)||usedRegions.has(region)||(r&&Math.abs(c-cols[r-1])<=1))return false;
  usedCols.add(c);usedRegions.add(region);
 }
 return usedCols.size===N&&usedRegions.size===N;
}
const api={N,SIZE,makePuzzle,isSolved,solutionCount};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhantomCore=api;
})(typeof window!=='undefined'?window:globalThis);
