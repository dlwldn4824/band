function getAdminApiToken(): string | null {
  return localStorage.getItem('adminApiToken')
}

export async function callApi<T>(
  path: string,
  action: string,
  body: Record<string, unknown> = {},
  admin = false
): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (admin) {
      const token = getAdminApiToken()
      if (token) headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...body }),
    })

    try {
      return (await res.json()) as T
    } catch {
      return null
    }
  } catch {
    return null
  }
}
