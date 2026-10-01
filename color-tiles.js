'use strict';
(() => {
  const C = window.ColorTilesCore, $ = id => document.getElementById(id);
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const CODE = /^[A-HJ-NP-Z2-9]{8}$/, PREFIX = 'vsphere-ct-v1-';
  const now = () => performance.now();
  let board = C.makeBoard(), selected = null, solo = null, best = 0;
  let peer = null, hostConnection = null, isHost = false, room = null, me = null, view = null;
  let busy = false, generation = 0, connectTimeout = null, lastSnapshot = 0, receivedAt = 0;
  let moveSeq = 0, lastOwnSeq = 0, latency = 0, lastPing = 0, lastHostMessage = 0;
  let lastRound = -1, shownPhase = '', soloFinished = false;
  const connections = new Map(), pending = new Set(), cards = new Map();
  try { best = Math.max(0, Math.min(C.COUNT, Number(localStorage.getItem('vsphere-color-tiles-best')) || 0)); $('nickname').value = localStorage.getItem('vsphere-color-tiles-name') || ''; } catch (_) {}
  const invite = new URLSearchParams(location.search).get('room');
  if (invite && CODE.test(invite.toUpperCase())) $('joinCode').value = invite.toUpperCase();
  $('best').textContent = best;
  function say(message, error = false) { $('networkStatus').textContent = message; $('networkStatus').classList.toggle('room-error', error); }
  function setBusy(value) {
    busy = value; $('createRoom').disabled = value; $('joinRoom').disabled = value;
    $('cancelConnect').hidden = !value; document.querySelector('.room-panel').classList.toggle('busy', value);
    for (const id of ['nickname','joinCode','roomPassword']) $(id).disabled = value;
  }
  function drawBoard(context, tiles, cell, mini = false) {
    for (let y=0; y<C.ROWS; y++) for(let x=0; x<C.COLS; x++) {
      context.fillStyle = (x+y)%2 ? '#ffedb3' : '#fff6d4'; context.fillRect(x*cell,y*cell,cell,cell);
      const color = tiles[y*C.COLS+x]; if (color < 0) continue;
      const inset = mini ? .5 : 4;
      context.fillStyle = C.colors[color]; context.fillRect(x*cell+inset,y*cell+inset,cell-inset*2,cell-inset*2);
      if (!mini) { context.fillStyle='#ffffff44';context.fillRect(x*cell+7,y*cell+7,cell-14,3); }
    }
  }
  function draw() {
    drawBoard(ctx, board, 40);
    if (selected !== null) { ctx.strokeStyle='#63330d';ctx.lineWidth=3;ctx.strokeRect(selected%C.COLS*40+2,Math.floor(selected/C.COLS)*40+2,36,36); }
  }
  function overlay(title, text, buttonText = '') {
    $('overlay').hidden = false; $('resultTitle').textContent = title; $('resultText').textContent = text;
    $('start').hidden = !buttonText; $('start').textContent = buttonText;
  }
  function timer(ms) {
    const s = Math.max(0,Math.ceil(ms/1000)); $('timer').textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    $('timer').classList.toggle('urgent', s<=20);
  }
  function saveBest(score) {
    if (score > best) { best=score;try { localStorage.setItem('vsphere-color-tiles-best',String(best)); } catch (_) {} }
  }
  function soloStart() {
    if (room || busy) return;
    board=C.makeBoard();solo={board,score:0,deadline:now()+C.DURATION,done:false};soloFinished=false;selected=null;
    $('score').textContent='0';$('thirdLabel').textContent='최고 점수';$('best').textContent=best;
    $('overlay').hidden=true;$('restart').disabled=false;$('status').textContent='같은 색 타일 사이의 빈칸을 눌러보세요.';
    draw();timer(C.DURATION);canvas.focus({preventScroll:true});
  }
  function getName() {
    const name=$('nickname').value.trim();
    if (!name) {say('게임 닉네임을 입력해주세요.',true);$('nickname').focus();return null;}
    try {localStorage.setItem('vsphere-color-tiles-name',name);} catch (_) {}
    return name.slice(0,20);
  }
  function randomCode() {
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return [...crypto.getRandomValues(new Uint8Array(8))].map(x=>alphabet[x%32]).join('');
  }
  function send(conn,data) { if(conn?.open && conn.bufferSize<12) {try {conn.send(data);}catch (_) {}} }
  function teardown(message='방에서 나왔습니다. 다시 방을 만들거나 참가할 수 있어요.',error=false) {
    generation++;clearTimeout(connectTimeout);room=null;view=null;solo=null;isHost=false;me=null;shownPhase='';lastRound=-1;
    for(const conn of connections.values())conn.close();connections.clear();for(const conn of pending)conn.close();pending.clear();
    if(hostConnection)hostConnection.close();hostConnection=null;
    if(peer)peer.destroy();peer=null;cards.clear();$('playerList').replaceChildren();setBusy(false);
    $('roomSetup').hidden=false;$('roomLobby').hidden=true;$('leaderboard').hidden=true;
    document.querySelector('.play-layout').classList.remove('multiplayer');
    $('thirdLabel').textContent='최고 점수';$('best').textContent=best;$('score').textContent='0';$('restart').disabled=true;
    timer(C.DURATION);board=C.makeBoard();selected=null;draw();overlay('준비됐나요?','혼자 연습하거나 위에서 친구를 초대하세요.','혼자 시작 →');say(message,error);
  }
  function errorText(error) {
    if(error?.code==='permission-denied')return '게임방 저장 권한이 아직 적용되지 않았어요. 운영자가 새 Firebase 규칙을 게시해야 합니다.';
    if(error?.code==='resource-exhausted')return '무료 서버 이용 한도에 도달했어요. 한도가 초기화된 뒤 다시 이용해주세요.';
    if(error?.code==='unauthenticated')return '브이스피어에 로그인한 뒤 다시 참가해주세요.';
    if(error?.code==='unavailable')return '서버와 연결할 수 없어요. 인터넷 연결을 확인해주세요.';
    if(error?.type==='peer-unavailable')return '방을 찾지 못했어요. 방 코드와 방장이 접속 중인지 확인해주세요.';
    if(error?.type==='unavailable-id')return '방 코드가 겹쳤어요. 방 만들기를 다시 눌러주세요.';
    return '연결하지 못했어요. 네트워크를 확인하고 다시 시도해주세요. 회사·공용망에서는 연결이 제한될 수 있어요.';
  }
  async function connect(asHost) {
    if(busy||room)return;
    let user;try{user=await window.FirebaseRoomPeer?.getUser();}catch(_){say('로그인 정보를 불러오지 못했어요. 새로고침해주세요.',true);return;}
    if(busy||room)return;
    if(!user){say('먼저 위의 로그인 화면에서 브이스피어에 로그인해주세요. 로그인 후 이 화면에서 다시 눌러주세요.',true);return;}
    if(!$('nickname').value.trim()&&user.displayName)$('nickname').value=user.displayName.slice(0,20);
    const name=getName();if(!name)return;
    const code=asHost?randomCode():$('joinCode').value.trim().toUpperCase();
    if(!CODE.test(code)){say('올바른 8자리 방 코드를 입력해주세요.',true);return;}
    if(typeof window.FirebaseRoomPeer!=='function'){say('멀티플레이 연결 파일을 불러오지 못했어요. 페이지를 새로고침해주세요.',true);return;}
    solo=null;$('restart').disabled=true;overlay('연결 중','잠시만 기다려주세요.');setBusy(true);say(asHost?'방을 만드는 중이에요…':'방장과 연결하는 중이에요…');
    const epoch=++generation;const password=$('roomPassword').value;isHost=asHost;
    let p;try {p=new FirebaseRoomPeer(asHost?PREFIX+code:PREFIX+'guest-'+crypto.randomUUID(),{debug:0});peer=p;}catch(e){teardown(errorText(e),true);return;}
    connectTimeout=setTimeout(()=>{if(epoch===generation)teardown('연결 시간이 초과됐어요. 방 코드·비밀번호와 네트워크를 확인해주세요.',true);},20000);
    p.on('error',error=>{if(epoch!==generation)return;if(busy)teardown(errorText(error),true);else teardown(errorText(error),true);});
    p.on('disconnected',()=>{if(epoch===generation){say('방 연결 서버에 재접속 중이에요. 현재 경기는 계속됩니다.');try{p.reconnect();}catch(_){}}});
    p.on('open',id=>{
      if(epoch!==generation)return;
      if(room)return;
      me=id;
      if(asHost){
        clearTimeout(connectTimeout);room={code,password,phase:'lobby',round:0,startsAt:0,players:new Map()};
        room.players.set(me,newPlayer(me,name,true));setBusy(false);enterRoom(code);say('방이 열렸어요. 친구에게 초대 링크나 방 코드를 알려주세요.');publish();
      }else{
        say('연결 서버에 접속했어요. 게임방에 입장하는 중이에요…');
        const conn=p.connect(PREFIX+code,{reliable:true,serialization:'json'});hostConnection=conn;
        conn.on('open',()=>{if(epoch===generation){say('방장과 연결됐어요. 입장 정보를 확인 중이에요…');send(conn,{type:'hello',version:1,name,password});}});
        conn.on('data',data=>{if(epoch===generation)receiveHost(data,code);});
        conn.on('close',()=>{if(epoch===generation)teardown('방장과 연결이 끊겼어요. 방장이 방을 열어둔 상태인지 확인해주세요.',true);});
        conn.on('error',()=>{if(epoch===generation)teardown('방장과 연결하지 못했어요. 네트워크를 확인해주세요.',true);});
      }
    });
    p.on('connection',conn=>{if(epoch!==generation||!asHost||!room){conn.close();return;}acceptConnection(conn,epoch);});
  }
  function newPlayer(id,name,host=false) {return {id,name,host,ready:host,connected:true,board:Array(C.COLS*C.ROWS).fill(-1),score:0,deadline:0,done:false,seq:0,finishedAt:0,lastMove:0};}
  function acceptConnection(conn,epoch) {
    if(pending.size+connections.size>=12){conn.close();return;}pending.add(conn);let accepted=false;
    conn.on('open',()=>{if(epoch===generation)say('새 참가자가 연결됐어요. 입장 정보를 확인 중이에요…');});
    const timeout=setTimeout(()=>{if(!accepted)conn.close();},10000);
    conn.on('data',data=>{
      if(epoch!==generation||!room||!data||typeof data!=='object')return;
      if(!accepted){
        if(data.type!=='hello')return;
        let rejection='';
        if(data.version!==1)rejection='게임 버전이 달라요. 두 화면을 새로고침해주세요.';
        else if(room.phase!=='lobby')rejection='이미 경기 중이에요. 다음 경기 대기실이 열리면 다시 참가해주세요.';
        else if(room.players.size>=8)rejection='방이 가득 찼어요. 최대 8명까지 참가할 수 있어요.';
        else if(data.password!==room.password)rejection='방 비밀번호가 맞지 않아요.';
        else if(typeof data.name!=='string'||!data.name.trim()||data.name.length>20)rejection='닉네임을 확인해주세요.';
        else if(connections.has(conn.peer))rejection='이미 참가한 연결이에요.';
        if(rejection){send(conn,{type:'reject',message:rejection});setTimeout(()=>conn.close(),400);return;}
        accepted=true;clearTimeout(timeout);pending.delete(conn);connections.set(conn.peer,conn);
        room.players.set(conn.peer,newPlayer(conn.peer,data.name.trim()));publish();return;
      }
      const player=room.players.get(conn.peer);if(!player)return;
      if(data.type==='ping'&&Number.isFinite(data.sent))send(conn,{type:'pong',sent:data.sent});
      else if(data.type==='ready'&&room.phase==='lobby'){player.ready=data.ready===true;publish();}
      else if(data.type==='move')hostMove(conn.peer,data);
      else if(data.type==='leave')conn.close();
    });
    const drop=()=>{clearTimeout(timeout);pending.delete(conn);if(epoch!==generation||!accepted||connections.get(conn.peer)!==conn)return;connections.delete(conn.peer);if(!room)return;const p=room.players.get(conn.peer);if(room.phase==='lobby')room.players.delete(conn.peer);else if(p){p.connected=false;p.done=true;p.finishedAt=now();}publish();};
    conn.on('close',drop);conn.on('error',()=>{conn.close();drop();});
  }
  function enterRoom(code) {
    $('roomSetup').hidden=true;$('roomLobby').hidden=false;$('leaderboard').hidden=false;
    $('roomCode').textContent=code;document.querySelector('.play-layout').classList.add('multiplayer');
    $('thirdLabel').textContent='내 순위';$('restart').disabled=true;
  }
  function snapshot() {
    const time=now();return {type:'state',version:1,phase:room.phase,round:room.round,startsIn:Math.max(0,room.startsAt-time),players:[...room.players.values()].map(p=>({id:p.id,name:p.name,host:p.host,ready:p.ready,connected:p.connected,score:p.score,board:C.encode(p.board),done:p.done,seq:p.seq,finishedAt:p.finishedAt,remaining:room.phase==='lobby'?C.DURATION:Math.max(0,p.deadline-time)}))};
  }
  function publish() {
    if(!isHost||!room)return;const data=snapshot();lastSnapshot=now();applyState(data);
    for(const conn of connections.values())send(conn,data);
  }
  function receiveHost(data,code) {
    if(!data||typeof data!=='object')return;
    if(data.type==='reject'){teardown(typeof data.message==='string'?data.message.slice(0,160):'참가할 수 없는 방이에요.',true);return;}
    if(data.type==='closed'){teardown('방장이 방을 종료했어요. 새 방을 만들어주세요.');return;}
    if(data.type==='pong'){if(Number.isFinite(data.sent))latency=Math.min(1000,Math.max(0,(now()-data.sent)/2));return;}
    if(data.type!=='state'||data.version!==1||!['lobby','countdown','playing','finished'].includes(data.phase)||!Array.isArray(data.players)||data.players.length>8)return;
    if(!data.players.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&p.name.length<=20&&C.decode(p.board)&&Number.isInteger(p.score)&&p.score>=0&&p.score<=200&&Number.isFinite(p.remaining)))return;
    if(!data.players.some(p=>p.id===me))return;
    if(!room){clearTimeout(connectTimeout);room={code};setBusy(false);enterRoom(code);say('입장했어요. 준비하기를 누르면 방장이 경기를 시작할 수 있어요.');}
    lastHostMessage=now();applyState(data);
  }
  function applyState(data) {
    view=data;receivedAt=now();const own=data.players.find(p=>p.id===me);if(!own)return;
    if(data.round!==lastRound){lastRound=data.round;moveSeq=0;lastOwnSeq=0;selected=null;}
    board=C.decode(own.board);$('score').textContent=own.score;draw();renderPlayers(data.players);
    $('roomCount').textContent=`${data.players.filter(p=>p.connected).length} / 8명`;
    const lobby=data.phase==='lobby',finished=data.phase==='finished';
    $('readyButton').hidden=isHost||!lobby;$('readyButton').textContent=own.ready?'준비 취소':'준비하기';
    $('hostStart').hidden=!isHost||(!lobby&&!finished);$('hostStart').textContent=finished?'다음 경기 준비':'함께 시작';
    $('hostStart').disabled=lobby&&(data.players.length<2||data.players.some(p=>!p.ready));
    $('roomHint').textContent=lobby?(isHost?'2명 이상 모이고 모두 준비하면 시작할 수 있어요.':'준비하기를 누르고 방장의 시작을 기다려주세요.'):(finished?'결과가 나왔어요. 방장이 다음 경기를 준비할 수 있어요.':'같은 타일 배치로 경쟁 중이에요. 방장 화면을 켜두세요.');
    if(lobby)overlay('친구를 기다리는 중',isHost?'친구가 입장하고 준비하면 ‘함께 시작’을 눌러주세요.':(own.ready?'준비 완료! 방장이 곧 시작할 거예요.':'위의 ‘준비하기’를 눌러주세요.'));
    else if(data.phase==='countdown')overlay('잠시 후 시작!','같은 배치로 함께 도전해요.');
    else if(finished){saveBest(own.score);overlay('경기 종료!',`내 점수 ${own.score} / 200 · ${$('best').textContent}위. 순위표에서 결과를 확인하세요.`);}
    else if(own.done){saveBest(own.score);overlay('내 도전 종료!',`${own.score}점! 다른 참가자의 경기가 끝날 때까지 순위를 확인하세요.`);}
    else {$('overlay').hidden=true;if(shownPhase!=='playing')canvas.focus({preventScroll:true});}
    if(own.seq>lastOwnSeq){$('status').textContent=own.score>Number($('status').dataset.score||0)?`점수 ${own.score}점! ${C.COUNT-own.score}개 남았어요.`:'매치가 없어요. −10초!';lastOwnSeq=own.seq;}
    $('status').dataset.score=own.score;
    if(data.phase!==shownPhase){shownPhase=data.phase;if(data.phase==='playing')$('status').textContent='시작! 같은 색 타일 사이의 빈칸을 누르세요.';if(finished)$('status').textContent='경기가 끝났어요. 다음 경기를 기다려주세요.';}
  }
  function renderPlayers(players) {
    const sorted=C.rank(players);let rank=1;
    $('rankingTitle').textContent=view.phase==='lobby'?'참가자':'실시간 순위';
    for(let i=0;i<sorted.length;i++){
      const p=sorted[i],prev=sorted[i-1];if(i===0||p.score!==prev.score||(p.score===200&&p.finishedAt!==prev.finishedAt))rank=i+1;
      if(p.id===me)$('best').textContent=rank;
      let card=cards.get(p.id);
      if(!card){const root=document.createElement('div');root.className='player-card';const line=document.createElement('div');line.className='player-line';const name=document.createElement('span');name.className='player-name';const score=document.createElement('span');score.className='player-score';line.append(name,score);const detail=document.createElement('div');detail.className='player-detail';const mini=document.createElement('canvas');mini.className='mini-board';mini.width=138;mini.height=102;mini.setAttribute('aria-hidden','true');root.append(line,detail,mini);card={root,name,score,detail,mini};cards.set(p.id,card);}
      card.root.classList.toggle('me',p.id===me);card.name.textContent=`${view.phase==='lobby'?'':`#${rank} `}${p.name}${p.id===me?' (나)':''}`;card.score.textContent=`${p.score}점`;
      card.detail.textContent=!p.connected?'연결 끊김':view.phase==='lobby'?(p.host?'방장':p.ready?'준비 완료':'준비 중'):p.done?'경기 종료':p.host?'방장 · 경기 중':'경기 중';
      card.mini.hidden=view.phase==='lobby';if(!card.mini.hidden)drawBoard(card.mini.getContext('2d'),C.decode(p.board),6,true);
      $('playerList').append(card.root);
    }
    for(const [id,card] of cards)if(!players.some(p=>p.id===id)){card.root.remove();cards.delete(id);}
  }
  function hostStart() {
    if(!isHost||!room)return;
    if(room.phase==='finished'){
      room.phase='lobby';for(const [id,p] of room.players){if(!p.connected){room.players.delete(id);continue;}Object.assign(p,{ready:p.host,done:false,score:0,board:Array(391).fill(-1),seq:0});}publish();return;
    }
    if(room.phase!=='lobby'||room.players.size<2||[...room.players.values()].some(p=>!p.ready))return;
    const initial=C.makeBoard();room.round++;room.phase='countdown';room.startsAt=now()+3000;
    for(const p of room.players.values())Object.assign(p,{board:initial.slice(),score:0,done:false,deadline:room.startsAt+C.DURATION,seq:0,finishedAt:0,lastMove:0});publish();
  }
  function hostMove(id,data) {
    if(!room||room.phase!=='playing'||data.round!==room.round||!Number.isSafeInteger(data.seq))return;
    const p=room.players.get(id),time=now();if(!p||!p.connected||p.done||data.seq<=p.seq)return;
    const result=C.move(p,data.index,time);if(result===null)return;p.seq=data.seq;p.lastMove=time;
    if(id===me)applyState(snapshot());
  }
  function choose(index) {
    if(room){
      const own=view?.players.find(p=>p.id===me);if(view?.phase!=='playing'||!own||own.done)return;
      selected=index;const data={type:'move',index,round:view.round,seq:++moveSeq};if(isHost)hostMove(me,data);else send(hostConnection,data);draw();return;
    }
    if(!solo||solo.done)return;const result=C.move(solo,index,now());if(result===null)return;selected=index;$('score').textContent=solo.score;
    $('status').textContent=result?`+${result}점! ${C.COUNT-solo.score}개 남았어요.`:'매치가 없어요. −10초!';draw();
  }
  function tick() {
    const time=now();
    if(room&&isHost){
      if(room.phase==='countdown'&&time>=room.startsAt){room.phase='playing';publish();}
      if(room.phase==='playing'){
        for(const p of room.players.values())if(!p.done&&time>=p.deadline){p.done=true;p.finishedAt=time;}
        if([...room.players.values()].every(p=>p.done)){room.phase='finished';publish();}
      }
      if(time-lastSnapshot>=(room.phase==='lobby'||room.phase==='finished'?10000:1500))publish();
    }
    if(room&&view){
      const own=view.players.find(p=>p.id===me),elapsed=time-receivedAt+(isHost?0:latency);
      if(view.phase==='countdown'){$('resultTitle').textContent=String(Math.max(1,Math.ceil((view.startsIn-elapsed)/1000)));timer(C.DURATION);}
      else if(view.phase==='lobby')timer(C.DURATION);
      else if(own)timer(own.done?0:own.remaining-elapsed);
      if(!isHost){
        if(time-lastPing>10000){send(hostConnection,{type:'ping',sent:time});lastPing=time;}
        if(time-lastHostMessage>45000)teardown('방장의 응답이 끊겼어요. 방장 화면과 네트워크를 확인한 뒤 다시 참가해주세요.',true);
      }
    }else if(solo){
      timer(solo.deadline-time);if(time>=solo.deadline)solo.done=true;
      if(solo.done&&!soloFinished){soloFinished=true;saveBest(solo.score);$('best').textContent=best;$('restart').disabled=true;overlay('게임 종료!',`내 점수 ${solo.score} / 200 · 최고 점수 ${best}`,'다시 도전 →');$('status').textContent=`게임 종료. ${solo.score}점을 얻었습니다.`;}
    }
  }
  canvas.addEventListener('click',event=>{const r=canvas.getBoundingClientRect();const x=Math.floor((event.clientX-r.left)/r.width*C.COLS),y=Math.floor((event.clientY-r.top)/r.height*C.ROWS);if(x>=0&&x<C.COLS&&y>=0&&y<C.ROWS)choose(y*C.COLS+x);});
  canvas.addEventListener('keydown',event=>{const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(directions[event.key]){event.preventDefault();if(selected===null)selected=195;else{const [dx,dy]=directions[event.key];selected=Math.max(0,Math.min(C.ROWS-1,Math.floor(selected/C.COLS)+dy))*C.COLS+Math.max(0,Math.min(C.COLS-1,selected%C.COLS+dx));}draw();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(selected!==null)choose(selected);}});
  $('start').addEventListener('click',soloStart);$('restart').addEventListener('click',()=>{if(!room&&confirm('현재 게임을 끝내고 새로 시작할까요?'))soloStart();});
  $('createRoom').addEventListener('click',()=>connect(true));$('joinRoom').addEventListener('click',()=>connect(false));$('cancelConnect').addEventListener('click',()=>teardown('연결을 취소했어요.'));
  $('hostStart').addEventListener('click',hostStart);$('readyButton').addEventListener('click',()=>{const own=view?.players.find(p=>p.id===me);if(own)send(hostConnection,{type:'ready',ready:!own.ready});});
  $('leaveRoom').addEventListener('click',()=>{if(!room)return;if(!confirm(isHost?'방을 종료할까요? 참가자들의 연결도 종료됩니다.':'방에서 나갈까요?'))return;if(isHost)for(const conn of connections.values())send(conn,{type:'closed'});else send(hostConnection,{type:'leave'});teardown();});
  $('copyInvite').addEventListener('click',async()=>{if(!room)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(url.href);say('초대 링크를 복사했어요. 비밀번호를 설정했다면 따로 알려주세요.');}catch(_){say(`복사가 안 되면 방 코드 ${room.code}를 친구에게 알려주세요.`);}});
  window.addEventListener('beforeunload',event=>{if(room){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',()=>{if(peer)peer.destroy();});
  document.addEventListener('visibilitychange',()=>{if(room&&isHost&&document.hidden)say('경기가 원활하게 진행되도록 방장 화면을 켜두세요.');tick();});
  setInterval(tick,100);draw();
})();
