// 브라우저 콘솔에서 실행할 수 있는 스크립트
console.log('=== 게스트 리스트 확인 ===');

// localStorage 확인
const localGuests = localStorage.getItem('guests');
if (localGuests) {
  try {
    const parsed = JSON.parse(localGuests);
    console.log('📦 localStorage 게스트 수:', parsed.length);
    console.log('📦 localStorage 데이터:', parsed.slice(0, 3));
    console.log('📦 삭제된 게스트 수:', parsed.filter(g => g.isDeleted === true).length);
  } catch (e) {
    console.error('localStorage 파싱 오류:', e);
  }
} else {
  console.log('❌ localStorage에 게스트 데이터 없음');
}

// Firestore 확인 (Firebase SDK가 로드된 경우)
if (typeof window !== 'undefined' && window.firebase) {
  console.log('Firebase SDK가 로드되어 있습니다.');
} else {
  console.log('Firestore 확인은 Admin 페이지에서 직접 확인하세요.');
}

console.log('\n=== 확인 방법 ===');
console.log('1. Admin 페이지 → "🔄 게스트 리스트 복원" 버튼 클릭');
console.log('2. "방법 2: 현재 localStorage 백업 확인" 클릭');
console.log('3. 또는 브라우저 개발자 도구(F12) → Application → Local Storage → guests 키 확인');
