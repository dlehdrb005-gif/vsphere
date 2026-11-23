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
// Deterministic deduction only: single-candidate, locked unit and 2-3-unit Hall sets.
function logicalSolve(regions,clues=[]){
 const allowed=new Uint8Array(SIZE).fill(1),chosen=new Set();
 const units=[...Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>r*N+c)),
              ...Array.from({length:N},(_,c)=>Array.from({length:N},(_,r)=>r*N+c)),
              ...Array.from({length:N},(_,g)=>Array.from({length:SIZE},(_,i)=>i).filter(i=>regions[i]===g))];
 for(const i of clues)if(i>=0&&i<SIZE)allowed[i]=0;
 function remove(i){if(!allowed[i])return false;allowed[i]=0;return true;}
 function place(i){
  if(!allowed[i])return false;
  for(const j of chosen){const r=Math.floor(i/N),c=i%N,rr=Math.floor(j/N),cc=j%N;
   if(r===rr||c===cc||regions[i]===regions[j]||(Math.abs(r-rr)<=1&&Math.abs(c-cc)<=1))return false;
  }
  chosen.add(i);const r=Math.floor(i/N),c=i%N;
  for(let j=0;j<SIZE;j++)if(j!==i&&(Math.floor(j/N)===r||j%N===c||regions[j]===regions[i]||
    (Math.abs(Math.floor(j/N)-r)<=1&&Math.abs(j%N-c)<=1)))remove(j);
  return true;
 }
 let operations=0;
 for(let pass=0;pass<150;pass++){
  let changed=false;
  // Standard removal: if a row, column or color region has one candidate, mark it.
  for(const unit of units){
   const candidates=unit.filter(i=>allowed[i]);
   if(!candidates.length)return {solved:false,contradiction:true,operations};
   if(candidates.length===1&&!chosen.has(candidates[0])){if(!place(candidates[0]))return {solved:false,contradiction:true,operations};changed=true;operations++;}
  }
  if(chosen.size===N)return {solved:true,contradiction:false,operations};
  // Adjacent rows: an impossible neighbor pair is an ordinary deterministic exclusion.
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
   const i=r*N+c;if(!allowed[i])continue;
   for(const nr of [r-1,r+1])if(nr>=0&&nr<N){
    let viable=false;
    for(let nc=0;nc<N;nc++)if(Math.abs(nc-c)>1&&allowed[nr*N+nc]){viable=true;break;}
    if(!viable){if(remove(i)){changed=true;operations++;}break;}
   }
  }
  // Locked candidates: all choices of one unit lie in one intersecting other unit.
  for(let a=0;a<units.length;a++){
   const opts=units[a].filter(i=>allowed[i]);if(!opts.length)return {solved:false,contradiction:true,operations};
   for(let b=0;b<units.length;b++)if(a!==b&&opts.every(i=>units[b].includes(i))){
    for(const i of units[b])if(!units[a].includes(i)&&remove(i)){changed=true;operations++;}
   }
  }
  // Grouping (묶음소거): if 2 or 3 rows/columns/regions claim exactly
  // the same number of opposite units, exclude those units elsewhere.
  for(let sourceFamily=0;sourceFamily<3;sourceFamily++)for(let targetFamily=0;targetFamily<3;targetFamily++){
   if(sourceFamily===targetFamily)continue;
   const offset=sourceFamily*N,targetOffset=targetFamily*N;
   const masks=Array.from({length:N},(_,a)=>{
    let mask=0;
    for(const i of units[offset+a])if(allowed[i])mask|=1<<(targetFamily===0?Math.floor(i/N):targetFamily===1?i%N:regions[i]);
    return mask;
   });
   function eliminate(group,mask){
    if(mask.toString(2).replace(/0/g,'').length!==group.length)return false;
    let made=false;
    for(let i=0;i<SIZE;i++)if(allowed[i]){
     const source=sourceFamily===0?Math.floor(i/N):sourceFamily===1?i%N:regions[i];
     const target=targetFamily===0?Math.floor(i/N):targetFamily===1?i%N:regions[i];
     if(!group.includes(source)&&(mask&(1<<target))&&remove(i)){made=true;operations++;}
    }
    return made;
   }
   for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){
    if(eliminate([a,b],masks[a]|masks[b]))changed=true;
    for(let c=b+1;c<N;c++)if(eliminate([a,b,c],masks[a]|masks[b]|masks[c]))changed=true;
   }
  }
  if(!changed)break;
 }
 return {solved:chosen.size===N,contradiction:false,operations};
}
function makePuzzle(){
 const solution=makeSolution(),regions=makeRegions(solution);
 const safe=new Set(solution.map((c,r)=>r*N+c));
 let clues=Array.from({length:SIZE},(_,i)=>i).filter(i=>!safe.has(i));
 const order=shuffle([...clues]),target=39+rand(6);
 // Start with an obvious puzzle and remove hints while a strict logic solver
 // can still finish without search/guessing. At least ~39-44 pre-crosses remain.
 for(const i of order){
  if(clues.length<=target)break;
  const trial=clues.filter(x=>x!==i);
  if(logicalSolve(regions,trial).solved)clues=trial;
 }
 if(!logicalSolve(regions,clues).solved)throw Error('논리 퍼즐 생성 실패');
 return {solution,regions,clues,variantOffset:rand(4),difficulty:'normal-and-group'};
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
const api={N,SIZE,makePuzzle,isSolved,solutionCount,logicalSolve};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhantomCore=api;
})(typeof window!=='undefined'?window:globalThis);
