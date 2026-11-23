/* Phantom D: private boards, host-verified race, shared Firebase room transport. */
'use strict';
(() => {
 const C=window.PhantomCore,$=id=>document.getElementById(id),PREFIX='vsphere-ct-v1-';
 const CODE=/^[A-HJ-NP-Z2-9]{8}$/;
 const palette=['#e5acd3','#f5be79','#78c88a','#8bc6eb','#b394e0','#e9d668','#61bfb5','#ed998e','#7c98db','#aacb70','#c7b4a5'];
 const assets=['phantom-1.png','phantom-2.png','phantom-3.png','phantom-4.png'];
 let room=null,peer=null,connection=null,account=null,marks=Array(C.SIZE).fill(0);
 let misses=0,eliminated=false,pendingGuess=null,confirmed=new Set(),attempted=new Set();
 let lastClick=null,clickTimer=null,lastGuess=null;
 let boardData=null,phase='waiting',solo=false,startedAt=0,winner=null,round=0,roomCode='',isHost=false,busy=false,selection=0;
 const connections=new Map();
 let soundEnabled=true,audioContext=null;
 try{soundEnabled=localStorage.getItem('vsphere-phantom-sound')!=='off';}catch(_){}
 function soundEngine(){
  if(!soundEnabled)return null;
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  if(!AudioEngine)return null;
  try{
   if(!audioContext)audioContext=new AudioEngine();
   if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
   return audioContext;
  }catch(_){return null;}
 }
 function playSound(kind){
  if(!soundEnabled)return;
  const ctx=soundEngine();if(!ctx)return;
  const notes=kind==='cross'?[[500,0,.035,'triangle',.035]]:
   kind==='wrong'?[[330,0,.12,'sawtooth',.045],[220,.105,.15,'sawtooth',.040]]:
   [[560,0,.08,'sine',.065],[720,.09,.10,'sine',.075],[980,.20,.16,'sine',.075]];
  for(const [frequency,offset,duration,wave,volume] of notes){
   try{
    const o=ctx.createOscillator(),g=ctx.createGain(),start=ctx.currentTime+offset;
    o.type=wave;o.frequency.setValueAtTime(frequency,start);
    g.gain.setValueAtTime(.0001,start);
    g.gain.linearRampToValueAtTime(volume,start+.008);
    g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+duration+.012);
   }catch(_){}
  }
 }
 function showSoundSetting(){
  $('soundBtn').textContent=soundEnabled?'🔊 효과음 켜짐':'🔇 효과음 꺼짐';
  $('soundBtn').setAttribute('aria-pressed',String(soundEnabled));
 }
 $('soundBtn').onclick=()=>{
  soundEnabled=!soundEnabled;
  try{localStorage.setItem('vsphere-phantom-sound',soundEnabled?'on':'off');}catch(_){}
  showSoundSetting();
  if(soundEnabled)playSound('cross');
 };
 showSoundSetting();
 function say(s,error=false){$('status').textContent=s;$('status').classList.toggle('warning',error);}
 function name(){const s=$('nick').value.trim().replace(/[<>]/g,'').slice(0,20);if(!s){say('탐정 닉네임을 입력해주세요.',true);$('nick').focus();return null;}try{localStorage.setItem('vsphere-phantom-name',s);}catch(_){ }return s;}
 function randomCode(){const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...crypto.getRandomValues(new Uint8Array(8))].map(v=>abc[v%abc.length]).join('');}
 function resetMarks(){marks=Array(C.SIZE).fill(0);for(const i of confirmed)marks[i]=1;updateBoard();}
 function resetRound(){misses=0;eliminated=false;pendingGuess=null;confirmed=new Set();attempted=new Set();lastClick=null;lastGuess=null;clearTimeout(clickTimer);marks=Array(C.SIZE).fill(0);}
 function progress(){return confirmed.size;}
 function canPlay(){return phase==='playing'&&!!boardData&&!eliminated;}
 function renderBoard(){
  const host=$('board');host.replaceChildren();
  if(!boardData){for(let i=0;i<C.SIZE;i++){const tile=document.createElement('button');tile.type='button';tile.className='cell';tile.disabled=true;tile.style.setProperty('--tile-color',palette[(Math.floor(i/C.N)+Math.floor(i%C.N/2))%palette.length]);host.append(tile);}return;}
  for(let i=0;i<C.SIZE;i++){
   const reg=boardData.regions[i],r=Math.floor(i/C.N),c=i%C.N;
   const tile=document.createElement('button');tile.type='button';tile.className='cell';tile.dataset.i=String(i);
   tile.style.setProperty('--tile-color',palette[reg%palette.length]);
   tile.disabled=!canPlay()||confirmed.has(i);
   tile.setAttribute('aria-label',`${r+1}행 ${c+1}열 ${marks[i]===1?'괴도 발견':marks[i]===2?'소거 표시':'빈 칸'}`);
   tile.title=`${r+1}행 ${c+1}열`;
   if(marks[i]===1){const img=document.createElement('img');img.alt='괴도 D';img.src=assets[(r+boardData.variantOffset)%assets.length];tile.append(img);}
   else if(marks[i]===2){const x=document.createElement('span');x.className='cross';x.textContent='×';tile.append(x);}
   host.append(tile);
  }
 }
 function updateBoard(){
  renderBoard();$('found').textContent=progress();
  $('misses').textContent=misses;
  $('misses').style.color=misses>=2?'#ff7e89':'';
  $('clearBtn').disabled=!canPlay();
  $('restartSolo').hidden=!solo||phase!=='ended';
  $('phase').textContent=phase==='playing'?(eliminated?'⛔ 수사 실패 · 관전 중':'🔎 수사 진행 중'):phase==='ended'?(winner?'🏆 사건 해결!':'⛔ 사건 종료'):room?'탐정 대기실':'사건 접수 대기';
  $('clock').textContent='00:00';
  if(startedAt&&phase!=='waiting')updateClock();
 }
 function updateClock(){if(!startedAt)return;const seconds=Math.max(0,Math.floor((Date.now()-startedAt)/1000)),m=Math.floor(seconds/60),s=seconds%60;$('clock').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
 function mark(i){
  if(!canPlay()||boardData.clues.includes(i)||confirmed.has(i))return;
  marks[i]=marks[i]===2?0:2;selection=i;playSound('cross');updateBoard();
 }
 function receiveGuess(msg){
  if(!msg||msg.round!==round||!Number.isInteger(msg.index))return;
  pendingGuess=null;attempted.add(msg.index);
  misses=msg.misses;eliminated=Boolean(msg.eliminated);
  if(msg.correct){confirmed.add(msg.index);marks[msg.index]=1;}
  else marks[msg.index]=2;
  updateBoard();
  playSound(msg.correct?'found':'wrong');
  if(eliminated){showResult('⛔ 게임 오버','틀린 위치를 세 번 지목했습니다. 이번 사건은 더 이상 수사할 수 없어요.');
   say('오답 3회! 이번 판은 게임 오버입니다. 다른 탐정의 결과를 기다려주세요.',true);
  }else if(msg.correct){
   say(`✅ 괴도 D 검거! ${confirmed.size}/11명 발견 · 오답 ${misses}/3`);
  }else say(`❌ 해당 칸에는 괴도가 없어요. 오답 ${misses}/3`,true);
 }
 function judge(uid,index,conn=null){
  if(!room||!isHost||room.phase!=='playing'||!Number.isInteger(index)||index<0||index>=C.SIZE||room.game.clues.includes(index))return;
  const p=room.players.get(uid);
  if(!p||p.eliminated)return;
  let guessed=room.guesses.get(uid);
  if(!guessed){guessed=new Set();room.guesses.set(uid,guessed);}
  if(guessed.has(index))return;
  guessed.add(index);
  const row=Math.floor(index/C.N),correct=room.game.solution[row]===index%C.N;
  if(correct)p.found++;else p.misses++;
  if(p.misses>=3)p.eliminated=true;
  const result={type:'guess-result',round:room.round,index,correct,misses:p.misses,found:p.found,eliminated:p.eliminated};
  if(conn)conn.send(result);else receiveGuess(result);
  if(correct&&p.found===C.N)win(uid,p.name);
  else if([...room.players.values()].every(x=>x.eliminated)){room.phase='ended';room.winner=null;broadcast();}
  else broadcast();
 }
 function guess(i){
  if(!canPlay()||boardData.clues.includes(i)||confirmed.has(i)||attempted.has(i)||pendingGuess!==null)return;
  const timestamp=Date.now();
  if(lastGuess&&lastGuess.i===i&&timestamp-lastGuess.at<650)return;
  lastGuess={i,at:timestamp};pendingGuess=i;
  if(solo){
   const row=Math.floor(i/C.N),correct=boardData.solution[row]===i%C.N;
   if(correct)confirmed.add(i);else misses++;
   const result={type:'guess-result',round,index:i,correct,misses,eliminated:misses>=3};
   receiveGuess(result);
   if(correct&&confirmed.size===C.N){
    phase='ended';winner={uid:'solo',name:'탐정'};updateBoard();
    showResult('💎 사건 해결!','괴도 D의 모든 흔적을 찾아냈어요! 새로운 판도 도전해 보세요.');
    say('축하합니다! 괴도 D의 모든 위치를 찾아냈어요.');
   }
  }else if(isHost)judge(account.uid,i);
  else if(connection?.open)connection.send({type:'guess',round,index:i});
  else{pendingGuess=null;say('방 연결을 확인해주세요.',true);}
 }
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
   span.textContent=(p.host?'👑 ':'')+p.name+(winner?.uid===p.uid?' · 승리':p.eliminated?' · 게임오버':phase==='playing'?` · ${p.found}/11 · 실수 ${p.misses}/3`:p.ready?' · 준비':'');$('players').append(span);
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
  const changed=round!==info.round||(info.phase==='lobby'&&phase!=='lobby');
  room&&(room.phase=info.phase,room.round=info.round,room.startedAt=info.startedAt,room.winner=info.winner);
  if(changed)resetRound();
  round=info.round;phase=info.phase;boardData=info.game;winner=info.winner;startedAt=info.startedAt;
  playersView(info.players||[]);
  const mine=info.players?.find(p=>p.uid===account?.uid);
  if(mine){misses=mine.misses||0;eliminated=!!mine.eliminated;}
  $('readyBtn').hidden=isHost||phase!=='lobby';
  $('readyBtn').textContent=mine?.ready?'준비 취소':'준비하기';
  $('startBtn').hidden=!isHost||phase!=='lobby';
  $('startBtn').disabled=info.players?.some(p=>!p.host&&!p.ready)||!info.players?.length;
  $('nextBtn').hidden=!isHost||phase!=='ended';
  $('roomCode').textContent=roomCode;
  $('setup').hidden=true;$('roomControls').hidden=false;
  hideResult();if(phase==='ended'){
   showResult(winner?.name?`🏆 ${winner.name} 탐정 승리!`:'⛔ 전원 게임오버',winner?'가장 먼저 괴도 D 11곳을 전부 찾아냈어요.':'모든 탐정이 오답 3회로 탈락했어요.');
   say(winner?'사건 해결! 방장이 다음 사건을 준비할 수 있습니다.':'전원 게임오버! 방장이 다음 사건을 준비할 수 있습니다.');
  }else if(phase==='playing'){
   if(eliminated){showResult('⛔ 게임 오버','틀린 위치를 세 번 지목했어요. 다른 탐정이 수사하는 동안 관전할 수 있습니다.');say('오답 3회로 탈락했습니다. 현재 다른 탐정들의 수사 진행을 볼 수 있어요.',true);}
   else if(changed)say('수사 시작! 한 번 누르면 X, 더블클릭하면 괴도를 지목해요.');
  }
  else say('방장이 시작하면 같은 사건을 각자 풀게 됩니다. 참가자는 준비 버튼을 눌러주세요.');
  updateBoard();
 }
 function leave(text='방에서 나왔습니다.'){
  if(connection){connection.close();connection=null;}
  for(const conn of connections.values())conn.close();connections.clear();
  if(peer){peer.destroy();peer=null;}
  room=null;roomCode='';isHost=false;solo=false;phase='waiting';boardData=null;winner=null;round=0;startedAt=0;resetRound();
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
   conn.playerUid=uid;room.players.set(uid,{uid,name:String(msg.name||'탐정').slice(0,20),ready:false,host:false,misses:0,found:0,eliminated:false});
   connections.set(conn.ref.id,conn);broadcast();
  }else if(conn.playerUid&&room.players.has(conn.playerUid)){
   const uid=conn.playerUid;
   if(msg.type==='ready'&&room.phase==='lobby'){room.players.get(uid).ready=!room.players.get(uid).ready;broadcast();}
   if(msg.type==='guess'&&room.phase==='playing'&&msg.round===room.round)judge(uid,msg.index,conn);
  }
 }
 function hostSetup(code,playerName){
  roomCode=code;isHost=true;
  room={phase:'lobby',round:0,game:null,startedAt:0,winner:null,guesses:new Map(),players:new Map([[account.uid,{uid:account.uid,name:playerName,ready:true,host:true,misses:0,found:0,eliminated:false}]])};
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
   connection.on('data',msg=>{if(msg?.type==='state')applyState(msg);else if(msg?.type==='guess-result')receiveGuess(msg);});
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
   try{room.game=C.makePuzzle();room.round++;room.startedAt=Date.now();room.phase='playing';room.winner=null;room.guesses=new Map();
    for(const p of room.players.values()){p.misses=0;p.found=0;p.eliminated=false;}
    broadcast();}
   catch(err){say('문제 생성에 실패했어요. 수사 시작을 다시 눌러주세요.',true);}
  },20);
 }
 function soloStart(){
  if(room||busy)return;
  say('단서를 생성하는 중...');
  setTimeout(()=>{if(room)return;solo=true;boardData=C.makePuzzle();resetRound();round++;
   phase='playing';winner=null;startedAt=Date.now();hideResult();updateBoard();say('혼자 수사 중입니다. 11곳의 괴도 D를 찾아보세요.');
  },20);
 }
 $('createBtn').onclick=()=>connect(true);$('joinBtn').onclick=()=>connect(false);
 $('leaveBtn').onclick=()=>leave();$('soloBtn').onclick=()=>{if(solo){hideResult();}soloStart();};
 $('readyBtn').onclick=()=>{if(connection?.open&&phase==='lobby')connection.send({type:'ready'});};
 $('startBtn').onclick=startRound;
 $('nextBtn').onclick=()=>{if(!room||!isHost||room.phase!=='ended')return;room.phase='lobby';room.game=null;room.startedAt=0;room.winner=null;room.guesses=new Map();for(const p of room.players.values()){p.ready=p.host;p.misses=0;p.found=0;p.eliminated=false;}broadcast();};
 $('copyBtn').onclick=async()=>{const link=new URL('phantom-d.html',location.href);link.searchParams.set('room',roomCode);
  try{await navigator.clipboard.writeText(link.href);say('초대 링크를 복사했어요!');}
  catch(_){say('초대 링크: '+link.href);}
 };
 $('clearBtn').onclick=()=>{if(canPlay())resetMarks();};
 $('restartSolo').onclick=soloStart;
 function cancelSingle(){clearTimeout(clickTimer);clickTimer=null;lastClick=null;}
 $('board').addEventListener('click',event=>{
  const cell=event.target.closest('[data-i]');if(!cell)return;
  soundEngine(); // Unlock mobile audio on the actual touch/click gesture.
  const i=Number(cell.dataset.i);
  if(event.detail===0){mark(i);return;}
  const timestamp=Date.now();
  if(lastClick&&lastClick.i===i&&timestamp-lastClick.at<380){
   cancelSingle();guess(i);return;
  }
  cancelSingle();lastClick={i,at:timestamp};
  clickTimer=setTimeout(()=>{lastClick=null;mark(i);},300);
 });
 $('board').addEventListener('dblclick',event=>{
  const cell=event.target.closest('[data-i]');if(!cell)return;
  soundEngine();cancelSingle();guess(Number(cell.dataset.i));
 });
 $('board').addEventListener('contextmenu',event=>{
  const cell=event.target.closest('[data-i]');if(cell){event.preventDefault();soundEngine();cancelSingle();mark(Number(cell.dataset.i));}
 });
 $('board').addEventListener('keydown',event=>{
  const cell=event.target.closest('[data-i]');if(!cell)return;const i=Number(cell.dataset.i);
  if(event.key==='x'||event.key==='X'){cancelSingle();mark(i);event.preventDefault();}
  if(event.key==='g'||event.key==='G'){cancelSingle();guess(i);event.preventDefault();}
 });
 setInterval(()=>{if(startedAt&&phase==='playing')updateClock();},500);
 // Color-tiles transport disconnects idle guests after 60 seconds; keep long puzzle sessions alive.
 setInterval(()=>{if(connection?.open&&room&&!isHost)connection.send({type:'ping'});},15000);
 try{$('nick').value=localStorage.getItem('vsphere-phantom-name')||'';}catch(_){}
 const invite=new URLSearchParams(location.search).get('room');
 if(invite&&CODE.test(invite.toUpperCase()))$('roomInput').value=invite.toUpperCase();
 renderBoard();updateBoard();
})();
