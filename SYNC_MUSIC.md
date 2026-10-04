# 싱크뮤직

`/sync-music.html` is the GitHub Pages entry point. The main page links it in the header and in the sidebar's 함께 듣기 category.

## Use

Sign into VSPHERE, create a room, share its invite URL, and add individual YouTube video URLs. Participants press 소리 켜고 함께 듣기 once for browser audio permission. Host controls playback, seek, queue order and deletion. All participants may add tracks and chat. Maximum 12 participants, 25 tracks and the latest 12 chat messages. Host departure closes the room; its lifetime is slightly under the transport's two-hour limit. No playlist persistence or host migration is promised.

## Transport and permissions

This reuses the existing `FirebaseRoomPeer` authenticated data transport from `color-tiles-firebase.js`, including its `colorTileRooms` transport envelopes. No Firestore rules changes or new permissions are required. The legacy collection and peer-prefix names remain for compatibility with the deployed rules; no color-tile game state is read or changed. A fresh random room is created for each music session. The `vsphere-sync-music-1` protocol marker and explicit hello handshake distinguish music traffic; invalid/foreign handshakes are closed. Only the host's authenticated channel can publish snapshots. Participant packets are restricted to hello/ping/add/chat, and validated/rate-limited by the host. Existing rules isolate each participant's clientData and the owner's hostData.

State snapshots are sent every four seconds and after changes. Guests adjust playback locally for elapsed time and correct drift above 1.8 seconds. This is approximate synchronization, not sample-accurate audio. Network latency, YouTube ads, buffering and background mobile throttling may cause differences. Playlist/queue data is bounded to fit the existing 30,000-character transport journal. Each snapshot fans out to participants, so Firestore usage increases with room size.

## Verification

- `node --check sync-music.js`
- `node sync-music-core.test.cjs`
- `node sync-music-room.test.cjs`

The integration test simulates two DOM clients, the authenticated channel and the YouTube player. It covers joining, play/pause/seek, guest additions/chat, rendering untrusted text safely, ignoring guest playback-control packets, next-track positioning, and host departure. It does not prove live Firebase permissions or real YouTube playback. Check those with two signed-in browsers after publication, including mobile audio activation. Browser visual automation was unavailable in the implementation environment.
