import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import xml2js from 'xml2js'

const API_KEY = process.env.API_KEY
if (!API_KEY) {
  console.error('API_KEY environment variable is required — refusing to start with no auth.')
  process.exit(1)
}

const PORT = process.env.PORT ?? 4000
const SCAN_TIMEOUT_MS = 5 * 60 * 1000

// No spaces (blocks smuggling extra argv entries into the target position)
// and no leading dash (blocks the target itself being parsed as a flag).
const TARGET_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9.:/-]{0,252}$/

// This API is only meant to run the scan profiles nmap-web's own
// shared/scanTypes.js defines. Locking `args` down to exactly those flags
// means a leaked API key can be used to scan arbitrary hosts (that's an
// inherent risk of any nmap-as-a-service endpoint) but NOT to run arbitrary
// nmap flags against this VPS. Keep this in sync with shared/scanTypes.js.
const ALLOWED_ARGS = new Set(['-T4', '-T2', '-F', '-sV', '-O', '-p-', '-sS', '--script', 'vuln'])
const MAX_ARGS = 10

const scans = new Map()

function requireApiKey(req, res, next) {
  if (req.get('x-api-key') !== API_KEY) {
    res.status(401).json({ error: 'Invalid or missing API key' })
    return
  }
  next()
}

function isValidArgs(args) {
  return Array.isArray(args) && args.length <= MAX_ARGS && args.every((a) => ALLOWED_ARGS.has(a))
}

function runNmap(target, args) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    // -O (OS detection) needs actual root, not just the CAP_NET_RAW/
    // CAP_NET_ADMIN capabilities `setcap` grants the nmap binary — so nmap
    // itself runs via sudo rather than running this whole process as root.
    // `-n` fails fast instead of hanging if passwordless sudo isn't set up.
    const child = spawn('sudo', ['-n', 'nmap', '-oX', '-', ...args, target])

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), SCAN_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`Failed to start nmap: ${err.message}`))
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const scanTimeMs = Date.now() - startedAt

      if (code !== 0 && !stdout) {
        reject(new Error(stderr.trim() || `nmap exited with code ${code}`))
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

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/scans', requireApiKey, (req, res) => {
  const { target, args } = req.body ?? {}

  if (typeof target !== 'string' || !TARGET_PATTERN.test(target)) {
    res.status(400).json({ error: 'Invalid target. Use an IP, CIDR range, or hostname with no spaces.' })
    return
  }
  if (!isValidArgs(args)) {
    res.status(400).json({ error: 'args must be an array of allowed nmap flags.' })
    return
  }

  const scanId = randomUUID()
  const record = { id: scanId, status: 'running', rawJSON: null, scanTimeMs: null, error: null }
  scans.set(scanId, record)

  runNmap(target, args)
    .then(({ rawJSON, scanTimeMs }) => {
      record.status = 'complete'
      record.rawJSON = rawJSON
      record.scanTimeMs = scanTimeMs
    })
    .catch((err) => {
      record.status = 'error'
      record.error = err.message
    })

  res.status(202).json({ scanId })
})

app.get('/scans/:id', requireApiKey, (req, res) => {
  const record = scans.get(req.params.id)
  if (!record) {
    res.status(404).json({ error: 'Scan not found' })
    return
  }
  res.json(record)
})

app.listen(PORT, () => {
  console.log(`VPS nmap API listening on port ${PORT}`)
})
