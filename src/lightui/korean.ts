/**
 * 조사 고르기 — 「유진와 연결」 같은 말이 화면에 나오지 않게.
 *
 * 한글 음절의 받침 여부로 고릅니다. 한글이 아닌 글자로 끝나면(영문·숫자)
 * 받침이 없다고 보고 부드러운 쪽을 씁니다.
 */

function hasFinalConsonant(word: string) {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

/** 은 / 는 */
export function topicParticle(word: string) {
  return hasFinalConsonant(word) ? '은' : '는'
}

/** 과 / 와 */
export function withParticle(word: string) {
  return hasFinalConsonant(word) ? '과' : '와'
}
