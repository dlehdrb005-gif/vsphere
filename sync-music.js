'use strict';
(() => {
  const $=id=>document.getElementById(id), C=SyncMusicCore, APP='vsphere-sync-music-1', PREFIX='vsphere-ct-v1-';
  const CODE=/^[A-HJ-NP-Z2-9]{8}$/;
  let peer=null,host=false,connection=null,active=false,connecting=false,generation=0,roomStarted=0;
  let state=empty(),receivedAt=performance.now(),player=null,playerReady=false,loadedKey=null,listening=false,transitioning=false;
  let guests=new Map(),pulse=null,deadline=null,lastHostPacket=0,user=null,renderSignature='',chatSignature='';
  function empty(){return {queue:[],current:null,position:0,playing:false,revision:0,chat:[],members:1};}
  const name=()=>C.clean($('nickname').value,20)||'음악친구';
  function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
  function send(channel,data){if(channel?.open)channel.send({app:APP,...data});}
  function current(){return state.queue.find(t=>t.key===state.current);}
  function target(){return C.position(state,(performance.now()-receivedAt)/1000);}
  function sample(){if(playerReady&&!transitioning&&loadedKey===state.current&&current()&&player.getVideoData().video_id===current().videoId){
    const p=player.getCurrentTime();if(Number.isFinite(p))state.position=Math.max(0,Math.min(86400,p));
    state.playing=player.getPlayerState()===1;
  }receivedAt=performance.now();}
  function broadcast(){if(!host||!active)return;sample();state.members=1+[...guests.values()].filter(g=>g.accepted).length;state.revision++;for(const g of guests.values())if(g.accepted)send(g.channel,{type:'state',state});render();}
  function showRoom(code){active=true;connecting=false;clearTimeout(deadline);$('setup').hidden=true;$('lobby').hidden=false;$('roomCode').textContent=code;$('hostControls').hidden=!host;$('role').textContent=host?'방장 · 재생을 조절할 수 있어요':'참가자 · 곡 추가와 채팅을 즐겨요';
    for(const id of ['addTrack','sendChat','listen','resync'])$(id).disabled=false;
    const u=new URL(location.href);u.searchParams.set('room',code);history.replaceState(null,'',u);render();
  }
  function reset(message){generation++;clearTimeout(deadline);clearInterval(pulse);pulse=null;const old=peer;peer=null;active=false;connecting=false;connection=null;guests.clear();host=false;old?.destroy();
    if(playerReady)player.pauseVideo();state=empty();loadedKey=null;listening=false;renderSignature='';chatSignature='';$('setup').hidden=false;$('lobby').hidden=true;$('hostControls').hidden=true;$('playerEmpty').hidden=false;
    for(const id of ['addTrack','sendChat','listen','resync'])$(id).disabled=true;
    $('createRoom').disabled=!user;$('joinRoom').disabled=!user;$('listen').textContent='소리 켜고 함께 듣기';render();if(message)status(message);
  }
  function errorText(e){if(e?.code==='permission-denied')return '접근 권한을 확인할 수 없어요. 로그인 상태와 방 유효시간을 확인해 주세요.';if(e?.code==='unauthenticated')return '브이스피어에 로그인한 후 이용해 주세요.';if(e?.type==='peer-unavailable')return '열려 있는 방이 없어요. 방 코드와 방장 접속 상태를 확인해 주세요.';return '연결하지 못했어요. 인터넷 연결을 확인한 뒤 다시 참가해 주세요.';}
  function newCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>chars[v%chars.length]).join('');}
  async function start(asHost){if(connecting||active)return;let code=asHost?newCode():$('joinCode').value.trim().toUpperCase();if(!CODE.test(code)){status('8자리 방 코드를 확인해 주세요.',true);return;}
    connecting=true;const session=++generation;$('createRoom').disabled=true;$('joinRoom').disabled=true;status('음악방에 연결하고 있어요…');
    try{user=await FirebaseRoomPeer.getUser();if(session!==generation)return;if(!user)throw {code:'unauthenticated'};host=asHost;
      peer=new FirebaseRoomPeer(asHost?PREFIX+code:PREFIX+'guest-'+crypto.randomUUID());
      deadline=setTimeout(()=>{if(session===generation)reset('연결 시간이 초과됐어요. 다시 시도해 주세요.');},20000);
      peer.on('error',e=>{if(session===generation){reset(errorText(e));$('status').classList.add('error');}});
      if(asHost)peer.on('connection',ch=>accept(ch,session));
      peer.on('open',()=>{if(session!==generation)return;
        if(asHost){roomStarted=Date.now();showRoom(code);status('방이 열렸어요. 초대 링크를 공유하고 첫 곡을 추가해 보세요.');pulse=setInterval(()=>{if(Date.now()-roomStarted>7100000){reset('음악방 이용시간이 끝났어요. 새 방을 만들어 주세요.');return;}broadcast();},4000);}
        else{connection=peer.connect(PREFIX+code);connection.on('open',()=>send(connection,{type:'hello',name:name()}));connection.on('data',packet=>receive(packet,code,session));connection.on('close',()=>{if(session===generation)reset('방 연결이 종료됐어요. 방장이 나갔거나 연결이 끊겼어요.');});lastHostPacket=performance.now();pulse=setInterval(()=>{if(performance.now()-lastHostPacket>25000){reset('방장과 연결이 끊겼어요. 다시 참가해 주세요.');return;}send(connection,{type:'ping'});},5000);}
      });
    }catch(e){if(session===generation){reset(errorText(e));$('status').classList.add('error');}}
  }
  function accept(ch,session){const g={channel:ch,name:'',accepted:false,lastAction:0,lastChat:0};guests.set(ch,g);
    const helloTimeout=setTimeout(()=>{if(!g.accepted)ch.close();},12000);
    ch.on('data',p=>{if(session!==generation||!p||p.app!==APP)return;
      if(p.type==='hello'&&!g.accepted){if([...guests.values()].filter(x=>x.accepted).length>=11){send(ch,{type:'reject',message:'방이 가득 찼어요. 최대 12명까지 함께 들을 수 있어요.'});setTimeout(()=>ch.close(),500);return;}g.name=C.clean(p.name,20)||'음악친구';g.accepted=true;clearTimeout(helloTimeout);broadcast();return;}
      if(!g.accepted)return;
      if(p.type==='ping')return;
      if(p.type==='add'){if(Date.now()-g.lastAction<1500)return;g.lastAction=Date.now();add(p,g.name,ch);}
      if(p.type==='chat'){if(Date.now()-g.lastChat<800)return;g.lastChat=Date.now();chat(p.text,g.name);}
      // Guests never mutate playback, playlist order, other names, or host state.
    });
    ch.on('close',()=>{clearTimeout(helloTimeout);guests.delete(ch);if(session===generation)broadcast();});
  }
  function receive(p,code,session){if(session!==generation||!p||p.app!==APP)return;lastHostPacket=performance.now();
    if(p.type==='reject'){reset(C.clean(p.message,160));return;}if(p.type==='notice'){status(C.clean(p.message,160),true);return;}
    if(p.type!=='state'||!C.validState(p.state)||p.state.revision<=state.revision)return;
    state=p.state;receivedAt=performance.now();if(!active){showRoom(code);status('함께 듣는 중이에요. 소리 켜기 버튼을 눌러주세요.');}render();apply();
  }
  function add(p,by,ch){const id=C.videoId(p.videoId);if(!id)return;if(state.queue.length>=25){const message='재생목록은 최대 25곡이에요. 방장이 곡을 삭제한 뒤 추가해 주세요.';ch?send(ch,{type:'notice',message}):status(message,true);return;}
    state.queue.push({key:crypto.randomUUID(),videoId:id,title:C.clean(p.title,60)||'YouTube · '+id,by});if(!state.current)select(state.queue[0].key,false);broadcast();}
  function chat(text,by){text=C.clean(text,160);if(!text)return;state.chat.push({name:by,text});state.chat=state.chat.slice(-12);broadcast();}
  function select(key,play=true){const t=state.queue.find(t=>t.key===key);if(!t)return;state.current=key;state.position=0;state.playing=play;receivedAt=performance.now();loadedKey=null;apply();render();}
  function next(){if(!host||!active)return;const i=state.queue.findIndex(t=>t.key===state.current);if(i+1<state.queue.length){select(state.queue[i+1].key,true);}else{state.playing=false;if(playerReady)player.pauseVideo();status('마지막 곡까지 들었어요. 다음 음악을 추가해 주세요.');}broadcast();}
  function apply(force=false){if(!playerReady)return;const t=current();if(!t){player.pauseVideo();return;}
    const pos=Math.min(target(),Math.max(0,player.getDuration()||86400));
    if(loadedKey!==t.key){transitioning=true;loadedKey=t.key;$('playerError').textContent='';if(listening&&state.playing)player.loadVideoById({videoId:t.videoId,startSeconds:state.position});else player.cueVideoById({videoId:t.videoId,startSeconds:state.position});return;}
    if(!listening)return;
    if(force||Math.abs(player.getCurrentTime()-pos)>1.8)player.seekTo(pos,true);
    if(state.playing&&player.getPlayerState()!==1)player.playVideo();else if(!state.playing&&player.getPlayerState()===1)player.pauseVideo();
  }
  function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
  function render(){const t=current();$('nowTitle').textContent=t?t.title:'아직 재생 중인 곡이 없어요';$('playerEmpty').hidden=!!t;$('playState').textContent=t?(state.playing?'재생 중':'일시정지'):'대기 중';$('members').textContent=state.members+'명 함께 듣는 중';$('queueCount').textContent=state.queue.length+' / 25';
    const sig=JSON.stringify([state.queue,state.current,host]);if(sig!==renderSignature){renderSignature=sig;$('queue').replaceChildren();if(!state.queue.length){const li=document.createElement('li');li.className='queue-empty';li.textContent='아직 담긴 음악이 없어요.';$('queue').append(li);}
      state.queue.forEach((track,i)=>{const li=document.createElement('li');li.className='track'+(track.key===state.current?' current':'');const img=document.createElement('img');img.src='https://i.ytimg.com/vi/'+track.videoId+'/default.jpg';img.alt='';img.loading='lazy';const info=document.createElement('div');info.className='track-info';const title=document.createElement('div');title.className='track-title';title.textContent=(i+1)+'. '+track.title;const by=document.createElement('small');by.textContent=track.by+'의 선곡'+(track.key===state.current?' · 현재 곡':'');info.append(title,by);
        if(host){const controls=document.createElement('div');controls.className='track-buttons';controls.append(button('재생',()=>{listening=true;select(track.key);broadcast();}),button('↑',()=>{if(i>0){[state.queue[i-1],state.queue[i]]=[state.queue[i],state.queue[i-1]];broadcast();}}),button('삭제',()=>{const wasCurrent=track.key===state.current;state.queue=state.queue.filter(x=>x.key!==track.key);if(wasCurrent){if(state.queue.length)select(state.queue[Math.min(i,state.queue.length-1)].key,state.playing);else{state.current=null;state.playing=false;state.position=0;loadedKey=null;if(playerReady)player.stopVideo();}}broadcast();}));controls.children[1].disabled=i===0;controls.children[1].setAttribute('aria-label',track.title+' 위로 이동');info.append(controls);}li.append(img,info);$('queue').append(li);});}
    const cs=JSON.stringify(state.chat);if(cs!==chatSignature){chatSignature=cs;$('chatLog').replaceChildren();for(const m of state.chat){const p=document.createElement('p'),n=document.createElement('strong');n.textContent=m.name;p.append(n,document.createTextNode(m.text));$('chatLog').append(p);}$('chatLog').scrollTop=$('chatLog').scrollHeight;}
  }
  window.onYouTubeIframeAPIReady=()=>{player=new YT.Player('player',{width:'100%',height:'100%',playerVars:{playsinline:1,origin:location.origin,rel:0},events:{onReady:()=>{playerReady=true;apply();},onStateChange:e=>{if(!active)return;if(host){if(player.getVideoData().video_id!==current()?.videoId)return;if([1,2,5].includes(e.data))transitioning=false;if(transitioning)return;if(e.data===0){next();return;}if(e.data===1||e.data===2)broadcast();}},onAutoplayBlocked:()=>{status('자동재생이 멈췄어요. 소리 켜고 함께 듣기를 눌러주세요.');},onError:()=>{$('playerError').textContent='이 영상을 재생할 수 없어요. 외부 재생 제한 또는 삭제된 영상일 수 있어요. 방장은 다른 곡을 선택해 주세요.';}}});};
  const api=document.createElement('script');api.src='https://www.youtube.com/iframe_api';api.onerror=()=>{$('playerError').textContent='유튜브 플레이어를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';};document.head.append(api);
  $('createRoom').onclick=()=>start(true);$('joinRoom').onclick=()=>start(false);$('leaveRoom').onclick=()=>{if(host&&!confirm('방장이 나가면 모두의 음악방이 종료돼요. 나갈까요?'))return;reset('음악방에서 나왔어요.');};
  $('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);status('초대 링크를 복사했어요. 친구에게 보내주세요.');}catch(_){status('주소창의 링크를 복사해 주세요: '+location.href);}};
  $('addForm').onsubmit=e=>{e.preventDefault();if(!active)return;const id=C.videoId($('videoUrl').value);if(!id){status('올바른 유튜브 영상 링크를 넣어주세요. 재생목록 전용 링크는 지원하지 않아요.',true);return;}const p={type:'add',videoId:id,title:C.clean($('videoTitle').value,60)};host?add(p,name()):send(connection,p);$('videoUrl').value='';$('videoTitle').value='';};
  $('chatForm').onsubmit=e=>{e.preventDefault();if(!active)return;const text=C.clean($('chatInput').value,160);host?chat(text,name()):send(connection,{type:'chat',text});$('chatInput').value='';};
  $('listen').onclick=()=>{if(!playerReady){status('플레이어가 준비 중이에요. 잠시 후 다시 눌러주세요.');return;}listening=true;player.unMute();if(host){if(current()){state.playing=true;apply(true);player.playVideo();}}else{apply(true);} $('listen').textContent='소리 켜짐 · 다시 듣기';};
  $('resync').onclick=()=>{if(host)broadcast();else apply(true);status('현재 음악의 재생 위치를 다시 맞췄어요.');};
  $('play').onclick=()=>{if(!host||!playerReady||!current())return;listening=true;state.playing=true;player.unMute();player.playVideo();};$('pause').onclick=()=>{if(host&&playerReady)player.pauseVideo();};$('next').onclick=next;
  $('seek').onchange=()=>{if(host&&playerReady){player.seekTo(Number($('seek').value),true);setTimeout(()=>broadcast(),200);}};
  const format=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
  setInterval(()=>{if(!active||!playerReady)return;if(host){const d=player.getDuration()||0,p=player.getCurrentTime()||0;$('seek').max=String(d);if(document.activeElement!==$('seek'))$('seek').value=String(p);$('timeLabel').textContent=format(p)+' / '+format(d);}else if(performance.now()-lastHostPacket<12000)apply();},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active){host?broadcast():apply(true);}});
  window.addEventListener('pagehide',()=>peer?.destroy());
  const invited=new URL(location.href).searchParams.get('room');if(invited&&CODE.test(invited.toUpperCase()))$('joinCode').value=invited.toUpperCase();
  FirebaseRoomPeer.getUser().then(u=>{user=u;if(u)$('nickname').value=C.clean(u.displayName,20)||'음악친구';firebase.auth().onAuthStateChanged(u=>{user=u;if(!u&&(active||connecting))reset('로그아웃되어 음악방 연결이 종료됐어요.');$('accountNote').textContent=u?'브이스피어 계정으로 연결됐어요. 닉네임을 정하고 시작하세요.':'먼저 브이스피어에 로그인해 주세요. 로그인 후 이 화면으로 돌아오면 연결돼요.';if(!active&&!connecting){$('createRoom').disabled=!u;$('joinRoom').disabled=!u;}});}).catch(e=>status(errorText(e),true));
})();
