/* Phantom D: validated 9x9 / 10x10 / 11x11 puzzle solvers. */
(function(root){
'use strict';
function createSolver(size){
const N=size,SIZE=N*N,rand=n=>Math.floor(Math.random()*n);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
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
function logicalSolve(regions,clues=[],audit=false){
 const log=audit?[]:null;
 let reason='ordinary',reasonUnits=[],passIndex=0;
 function record(type,unitIds,cell,placed=false){
  if(!log)return;
  const signature=type+':'+unitIds.join(',');
  const last=log[log.length-1];
  if(!placed&&last&&!last.placed&&last.pass===passIndex&&last.signature===signature){
   last.eliminated.push(cell);return;
  }
  log.push({pass:passIndex,type,units:unitIds.slice(),eliminated:placed?[]:[cell],placed:placed?cell:null,signature});
 }
 function finish(result){
  if(!log)return result;
  const trace=log.map(({signature,...step})=>step);
  const counts={single:0,ordinary:0,adjacent:0,locked:0,pair:0,triple:0};
  for(const step of trace)if(counts[step.type]!==undefined)counts[step.type]++;
  const firstTwo=trace.filter(e=>e.placed!==null).slice(0,2);
  const firstConfirmationPass=firstTwo[0]?.pass??null;
  const firstCrosses=trace.filter(e=>e.pass===0).reduce((sum,e)=>sum+e.eliminated.length,0);
  const score=counts.single+counts.ordinary+counts.locked*2+
    counts.adjacent*3+counts.pair*3+counts.triple*5+
    Math.max(0,(firstConfirmationPass??10)-1)*4;
  return {...result,trace,metrics:{steps:trace.length,score,types:counts,
   earlyEliminations:firstCrosses,firstConfirmationPass,placements:trace.filter(e=>e.placed!==null).length}};
 }

 const allowed=new Uint8Array(SIZE).fill(1),chosen=new Set();
 const units=[...Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>r*N+c)),
              ...Array.from({length:N},(_,c)=>Array.from({length:N},(_,r)=>r*N+c)),
              ...Array.from({length:N},(_,g)=>Array.from({length:SIZE},(_,i)=>i).filter(i=>regions[i]===g))];
 for(const i of clues)if(i>=0&&i<SIZE)allowed[i]=0;
 function remove(i){if(!allowed[i])return false;allowed[i]=0;record(reason,reasonUnits,i);return true;}
 function place(i){
  if(!allowed[i])return false;
  for(const j of chosen){const r=Math.floor(i/N),c=i%N,rr=Math.floor(j/N),cc=j%N;
   if(r===rr||c===cc||regions[i]===regions[j]||(Math.abs(r-rr)<=1&&Math.abs(c-cc)<=1))return false;
  }
  chosen.add(i);record('single',reasonUnits,i,true);const r=Math.floor(i/N),c=i%N;
  for(let j=0;j<SIZE;j++)if(j!==i&&(Math.floor(j/N)===r||j%N===c||regions[j]===regions[i]||
    (Math.abs(Math.floor(j/N)-r)<=1&&Math.abs(j%N-c)<=1)))remove(j);
  return true;
 }
 let operations=0;
 for(let pass=0;pass<150;pass++){
  passIndex=pass;
  let changed=false;
  // Standard removal: if a row, column or color region has one candidate, mark it.
  for(let u=0;u<units.length;u++){
   const unit=units[u];reason='ordinary';reasonUnits=[u];
   const candidates=unit.filter(i=>allowed[i]);
   if(!candidates.length)return finish({solved:false,contradiction:true,operations});
   if(candidates.length===1&&!chosen.has(candidates[0])){if(!place(candidates[0]))return finish({solved:false,contradiction:true,operations});changed=true;operations++;}
  }
  if(chosen.size===N)return finish({solved:true,contradiction:false,operations,solution:([...chosen].sort((a,b)=>a-b).map(i=>i%N))});
  // Adjacent rows: an impossible neighbor pair is an ordinary deterministic exclusion.
  reason='adjacent';
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
   const i=r*N+c;if(!allowed[i])continue;
   for(const nr of [r-1,r+1])if(nr>=0&&nr<N){
    reasonUnits=[r,nr];
    let viable=false;
    for(let nc=0;nc<N;nc++)if(Math.abs(nc-c)>1&&allowed[nr*N+nc]){viable=true;break;}
    if(!viable){if(remove(i)){changed=true;operations++;}break;}
   }
  }
  // Symmetric neighbor-column elimination for rotated puzzles.
  for(let c=0;c<N;c++)for(let r=0;r<N;r++){
   const i=r*N+c;if(!allowed[i])continue;
   for(const nc of [c-1,c+1])if(nc>=0&&nc<N){
    reasonUnits=[N+c,N+nc];
    let viable=false;
    for(let nr=0;nr<N;nr++)if(Math.abs(nr-r)>1&&allowed[nr*N+nc]){viable=true;break;}
    if(!viable){if(remove(i)){changed=true;operations++;}break;}
   }
  }
  // Common-neighbor exclusion: every possible thief in an adjacent row/column
  // forbids the same target cell. No assumption or backtracking is required.
  reason='adjacent';
  for(let family=0;family<2;family++)for(let source=0;source<N;source++){
   const choices=units[family*N+source].filter(i=>allowed[i]);
   if(!choices.length)return finish({solved:false,contradiction:true,operations});
   for(const target of [source-1,source+1])if(target>=0&&target<N){
    reasonUnits=[family*N+source,family*N+target];
    for(const i of units[family*N+target])if(allowed[i]&&choices.every(j=>
     family===0?Math.abs((i%N)-(j%N))<=1:
      Math.abs(Math.floor(i/N)-Math.floor(j/N))<=1)){
     if(remove(i)){changed=true;operations++;}
    }
   }
  }
  // Locked candidates: all choices of one unit lie in one intersecting other unit.
  for(let a=0;a<units.length;a++){
   const opts=units[a].filter(i=>allowed[i]);if(!opts.length)return finish({solved:false,contradiction:true,operations});
   for(let b=0;b<units.length;b++)if(a!==b&&opts.every(i=>units[b].includes(i))){
    reason='locked';reasonUnits=[a,b];
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
    reason=group.length===2?'pair':'triple';reasonUnits=[sourceFamily,targetFamily,...group];
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
 return finish({solved:chosen.size===N,contradiction:false,operations,solution:chosen.size===N?([...chosen].sort((a,b)=>a-b).map(i=>i%N)):null});
}

const NEAR=Array.from({length:SIZE},(_,i)=>[i-N,i+N,i%N?i-1:-1,i%N<N-1?i+1:-1].filter(j=>j>=0&&j<SIZE));
let lastBase=-1;
function connectedColor(board,g,seed){
 if(board[seed]!==g)return false;
 const seen=new Set([seed]),q=[seed],count=board.filter(x=>x===g).length;
 for(let p=0;p<q.length;p++)for(const j of NEAR[q[p]])if(board[j]===g&&!seen.has(j)){seen.add(j);q.push(j);}
 return seen.size===count;
}
function validShape(board,answer){
 if(!Array.isArray(board)||board.length!==SIZE||!Array.isArray(answer)||answer.length!==N)return false;
 const counts=Array(N).fill(0),seeds=Array(N).fill(-1);
 for(const g of board){if(!Number.isInteger(g)||g<0||g>=N)return false;counts[g]++;}
 if(counts.filter(v=>v===0).length||counts.filter(v=>v===1).length!==1)return false;
 if(root.PhantomBeginnerBanks?.[N]?.length){
  if(counts.some(v=>v!==1&&v<2)||Math.max(...counts)>Math.ceil(SIZE*.42))return false;
 }else{
 if(N===11){
  if(counts.filter(v=>v>=22&&v<=32).length!==1||counts.filter(v=>v>=8&&v<=13).length!==9)return false;
 }else{
  const sorted=[...counts].sort((a,b)=>a-b),largest=sorted[N-1],second=sorted[N-2];
  if(N===9&&(sorted[1]<4||largest<16||largest>27||second>16))return false;
  if(N===10&&(sorted[1]<5||largest<22||largest>33||second>18))return false;
 }
 }
 if(!isSolved(answer,board,[]))return false;
 for(let r=0;r<N;r++)seeds[board[r*N+answer[r]]]=r*N+answer[r];
 return seeds.every((seed,g)=>seed>=0&&connectedColor(board,g,seed));
}
function transformLayout(layout){
 if(typeof layout!=='string'||layout.length!==SIZE||!/^[0-9a-z]+$/.test(layout))throw Error('퍼즐 원본 형식 오류');
 const mirror=rand(2),turns=rand(4),remap=shuffle(Array.from({length:N},(_,i)=>i));
 const out=Array(SIZE);
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  let y=r,x=mirror?N-1-c:c;
  for(let t=0;t<turns;t++){const old=y;y=x;x=N-1-old;}
  out[y*N+x]=remap[parseInt(layout[r*N+c],36)];
 }
 return out;
}
function varyBorders(board,answer){
 const queen=new Set(answer.map((c,r)=>r*N+c)),sizes=Array(N).fill(0);
 for(const g of board)sizes[g]++;
 const singleton=sizes.indexOf(1);
 for(let step=0;step<1+rand(3);step++){
  let moved=false;
  for(let attempts=0;attempts<32;attempts++){
   const i=rand(SIZE),from=board[i],neighbors=NEAR[i],to=board[neighbors[rand(neighbors.length)]];
   if(queen.has(i)||from===singleton||to===singleton||from===to)continue;
   const minimum=sizes[from]>=22?22:8,maximum=sizes[to]>=22?32:13;
   if(sizes[from]<=minimum||sizes[to]>=maximum)continue;
   board[i]=to;
   if(!validShape(board,answer)||!logicalSolve(board,[]).solved){board[i]=from;continue;}
   sizes[from]--;sizes[to]++;moved=true;break;
  }
  if(!moved)break;
 }
}
function makePuzzle(){
 const beginner=root.PhantomBeginnerBanks?.[N];
 const bank=Array.isArray(beginner)&&beginner.length?beginner:(N===11?root.PhantomPuzzleBank:root.PhantomSizeBanks?.[N]);
 if(!Array.isArray(bank)||!bank.length)throw Error('검증된 퍼즐 원본 파일이 없습니다.');
 let i=rand(bank.length);if(bank.length>1&&i===lastBase)i=(i+1+rand(bank.length-1))%bank.length;
 lastBase=i;
 const regions=transformLayout(bank[i]),deduced=logicalSolve(regions,[]);
 if(!deduced.solved||!validShape(regions,deduced.solution))throw Error('원본 퍼즐 검사 실패');
 const solution=deduced.solution;
 if(!beginner?.length&&N===11)varyBorders(regions,solution);
 if(!validShape(regions,solution)||!logicalSolve(regions,[]).solved||solutionCount(regions,[],2)!==1)
  throw Error('변형 퍼즐 검사 실패');
 return {size:N,solution,regions,clues:[],variantOffset:rand(4),difficulty:N===9?'easy':N===10?'normal':'advanced'};
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

function analyzePuzzle(regions,clues=[]){
 const proof=logicalSolve(regions,clues,true);
 const sizes=Array(N).fill(0),masks=Array.from({length:N},()=>[0,0]);
 for(let i=0;i<SIZE;i++){
  const g=regions[i];if(!Number.isInteger(g)||g<0||g>=N)continue;
  sizes[g]++;masks[g][0]|=1<<Math.floor(i/N);masks[g][1]|=1<<(i%N);
 }
 const popcount=mask=>{let count=0;for(;mask;mask&=mask-1)count++;return count;};
 const singleton=sizes.indexOf(1);
 const straight=[],pair=[],triple=[];
 for(let g=0;g<N;g++)if(g!==singleton)for(let axis=0;axis<2;axis++){
  if(popcount(masks[g][axis])!==1)continue;
  const lockedCells=[];
  for(let i=0;i<SIZE;i++)if(regions[i]!==g&&(masks[g][axis]&(1<<(axis===0?Math.floor(i/N):i%N))))lockedCells.push(i);
  if(lockedCells.length)straight.push({color:g,axis:axis===0?'row':'column',
    units:Array.from({length:N},(_,u)=>u).filter(u=>masks[g][axis]&(1<<u)),eliminated:lockedCells});
 }
 for(let a=0;a<N;a++)for(let b=a+1;b<N;b++)if(a!==singleton&&b!==singleton)
  for(let axis=0;axis<2;axis++){
   const mask=masks[a][axis]|masks[b][axis];
   if(popcount(mask)!==2)continue;
   const cells=[];
   for(let i=0;i<SIZE;i++)if(regions[i]!==a&&regions[i]!==b&&
    (mask&(1<<(axis===0?Math.floor(i/N):i%N))))cells.push(i);
   if(cells.length)pair.push({colors:[a,b],axis:axis===0?'rows':'columns',
    units:Array.from({length:N},(_,u)=>u).filter(u=>mask&(1<<u)),eliminated:cells});
  }
 for(let a=0;a<N;a++)for(let b=a+1;b<N;b++)for(let c=b+1;c<N;c++)
  if(a!==singleton&&b!==singleton&&c!==singleton)
   for(let axis=0;axis<2;axis++){
    const mask=masks[a][axis]|masks[b][axis]|masks[c][axis];
    if(popcount(mask)!==3)continue;
    const cells=[];
    for(let i=0;i<SIZE;i++)if(regions[i]!==a&&regions[i]!==b&&regions[i]!==c&&
     (mask&(1<<(axis===0?Math.floor(i/N):i%N))))cells.push(i);
    if(cells.length)triple.push({colors:[a,b,c],axis:axis===0?'rows':'columns',
     units:Array.from({length:N},(_,u)=>u).filter(u=>mask&(1<<u)),eliminated:cells});
   }
 // Union of immediate, unconditional eliminations; no guesses or hidden answers.
 const initial=new Set();
 if(singleton>=0){
  const certain=regions.indexOf(singleton),r=Math.floor(certain/N),c=certain%N;
  for(let i=0;i<SIZE;i++)if(i!==certain&&(Math.floor(i/N)===r||i%N===c||
   regions[i]===singleton||(Math.abs(Math.floor(i/N)-r)<=1&&Math.abs(i%N-c)<=1)))initial.add(i);
 }
 for(const pattern of [...straight,...pair])for(const i of pattern.eliminated)initial.add(i);
 const familyNames=['row','column','color'];
 const trace=(proof.trace||[]).map(step=>{
  const [a,b,...unitIds]=step.units;
  const sources=(step.type==='pair'||step.type==='triple')
   ?{fromFamily:familyNames[a],toFamily:familyNames[b],group:unitIds}
   :step.units.map(unit=>({family:familyNames[Math.floor(unit/N)],index:unit%N}));
  return {...step,sources};
 });
 const metrics={...(proof.metrics||{}),patterns:{straight:straight.length,pair:pair.length,triple:triple.length},
  initialAvailable:initial.size,singletonCount:sizes.filter(v=>v===1).length,
  maxGroupingSize:(proof.metrics?.types?.triple||0)>0?3:(proof.metrics?.types?.pair||0)>0?2:1,
  stepCount:trace.length};
 return {...proof,trace,metrics,patterns:{straight,pair,triple}};
}
return {N,SIZE,makePuzzle,isSolved,solutionCount,logicalSolve,analyzePuzzle};
}
const modes=new Map();
function forSize(size){
 if(![9,10,11].includes(size))throw Error('지원하지 않는 게임판 크기입니다.');
 if(!modes.has(size))modes.set(size,createSolver(size));
 return modes.get(size);
}
const primary=forSize(11);
primary.forSize=forSize;
if(typeof module!=='undefined'&&module.exports)module.exports=primary;else root.PhantomCore=primary;
})(typeof window!=='undefined'?window:globalThis);
