const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '')

export function apiUrl(path: string) {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${suffix}`
}

export const API_BASE_URL = normalizedBaseUrl
