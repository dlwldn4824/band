/** 개인 로그인 경로의 토큰을 analytics에 남기지 않도록 마스킹 */
export function sanitizePagePath(pathname: string | null | undefined): string {
  if (!pathname) return '/'
  if (pathname.startsWith('/t/')) return '/t/*'
  if (pathname.startsWith('/api/')) return '/api/*'
  return pathname
}
