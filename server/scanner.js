import pkg from 'node-nmap'
import { existsSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import xml2js from 'xml2js'
import { SCAN_PROFILES, SCAN_TYPES } from '../shared/scanTypes.js'

const { NmapScan } = pkg

// `nmap` on PATH only works if the process's PATH was set *after* nmap was
// installed — a terminal opened before an install keeps its stale inherited
// PATH for its whole lifetime on Windows. Resolving an absolute path here
// sidesteps that: spawn() doesn't need PATH for an absolute path at all.
// Windows installers/winget aren't consistent about which drive they land
// on, so check the common locations across both.
const WINDOWS_NMAP_CANDIDATES = [
  'D:\\Program Files (x86)\\Nmap\\nmap.exe',
  'D:\\Program Files\\Nmap\\nmap.exe',
  'C:\\Program Files (x86)\\Nmap\\nmap.exe',
  'C:\\Program Files\\Nmap\\nmap.exe',
]

if (process.platform === 'win32') {
  const found = WINDOWS_NMAP_CANDIDATES.find((path) => existsSync(path))
  if (found) pkg.nmapLocation = found
}

// Prefer nmap running inside WSL when it's available: it gets real
// privileged raw-socket scans (SYN scans, OS detection) for free since WSL
// runs as root, with no Npcap install/driver needed on the Windows side.
// `node-nmap` always spawns its own hardcoded `nmapLocation` executable
// directly (no shell, no way to prepend `-d <distro> -e nmap`), so this
// path bypasses the package entirely and drives `wsl.exe` by hand.
const WSL_DISTRO = 'kali-linux'

function detectWslNmap() {
  if (process.platform !== 'win32') return false
  try {
    execFileSync('wsl', ['-d', WSL_DISTRO, '-e', 'nmap', '--version'], {
      timeout: 15000,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

const useWsl = detectWslNmap()
export const scanBackend = useWsl ? `WSL nmap (${WSL_DISTRO})` : `native nmap (${pkg.nmapLocation})`

// No spaces allowed: node-nmap splits its target string on spaces into
// separate argv entries, so a space lets a "target" smuggle in extra nmap
// flags. Requiring the first character to be alphanumeric also blocks
// leading-dash flag injection (e.g. a target of "--script=...").
const TARGET_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9.:/-]{0,252}$/

export { SCAN_TYPES }

const SCAN_TIMEOUT_MS = 5 * 60 * 1000

export function isValidTarget(target) {
  return typeof target === 'string' && TARGET_PATTERN.test(target)
}

function runScanViaWsl(target, args) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const child = spawn('wsl', ['-d', WSL_DISTRO, '-e', 'nmap', '-oX', '-', ...args, target])

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) child.kill()
    }, SCAN_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (err) => {
      settled = true
      clearTimeout(timer)
      reject(new Error(`Failed to start WSL nmap: ${err.message}`))
    })

    child.on('close', (code) => {
      settled = true
      clearTimeout(timer)
      const scanTimeMs = Date.now() - startedAt

      if (code !== 0 && !stdout) {
        reject(new Error(stderr.trim() || `WSL nmap exited with code ${code}`))
        return
      }

      xml2js.parseString(stdout, (err, rawJSON) => {
        if (err) {
          reject(new Error(`Failed to parse nmap XML output: ${err.message}`))
          return
        }
        resolve({ rawJSON, scanTimeMs })
      })
    })
  })
}

function runScanViaNative(target, args) {
  return new Promise((resolve, reject) => {
    const scan = new NmapScan(target, args)
    scan.scanTimeout = SCAN_TIMEOUT_MS

    scan.on('complete', () => {
      resolve({ rawJSON: scan.rawJSON, scanTimeMs: scan.scanTime })
    })

    scan.on('error', (err) => {
      reject(new Error(typeof err === 'string' ? err : 'nmap scan failed'))
    })

    scan.startScan()
  })
}

export function runScan(target, scanType) {
  if (!isValidTarget(target)) {
    return Promise.reject(new Error('Invalid target. Use an IP, CIDR range, or hostname with no spaces.'))
  }

  const args = SCAN_PROFILES[scanType] ?? SCAN_PROFILES['Quick Scan']
  return useWsl ? runScanViaWsl(target, args) : runScanViaNative(target, args)
}
