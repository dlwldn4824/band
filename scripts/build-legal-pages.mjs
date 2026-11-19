/**
 * 약관 · 개인정보 처리방침 · 환불 규정 · 계정 삭제를 정적 HTML 로 찍습니다.
 *
 * 구글 플레이는 **앱을 깔지 않고도** 열 수 있는 개인정보처리방침 주소와,
 * 계정 삭제를 요청할 수 있는 주소를 스토어 등록 정보에 따로 요구합니다.
 * 앱 안(`/ui/legal/*`)에만 있으면 심사에서 걸립니다.
 *
 * 글을 두 벌로 두면 반드시 갈라지므로, 앱 화면이 쓰는
 * `src/lightui/legal/content.ts` 를 그대로 읽어서 찍습니다. 빌드 때마다
 * 다시 찍히니 앱과 웹이 어긋날 일이 없습니다 (package.json 의 prebuild).
 *
 * TypeScript 를 node 가 바로 못 읽어서 esbuild 로 타입만 벗겨 불러옵니다.
 * esbuild 는 Vite 가 이미 쓰고 있어 새로 받을 것이 없습니다.
 */
import { build } from 'esbuild'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'public')
const SITE = 'https://band-alpha.vercel.app'

/** content.ts 를 타입만 벗겨서 불러옵니다 */
async function loadContent() {
  const dir = await mkdtemp(join(tmpdir(), 'bandy-legal-'))
  const outfile = join(dir, 'content.mjs')
  await build({
    entryPoints: [join(ROOT, 'src/lightui/legal/content.ts')],
    outfile,
    format: 'esm',
    platform: 'node',
    bundle: false,
    logLevel: 'silent',
  })
  const mod = await import(pathToFileURL(outfile).href)
  await rm(dir, { recursive: true, force: true })
  return mod
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** 목록을 \n 으로 넣어 둔 문단이 있어서 줄바꿈을 살립니다 */
const para = (text) => `<p>${esc(text).replace(/\n/g, '<br>')}</p>`

function page({ title, lead, body, canonical }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · BANDY</title>
<meta name="description" content="${esc(lead)}">
<meta name="theme-color" content="#ffffff">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #fff; color: #3d4047;
    font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
      'Noto Sans KR', system-ui, sans-serif;
    font-size: 15px; line-height: 1.85; word-break: keep-all;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 0 max(20px, env(safe-area-inset-left, 0px)) 80px; }
  header { padding: 28px 0 22px; border-bottom: 1px solid #ecedef; margin-bottom: 26px; }
  .mark { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; color: #17181c; text-decoration: none; font-size: 15px; }
  .mark img { width: 22px; height: 22px; border-radius: 6px; }
  h1 { margin: 20px 0 8px; font-size: clamp(26px, 5vw, 34px); line-height: 1.25; letter-spacing: -1px; color: #17181c; }
  .updated { margin: 0; font-size: 12.5px; color: #8a8f98; }
  h2 { margin: 30px 0 8px; font-size: 16px; letter-spacing: -0.3px; color: #17181c; }
  p { margin: 0 0 12px; }
  .nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 0; }
  .nav a { padding: 8px 14px; border-radius: 999px; background: #f5f5f6; color: #5c616b; font-size: 12.5px; font-weight: 700; text-decoration: none; }
  .nav a[aria-current] { background: #17181c; color: #fff; }
  .note { padding: 14px 16px; border-radius: 14px; background: #f5f5f6; font-size: 13px; color: #5c616b; }
  .warn { padding: 14px 16px; border-radius: 14px; background: #fceeed; color: #e0443f; font-size: 13px; font-weight: 600; }
  ol { padding-left: 20px; }
  ol li { margin-bottom: 8px; }
  footer { margin-top: 48px; padding-top: 22px; border-top: 1px solid #ecedef; font-size: 12.5px; color: #8a8f98; }
  footer a { color: #5c616b; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="mark" href="/"><img src="/favicon-64.png" alt="">BANDY · 밴디</a>
    <h1>${esc(title)}</h1>
    <p class="updated">${esc(lead)}</p>
    <nav class="nav">
      <a href="/terms"${canonical === '/terms' ? ' aria-current="page"' : ''}>이용약관</a>
      <a href="/privacy"${canonical === '/privacy' ? ' aria-current="page"' : ''}>개인정보 처리방침</a>
      <a href="/refund"${canonical === '/refund' ? ' aria-current="page"' : ''}>취소 · 환불 규정</a>
      <a href="/account-deletion"${canonical === '/account-deletion' ? ' aria-current="page"' : ''}>계정 삭제</a>
    </nav>
  </header>
  ${body}
  <footer>
    BANDY · 밴디 — 대학 밴드 동아리 공연 플랫폼<br>
    <a href="${SITE}">${SITE.replace('https://', '')}</a>
  </footer>
</div>
</body>
</html>
`
}

function bizBlock(BIZ, BIZ_READY) {
  if (BIZ_READY) {
    return `<h2>사업자 정보</h2>${para(
      `상호 ${BIZ.name} · 대표 ${BIZ.owner}\n사업자등록번호 ${BIZ.bizNo} · 통신판매업신고 ${BIZ.mailOrderNo}\n${BIZ.address}\n${BIZ.email} · ${BIZ.phone}`,
    )}`
  }
  return `<h2>사업자 정보</h2><p class="note">사업자등록 준비 중입니다. 등록이 끝나면 상호 · 대표자 · 사업자등록번호 · 통신판매업 신고번호 · 주소 · 연락처를 여기에 표시합니다. 그때까지 티켓값은 공연을 여는 동아리 계좌로 직접 입금되고, 밴디가 대신 받지 않습니다.</p>`
}

/** 계정 삭제 — 앱을 깔지 않은 사람도 여기서 길을 찾을 수 있어야 합니다 */
function deletionBody(BIZ) {
  // 문의 주소가 비어 있을 때도 방문자에게는 할 수 있는 말만 합니다.
  // 「주소를 채우라」 는 건 우리끼리 할 이야기라 빌드 로그로만 알립니다.
  const contact = BIZ.email
    ? `<p>앱을 쓸 수 없는 상황이면 <a href="mailto:${esc(BIZ.email)}">${esc(
        BIZ.email,
      )}</a> 으로 가입한 이메일 주소와 함께 삭제를 요청해 주세요. 영업일 기준 3일 안에 처리하고 처리 결과를 회신합니다.</p>`
    : `<p>휴대폰이 바뀌었거나 앱을 쓸 수 없어 위 방법이 어려우면, 공연을 예매할 때 안내받은 운영진 연락처로 가입한 이메일 주소와 함께 삭제를 요청해 주세요. 영업일 기준 3일 안에 처리합니다.</p>
<p class="note">전용 문의 주소는 준비 중입니다. 열리는 대로 이 자리에 적겠습니다.</p>`

  return `
<h2>앱에서 바로 삭제하기</h2>
<ol>
  <li>밴디 앱을 열고 아래 <b>마이</b> 탭으로 갑니다.</li>
  <li>맨 아래 <b>계정</b> 묶음에서 <b>계정 삭제</b>를 누릅니다.</li>
  <li>무엇이 지워지고 무엇이 남는지 확인한 뒤 <b>계속</b> → <b>삭제합니다</b>를 누릅니다.</li>
</ol>
<p class="note">웹에서도 됩니다. <a href="${SITE}/ui/me">${SITE}/ui/me</a> 를 열면 같은 화면입니다.</p>

<h2>앱 없이 요청하기</h2>
${contact}

<h2>지워지는 것</h2>
${para(
  '프로필 — 이름, 학교, 학과, 사진\n예매 내역과 티켓\n보낸 메시지와 방명록 글\n동아리 교류 기록에서의 내 이름\n알림 설정과 찜한 공연',
)}

<h2>남는 것</h2>
${para(
  '이미 끝난 공연의 정산 내역 — 전자상거래법상 5년간 보관해야 합니다\n동아리끼리 함께 선 기록 — 사람이 아니라 동아리 사이의 기록입니다',
)}

<h2>되돌릴 수 없습니다</h2>
<p>삭제하면 같은 계정으로 다시 가입해도 예전 기록은 돌아오지 않습니다. 예매한 공연이 남아 있으면 <a href="/refund">환불</a>을 먼저 받으세요 — 계정을 지우면 티켓을 열 수 없습니다.</p>
`
}

const content = await loadContent()
const { DOCS, BIZ, BIZ_READY } = content

await mkdir(OUT, { recursive: true })
const written = []

for (const [key, doc] of Object.entries(DOCS)) {
  const body =
    doc.blocks
      .map((b) => (b.head ? `<h2>${esc(b.head)}</h2>` : '') + b.body.map(para).join(''))
      .join('\n') + bizBlock(BIZ, BIZ_READY)
  const file = join(OUT, `${key}.html`)
  await writeFile(
    file,
    page({ title: doc.title, lead: `${doc.updated} 기준`, body, canonical: `/${key}` }),
  )
  written.push(`${key}.html`)
}

await writeFile(
  join(OUT, 'account-deletion.html'),
  page({
    title: '계정 삭제',
    lead: '밴디 계정과 데이터를 지우는 방법입니다.',
    body: deletionBody(BIZ),
    canonical: '/account-deletion',
  }),
)
written.push('account-deletion.html')

console.log(`약관 정적 페이지 ${written.length}장: ${written.join(', ')}`)
if (!BIZ.email) {
  console.log('⚠︎ BIZ.email 이 비어 있어 「앱 없이 요청하기」에 주소가 없습니다.')
}
