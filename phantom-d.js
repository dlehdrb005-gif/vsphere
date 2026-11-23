/* Phantom D: private boards, host-verified race, shared Firebase room transport. */
'use strict';
(() => {
 const C=window.PhantomCore,$=id=>document.getElementById(id),PREFIX='vsphere-ct-v1-';
 const CODE=/^[A-HJ-NP-Z2-9]{8}$/;
 const palette=['#d7c4db','#f4d5bc','#d1e2d0','#c5d9ee','#efe0a9','#dec9bd','#c3d5d9','#ead0de','#d6d5ef','#dfdbb9','#c9d6c1'];
 const assets=['phantom-1.png','phantom-2.png','phantom-3.png','phantom-4.png'];
 let room=null,peer=null,connection=null,account=null,mode=1,marks=Array(C.SIZE).fill(0);
 let boardData=null,phase='waiting',solo=false,startedAt=0,winner=null,round=0,roomCode='',isHost=false,busy=false,selection=0;
 const connections=new Map();
 function say(s,error=false){$('status').textContent=s;$('status').classList.toggle('warning',error);}
 function name(){const s=$('nick').value.trim().replace(/[<>]/g,'').slice(0,20);if(!s){say('탐정 닉네임을 입력해주세요.',true);$('nick').focus();return null;}try{localStorage.setItem('vsphere-phantom-name',s);}catch(_){ }return s;}
 function randomCode(){const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...crypto.getRandomValues(new Uint8Array(8))].map(v=>abc[v%abc.length]).join('');}
 function resetMarks(){marks=Array(C.SIZE).fill(0);updateBoard();}
 function progress(){return marks.filter(x=>x===1).length;}
 function getCols(){const cols=[];for(let r=0;r<C.N;r++){const row=[];for(let c=0;c<C.N;c++)if(marks[r*C.N+c]===1)row.push(c);if(row.length!==1)return null;cols.push(row[0]);}return cols;}
 function canPlay(){return phase==='playing'&&!!boardData;}
 function renderBoard(){
  const host=$('board');host.replaceChildren();
  if(!boardData){for(let i=0;i<C.SIZE;i++){const tile=document.createElement('button');tile.type='button';tile.className='cell';tile.disabled=true;tile.style.setProperty('--tile-color',palette[(Math.floor(i/C.N)+Math.floor(i%C.N/2))%palette.length]);host.append(tile);}return;}
  const clueSet=new Set(boardData.clues);
  for(let i=0;i<C.SIZE;i++){
   const reg=boardData.regions[i],r=Math.floor(i/C.N),c=i%C.N;
   const tile=document.createElement('button');tile.type='button';tile.className='cell';tile.dataset.i=String(i);
   tile.style.setProperty('--tile-color',palette[reg%palette.length]);
   tile.style.borderTopWidth=(r===0||boardData.regions[i-C.N]!==reg)?'3px':'1px';
   tile.style.borderBottomWidth=(r===C.N-1||boardData.regions[i+C.N]!==reg)?'3px':'1px';
   tile.style.borderLeftWidth=(c===0||boardData.regions[i-1]!==reg)?'3px':'1px';
   tile.style.borderRightWidth=(c===C.N-1||boardData.regions[i+1]!==reg)?'3px':'1px';
   tile.disabled=!canPlay()||clueSet.has(i);
   tile.setAttribute('aria-label',`${r+1}행 ${c+1}열 ${clueSet.has(i)?'배제 단서':marks[i]===1?'괴도 표시':marks[i]===2?'소거 표시':'빈 칸'}`);
   if(clueSet.has(i)){tile.classList.add('clue');const x=document.createElement('span');x.className='cross';x.textContent='×';tile.append(x);}
   else if(marks[i]===1){const img=document.createElement('img');img.alt='괴도 D';img.src=assets[(r+boardData.variantOffset)%assets.length];tile.append(img);}
   else if(marks[i]===2){const x=document.createElement('span');x.className='cross';x.textContent='×';tile.append(x);}
   host.append(tile);
  }
 }
 function updateBoard(){
  renderBoard();$('found').textContent=progress();
  $('thiefTool').setAttribute('aria-pressed',String(mode===1));
  $('crossTool').setAttribute('aria-pressed',String(mode===2));
  $('checkBtn').disabled=!canPlay();$('clearBtn').disabled=!canPlay();
  $('phase').textContent=phase==='playing'?'🔎 수사 진행 중':phase==='ended'?'🏆 사건 해결!':room?'탐정 대기실':'사건 접수 대기';
  $('clock').textContent='00:00';
  if(startedAt&&phase!=='waiting')updateClock();
 }
 function updateClock(){if(!startedAt)return;const seconds=Math.max(0,Math.floor((Date.now()-startedAt)/1000)),m=Math.floor(seconds/60),s=seconds%60;$('clock').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
 function mark(i,what=mode){if(!canPlay()||boardData.clues.includes(i))return;marks[i]=marks[i]===what?0:what;selection=i;updateBoard();}
 function showResult(title,detail){$('result').hidden=false;$('resultTitle').textContent=title;$('resultDetail').textContent=detail;}
 function hideResult(){$('result').hidden=true;}
 function errorText(err){
  if(err?.code==='permission-denied')return 'Firebase 권한이 거부됐어요. 컬러타일 방 권한 설정을 확인해주세요.';
  if(err?.code==='resource-exhausted')return 'Firebase 무료 이용 한도에 도달했어요.';
  if(err?.code==='unauthenticated')return 'VSPHERE에 로그인한 뒤 다시 시도해주세요.';
  if(err?.type==='peer-unavailable')return '참가할 방이 없거나 방장이 접속 중이지 않아요.';
  if(err?.type==='unavailable-id')return '방 코드가 겹쳤어요. 다시 만들어 주세요.';
  return '방 연결에 실패했어요. 인터넷 연결과 로그인을 확인해주세요.';
 }
 function setBusy(value){busy=value;for(const id of ['createBtn','joinBtn','soloBtn'])$(id).disabled=value;}
 async function signedUser(){const u=await window.FirebaseRoomPeer?.getUser();if(!u)throw {code:'unauthenticated'};return u;}
 function playersView(players){
  $('players').replaceChildren();for(const p of players){
   const span=document.createElement('span');span.className='player'+(p.ready?' ready':'')+(winner?.uid===p.uid?' winner':'');
   span.textContent=(p.host?'👑 ':'')+p.name+(winner?.uid===p.uid?' · 승리':p.ready?' · 준비':'');$('players').append(span);
  }
  $('roomCount').textContent=`${players.length} / 8명 참가`;
 }
 function state(){
  return {type:'state',phase:room.phase,round:room.round,
   game:room.game?{regions:room.game.regions,clues:room.game.clues,variantOffset:room.game.variantOffset}:null,
   startedAt:room.startedAt,winner:room.winner,players:[...room.players.values()]};
 }
 function broadcast(){if(!room||!isHost)return;const message=state();for(const conn of connections.values())if(conn.open)conn.send(message);applyState(message);}
 function applyState(info){
  const changed=round!==info.round||phase!==info.phase;
  room&&(room.phase=info.phase,room.round=info.round,room.startedAt=info.startedAt,room.winner=info.winner);
  if(changed)marks=Array(C.SIZE).fill(0);
  round=info.round;phase=info.phase;boardData=info.game;winner=info.winner;startedAt=info.startedAt;
  playersView(info.players||[]);
  const mine=info.players?.find(p=>p.uid===account?.uid);
  $('readyBtn').hidden=isHost||phase!=='lobby';
  $('readyBtn').textContent=mine?.ready?'준비 취소':'준비하기';
  $('startBtn').hidden=!isHost||phase!=='lobby';
  $('startBtn').disabled=info.players?.some(p=>!p.host&&!p.ready)||!info.players?.length;
  $('nextBtn').hidden=!isHost||phase!=='ended';
  $('roomCode').textContent=roomCode;
  $('setup').hidden=true;$('roomControls').hidden=false;
  hideResult();if(phase==='ended'){
   showResult(winner?.name?`🏆 ${winner.name} 탐정 승리!`:'수사 종료','가장 먼저 모든 괴도 D의 위치를 찾아 사건을 해결했어요.');
   say('사건 해결! 방장이 다음 사건을 준비할 수 있습니다.');
  }else if(phase==='playing')say('수사 중! 다른 탐정보다 먼저 11곳을 모두 찾아 제출하세요.');
  else say('방장이 시작하면 같은 사건을 각자 풀게 됩니다. 참가자는 준비 버튼을 눌러주세요.');
  updateBoard();
 }
 function leave(text='방에서 나왔습니다.'){
  if(connection){connection.close();connection=null;}
  for(const conn of connections.values())conn.close();connections.clear();
  if(peer){peer.destroy();peer=null;}
  room=null;roomCode='';isHost=false;solo=false;phase='waiting';boardData=null;winner=null;round=0;startedAt=0;
  $('setup').hidden=false;$('roomControls').hidden=true;hideResult();setBusy(false);resetMarks();say(text);
 }
 function win(uid,nameValue){
  if(!room||room.phase!=='playing')return;
  room.phase='ended';room.winner={uid,name:nameValue};broadcast();
 }
 async function onHostMessage(conn,msg){
  if(!room||!isHost||!msg||typeof msg!=='object')return;
  if(msg.type==='join'){
   if(conn.playerUid)return;
   const snap=await conn.ref.get().catch(()=>null);
   const uid=snap?.data()?.guestUid;
   if(!uid||msg.uid!==uid||!room||room.phase!=='lobby'||room.players.size>=8||room.players.has(uid)){conn.close();return;}
   conn.playerUid=uid;room.players.set(uid,{uid,name:String(msg.name||'탐정').slice(0,20),ready:false,host:false});
   connections.set(conn.ref.id,conn);broadcast();
  }else if(conn.playerUid&&room.players.has(conn.playerUid)){
   const uid=conn.playerUid;
   if(msg.type==='ready'&&room.phase==='lobby'){room.players.get(uid).ready=!room.players.get(uid).ready;broadcast();}
   if(msg.type==='solve'&&room.phase==='playing'&&msg.round===room.round&&C.isSolved(msg.cols,room.game.regions,room.game.clues)){
    win(uid,room.players.get(uid).name);
   }
  }
 }
 function hostSetup(code,playerName){
  roomCode=code;isHost=true;
  room={phase:'lobby',round:0,game:null,startedAt:0,winner:null,players:new Map([[account.uid,{uid:account.uid,name:playerName,ready:true,host:true}]])};
  peer=new FirebaseRoomPeer(PREFIX+code);
  peer.on('open',()=>{setBusy(false);broadcast();say('방을 만들었어요! 초대 링크를 공유해주세요.');});
  peer.on('connection',conn=>{
   conn.on('data',msg=>{void onHostMessage(conn,msg);});
   conn.on('close',()=>{connections.delete(conn.ref.id);if(conn.playerUid&&room?.players.has(conn.playerUid)){
    room.players.delete(conn.playerUid);broadcast();
   }});
  });
  peer.on('error',err=>leave(errorText(err)));
 }
 function guestSetup(code,playerName){
  roomCode=code;isHost=false;room={phase:'lobby'};peer=new FirebaseRoomPeer(PREFIX+'guest-'+crypto.randomUUID());
  peer.on('open',()=>{
   connection=peer.connect(PREFIX+code);
   connection.on('open',()=>{connection.send({type:'join',uid:account.uid,name:playerName});say('수사방에 입장하고 있습니다...');});
   connection.on('data',msg=>{if(msg?.type==='state')applyState(msg);});
   connection.on('close',()=>leave('방과 연결이 끊겼습니다. 방장이 나갔거나 수사방이 닫혔어요.'));
   connection.on('error',err=>leave(errorText(err)));
  });
  peer.on('error',err=>leave(errorText(err)));
 }
 async function connect(asHost){
  if(busy||room)return;
  const playerName=name();if(!playerName)return;
  const code=asHost?randomCode():$('roomInput').value.trim().toUpperCase();
  if(!CODE.test(code)){say('8자리 방 코드를 정확히 입력해주세요.',true);return;}
  setBusy(true);
  try{account=await signedUser();if(asHost)hostSetup(code,playerName);else guestSetup(code,playerName);}
  catch(err){setBusy(false);say(errorText(err),true);}
 }
 function startRound(){
  if(!room||!isHost||room.phase!=='lobby'||[...room.players.values()].some(p=>!p.host&&!p.ready))return;
  say('새 사건을 생성하는 중...');
  // Yield so the interface can paint before puzzle uniqueness checking.
  setTimeout(()=>{if(!room||!isHost||room.phase!=='lobby')return;
   try{room.game=C.makePuzzle();room.round++;room.startedAt=Date.now();room.phase='playing';room.winner=null;broadcast();}
   catch(err){say('문제 생성에 실패했어요. 수사 시작을 다시 눌러주세요.',true);}
  },20);
 }
 function soloStart(){
  if(room||busy)return;
  say('단서를 생성하는 중...');
  setTimeout(()=>{if(room)return;solo=true;boardData=C.makePuzzle();marks=Array(C.SIZE).fill(0);round++;
   phase='playing';winner=null;startedAt=Date.now();hideResult();updateBoard();say('혼자 수사 중입니다. 11곳의 괴도 D를 찾아보세요.');
  },20);
 }
 function submit(){
  if(!canPlay())return;
  const cols=getCols();
  if(!cols){say('각 가로줄마다 괴도 D를 한 명씩 표시해주세요.',true);return;}
  if(!C.isSolved(cols,boardData.regions,boardData.clues)){say('아직 규칙에 맞지 않는 위치가 있어요. 가로·세로·색 구역·대각선 인접을 확인하세요.',true);return;}
  if(solo){
   phase='ended';winner={uid:'solo',name:name()||'탐정'};updateBoard();
   showResult('💎 사건 해결!','괴도 D의 모든 흔적을 찾아냈습니다. 다른 사건은 ‘혼자 수사하기’로 다시 시작하세요.');
   say('축하합니다! 괴도 D를 찾았어요.');
  }else if(isHost){win(account.uid,room.players.get(account.uid).name);}
  else if(connection?.open){connection.send({type:'solve',round,cols});say('수사 결과를 방장에게 제출했어요. 판정을 확인하는 중입니다.');}
  else say('방과 연결되지 않았어요.',true);
 }
 $('createBtn').onclick=()=>connect(true);$('joinBtn').onclick=()=>connect(false);
 $('leaveBtn').onclick=()=>leave();$('soloBtn').onclick=()=>{if(solo){hideResult();}soloStart();};
 $('readyBtn').onclick=()=>{if(connection?.open&&phase==='lobby')connection.send({type:'ready'});};
 $('startBtn').onclick=startRound;
 $('nextBtn').onclick=()=>{if(!room||!isHost||room.phase!=='ended')return;room.phase='lobby';room.game=null;room.startedAt=0;room.winner=null;for(const p of room.players.values())p.ready=p.host;broadcast();};
 $('copyBtn').onclick=async()=>{const link=new URL('phantom-d.html',location.href);link.searchParams.set('room',roomCode);
  try{await navigator.clipboard.writeText(link.href);say('초대 링크를 복사했어요!');}
  catch(_){say('초대 링크: '+link.href);}
 };
 $('thiefTool').onclick=()=>{mode=1;updateBoard();};$('crossTool').onclick=()=>{mode=2;updateBoard();};
 $('clearBtn').onclick=()=>{if(canPlay())resetMarks();};$('checkBtn').onclick=submit;
 $('board').addEventListener('click',event=>{const cell=event.target.closest('[data-i]');if(cell)mark(Number(cell.dataset.i));});
 $('board').addEventListener('contextmenu',event=>{const cell=event.target.closest('[data-i]');if(cell){event.preventDefault();mark(Number(cell.dataset.i),2);}});
 $('board').addEventListener('keydown',event=>{
  const cell=event.target.closest('[data-i]');if(!cell)return;const i=Number(cell.dataset.i);
  if(event.key==='x'||event.key==='X'){mark(i,2);event.preventDefault();}
 });
 setInterval(()=>{if(startedAt&&phase==='playing')updateClock();},500);
 try{$('nick').value=localStorage.getItem('vsphere-phantom-name')||'';}catch(_){}
 const invite=new URLSearchParams(location.search).get('room');
 if(invite&&CODE.test(invite.toUpperCase()))$('roomInput').value=invite.toUpperCase();
 renderBoard();updateBoard();
})();
