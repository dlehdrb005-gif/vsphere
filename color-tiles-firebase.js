/* Firestore data transport. No WebRTC, signaling service, or paid server. */
'use strict';
(() => {
  const PREFIX = 'vsphere-ct-v1-', CODE = /^[A-HJ-NP-Z2-9]{8}$/;
  let db, auth, ready;
  function init() {
    if (ready) return ready;
    if (!window.firebase || !window.VSPHERE_FIREBASE_CONFIG) throw new Error('Firebase 설정을 불러오지 못했습니다.');
    if (!firebase.apps.length) firebase.initializeApp(window.VSPHERE_FIREBASE_CONFIG);
    db = firebase.firestore(); auth = firebase.auth();
    ready = new Promise(resolve => { const off = auth.onAuthStateChanged(user => { off(); resolve(user); }); });
    return ready;
  }
  const stamp = () => firebase.firestore.FieldValue.serverTimestamp();
  class Events {
    constructor() { this.handlers = new Map(); }
    on(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); return this; }
    emit(type, value) { for (const fn of this.handlers.get(type) || []) fn(value); }
  }
  class Channel extends Events {
    constructor(parent, ref, remoteId, hostSide) {
      super(); this.parent=parent; this.ref=ref; this.peer=remoteId; this.hostSide=hostSide;
      this.open=false; this.closed=false; this.bufferSize=0; this.sequence=0; this.seen=0;
      this.lastIncoming=Date.now();this.watchdog=null;
      this.outbox=[]; this.history=[]; this.writing=false; this.unsubscribe=null; this.flushTimer=null;
    }
    watch() {
      if (this.closed) return;
      if(this.hostSide)this.watchdog=setInterval(()=>{if(Date.now()-this.lastIncoming>60000)this.close();},10000);
      this.unsubscribe=this.ref.onSnapshot({includeMetadataChanges:true}, snapshot => {
        if (this.closed || snapshot.metadata.hasPendingWrites) return;
        if (!snapshot.exists || snapshot.data().closed) { this.close(false); return; }
        if (!this.open) { this.open=true; this.emit('open'); }
        const raw=snapshot.data()[this.hostSide?'clientData':'hostData'];
        if (typeof raw!=='string' || raw.length>30000) return;
        let packets; try { packets=JSON.parse(raw); } catch (_) { return; }
        if (!Array.isArray(packets) || packets.length>40) return;
        for (const packet of packets) {
          if (!packet || !Number.isSafeInteger(packet.seq) || packet.seq<=this.seen) continue;
          this.seen=packet.seq;this.lastIncoming=Date.now(); this.emit('data',packet.data);
        }
      }, error => { if (!this.closed) { this.emit('error',error); this.parent.emit('error',error); this.close(false); } });
    }
    send(data) {
      if (!this.open || this.closed) return;
      // Newer state snapshots replace queued snapshots, never player moves.
      if (data.type==='state') this.outbox=this.outbox.filter(item=>item.type!=='state');
      this.outbox.push(data);this.bufferSize=this.outbox.length;
      if(this.bufferSize>32){this.emit('error',new Error('전송이 지연되고 있습니다.'));this.close();return;}
      if (!this.flushTimer) this.flushTimer=setTimeout(()=>{this.flushTimer=null;this.flush();},80);
    }
    async flush() {
      if (this.writing || this.closed || !this.outbox.length) return;
      this.writing=true; const messages=this.outbox.splice(0); this.bufferSize=0;
      for (const data of messages) this.history.push({seq:++this.sequence,data});
      // Keep a bounded journal so coalesced snapshots don't drop ordered moves.
      const keep=this.hostSide?2:32; this.history=this.history.slice(-keep);
      const value=JSON.stringify(this.history);
      if(value.length>30000){this.writing=false;this.emit('error',new Error('게임 데이터가 너무 큽니다.'));this.close();return;}
      const field=this.hostSide?'hostData':'clientData';
      try { await this.ref.update({[field]:value}); }
      catch(error){if(!this.closed){this.parent.emit('error',error);this.emit('error',error);this.close(false);}}
      finally {this.writing=false;if(this.outbox.length&&!this.closed)this.flush();}
    }
    close(write=true) {
      if(this.closed)return;this.closed=true;this.open=false;clearTimeout(this.flushTimer);clearInterval(this.watchdog);this.unsubscribe?.();
      if(write)this.ref.update({closed:true}).catch(()=>{});
      this.parent.channels.delete(this.ref.id);this.emit('close');
    }
  }
  class FirebaseRoomPeer extends Events {
    constructor(id) {
      super();this.id=id;this.channels=new Map();this.destroyed=false;this.roomRef=null;this.hostSide=false;this.offRoom=null;this.offConnections=null;this.heartbeat=null;
      queueMicrotask(()=>this.start());
    }
    static async getUser() { await init();return auth.currentUser; }
    async start() {
      try {
        await init();if(this.destroyed)return;
        if(!auth.currentUser)throw {code:'unauthenticated'};
        this.uid=auth.currentUser.uid;
        const code=this.id.slice(PREFIX.length);
        if(CODE.test(code)) {
          this.hostSide=true;this.roomRef=db.collection('colorTileRooms').doc(code);
          await db.runTransaction(async tx=>{
            const old=await tx.get(this.roomRef);if(old.exists)throw {type:'unavailable-id'};
            tx.set(this.roomRef,{hostUid:this.uid,hostPeer:this.id,createdAt:stamp(),updatedAt:stamp(),open:true});
          });
          if(this.destroyed){await this.roomRef.delete();return;}
          this.offConnections=this.roomRef.collection('connections').where('closed','==',false).onSnapshot(snap=>{
            if(this.destroyed)return;
            for(const change of snap.docChanges()){
              if(change.type!=='added'||this.channels.has(change.doc.id))continue;
              const data=change.doc.data();
              if(data.closed)continue;
              const channel=new Channel(this,change.doc.ref,data.guestPeer,true);this.channels.set(change.doc.id,channel);
              this.emit('connection',channel);channel.watch();
            }
          },error=>{if(!this.destroyed)this.emit('error',error);});
          this.heartbeat=setInterval(()=>{if(!this.destroyed)this.roomRef.update({updatedAt:stamp()}).catch(error=>this.emit('error',error));},15000);
        }
        if(!this.destroyed)this.emit('open',this.id);
      } catch(error){if(!this.destroyed)this.emit('error',error);}
    }
    connect(hostId) {
      const code=hostId.slice(PREFIX.length);this.roomRef=db.collection('colorTileRooms').doc(code);
      const ref=this.roomRef.collection('connections').doc(crypto.randomUUID());
      const channel=new Channel(this,ref,hostId,false);this.channels.set(ref.id,channel);
      this.join(channel).catch(error=>{if(!this.destroyed){this.emit('error',error);channel.close(false);}});
      return channel;
    }
    async join(channel) {
      const snapshot=await this.roomRef.get({source:'server'});
      if(this.destroyed)return;
      if(!snapshot.exists||!snapshot.data().open)throw {type:'peer-unavailable'};
      const room=snapshot.data();
      if(!room.updatedAt||Date.now()-room.updatedAt.toMillis()>90000)throw {type:'peer-unavailable'};
      await channel.ref.set({guestUid:this.uid,guestPeer:this.id,createdAt:stamp(),clientData:'[]',hostData:'[]',closed:false});
      if(this.destroyed){await channel.ref.update({closed:true});return;}
      channel.watch();
      this.offRoom=this.roomRef.onSnapshot(doc=>{
        if(!doc.exists||!doc.data().open)channel.close(false);
      },error=>{if(!this.destroyed){this.emit('error',error);channel.close(false);}});
    }
    reconnect() {} // Firestore SDK reconnects listeners itself.
    destroy() {
      if(this.destroyed)return;this.destroyed=true;clearInterval(this.heartbeat);this.offConnections?.();this.offRoom?.();
      for(const channel of [...this.channels.values()])channel.close();
      if(this.hostSide&&this.roomRef){
        // Close first, then remove only this room's temporary connection records.
        const ref=this.roomRef;
        ref.update({open:false,updatedAt:stamp()}).then(async()=>{
          const docs=await ref.collection('connections').get();
          for(let i=0;i<docs.docs.length;i+=200){const batch=db.batch();for(const doc of docs.docs.slice(i,i+200))batch.delete(doc.ref);await batch.commit();}
          await ref.delete();
        }).catch(()=>{});
      }
    }
  }
  window.FirebaseRoomPeer=FirebaseRoomPeer;
})();
