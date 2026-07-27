// Firebase Console > Project settings > Your apps > Web app config 값을 여기에 붙여 넣으세요.
// Firebase 웹 설정값은 공개 식별자입니다. 비밀번호나 서비스 계정 키는 넣지 마세요.
window.VSPHERE_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDXBFBqMIFL1WPG-i_l0Qw2Zu9PiabZS7g",
  authDomain: "vsphere-b04a9.firebaseapp.com",
  projectId: "vsphere-b04a9",
  storageBucket: "vsphere-b04a9.firebasestorage.app",
  messagingSenderId: "63935811024",
  appId: "1:63935811024:web:57e6ce3e96dab8616c7dd5",
};

// 임시 관리자 판별용 이메일 목록입니다.
// 실제 운영에서는 서버/Firebase Custom Claims로 관리자 권한을 고정하는 편이 안전합니다.
window.VSPHERE_ADMIN_EMAILS = [
  "dlehdrb005@gmail.com",
];
