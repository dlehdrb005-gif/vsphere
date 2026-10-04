/* Small pure protocol helpers, also exercised by the Node regression test. */
(function(root){
  'use strict';
  const VIDEO=/^[A-Za-z0-9_-]{11}$/;
  function videoId(input){
    const text=String(input||'').trim();if(VIDEO.test(text))return text;
    try{const u=new URL(text);if(!['https:','http:'].includes(u.protocol))return null;
      const h=u.hostname.toLowerCase();let id;
      if(h==='youtu.be')id=u.pathname.split('/')[1];
      else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(h)){
        id=u.pathname==='/watch'?u.searchParams.get('v'): /^\/(shorts|embed|live)\//.test(u.pathname)?u.pathname.split('/')[2]:null;
      }
      return VIDEO.test(id||'')?id:null;
    }catch(_){return null;}
  }
  function clean(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
  function position(state,elapsed){return Math.max(0,state.position+(state.playing?Math.max(0,elapsed):0));}
  function validState(s){return !!s&&Array.isArray(s.queue)&&s.queue.length<=25&&s.queue.every(t=>t&&typeof t.key==='string'&&t.key.length<=40&&VIDEO.test(t.videoId)&&typeof t.title==='string'&&t.title.length<=60&&typeof t.by==='string'&&t.by.length<=20)&&Number.isFinite(s.position)&&s.position>=0&&s.position<=86400&&typeof s.playing==='boolean'&&(s.current===null||s.queue.some(t=>t.key===s.current))&&Number.isSafeInteger(s.revision)&&s.revision>=0&&Array.isArray(s.chat)&&s.chat.length<=12&&s.chat.every(m=>m&&typeof m.name==='string'&&m.name.length<=20&&typeof m.text==='string'&&m.text.length<=160)&&Number.isInteger(s.members)&&s.members>=1&&s.members<=12;}
  const api={videoId,clean,position,validState};root.SyncMusicCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
