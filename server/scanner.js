import { SCAN_PROFILES, SCAN_TYPES } from '../shared/scanTypes.js'

// All scanning now delegates to a small nmap-wrapping HTTP API running on a
// VPS (see vps-nmap-api/) instead of spawning nmap on this machine. This
// sidesteps every local install/PATH/Npcap headache, at the cost of only
// being able to reach targets the VPS itself can route to (public IPs —
// not a home LAN behind NAT, unless there's a tunnel back to it).
const VPS_API_URL = process.env.VPS_API_URL
const VPS_API_KEY = process.env.VPS_API_KEY

const POLL_INTERVAL_MS = 2000
const SCAN_TIMEOUT_MS = 5 * 60 * 1000

export const scanBackend = VPS_API_URL ? `VPS nmap API (${VPS_API_URL})` : 'VPS nmap API (not configured)'

// No spaces allowed: a space would let a "target" smuggle in extra argv
// entries when the VPS API spawns nmap. Requiring the first character to be
// alphanumeric also blocks leading-dash flag injection.
const TARGET_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9.:/-]{0,252}$/

export { SCAN_TYPES }

export function isValidTarget(target) {
  return typeof target === 'string' && TARGET_PATTERN.test(target)
}

async function callApi(path, options = {}) {
  const res = await fetch(`${VPS_API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-api-key': VPS_API_KEY, ...options.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error ?? `VPS nmap API returned ${res.status}`)
  }
  return body
}

export async function runScan(target, scanType) {
  if (!isValidTarget(target)) {
    throw new Error('Invalid target. Use an IP, CIDR range, or hostname with no spaces.')
  }
  if (!VPS_API_URL || !VPS_API_KEY) {
    throw new Error('VPS_API_URL and VPS_API_KEY must be set (see vps-nmap-api/README.md).')
  }

  const args = SCAN_PROFILES[scanType] ?? SCAN_PROFILES['Quick Scan']
  const { scanId } = await callApi('/scans', { method: 'POST', body: JSON.stringify({ target, args }) })

  const deadline = Date.now() + SCAN_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    const record = await callApi(`/scans/${scanId}`)
    if (record.status === 'complete') {
      return { rawJSON: record.rawJSON, scanTimeMs: record.scanTimeMs }
    }
    if (record.status === 'error') {
      throw new Error(record.error ?? 'VPS nmap scan failed')
    }
  }
  throw new Error('Timed out waiting for the VPS to finish the scan')
}
