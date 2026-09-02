// In dev, `''` (relative /api/... paths) works via vite.config.js's proxy.
// In production the frontend and backend are deployed separately (frontend
// on Netlify, backend as a long-running process elsewhere) — set
// VITE_API_BASE_URL at build time to the backend's public URL so requests,
// including the Logs page's long-lived SSE connection, go straight to it
// rather than through a static host's request-proxying (which isn't built
// for held-open streaming connections).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function apiUrl(path) {
  return `${API_BASE}${path}`
}
