# 프로필 기능 활성화

현재 홈페이지는 GitHub Pages의 index.html / script.js를 사용합니다.
Firebase 프로젝트: vsphere-b04a9

1. Firebase Console → Firestore Database → Rules에 firestore.rules 전체를 붙여 넣고 게시합니다. 기존 공지/게시판 규칙을 포함합니다.
2. Storage가 없다면 Get started로 저장소를 생성합니다. 요금제 변경이 필요하다면 프로젝트 소유자가 결정해야 합니다.
3. Storage → Rules에 storage.rules 전체를 붙여 넣고 게시합니다.
4. 저장소 이름이 firebase-config.js의 storageBucket과 같은지 확인합니다.

Firebase CLI로 로그인되어 있다면 다음 명령으로 규칙을 게시할 수 있습니다.

```sh
firebase deploy --only firestore:rules,storage --project vsphere-b04a9
```

로그인 → 내 프로필 → 닉네임 또는 사진 선택 → 저장. 사진은 중앙을 정사각형으로 잘라 256×256 JPEG로 저장합니다. 닉네임은 중복 허용, 2~20자입니다. 프로필을 바꾸면 이전 글에서도 새로운 닉네임/사진을 표시합니다. 사용자 문서에는 이메일이나 권한 정보를 저장하지 않습니다.

검증: 다른 계정으로 users/{uid} 및 avatars/{uid}를 수정할 수 없는지 확인, 사진 변경/삭제와 새로고침 후 유지 확인, 기존 글 수정/삭제 및 공지 권한 확인.
