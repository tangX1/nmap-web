import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { runScan, isValidTarget, scanBackend } from './scanner.js'
import { parseScan } from './parser.js'
import { pushLog, getRecentLogs, logEmitter } from './logs.js'
import { recordHosts, getHosts } from './hosts.js'
import { severityFromOutput } from './severity.js'

const app = express()
app.use(cors())
app.use(express.json())

const scans = new Map()

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/scans', (req, res) => {
  const { target, scanType } = req.body ?? {}

  if (!isValidTarget(target)) {
    pushLog('warn', `Rejected invalid scan target: "${target ?? ''}"`)
    res.status(400).json({ error: 'Invalid target. Use an IP, CIDR range, or hostname with no spaces.' })
    return
  }

  const scanId = randomUUID()
  const record = {
    id: scanId,
    target,
    scanType,
    status: 'running',
    startedAt: Date.now(),
    finishedAt: null,
    result: null,
    error: null,
  }
  scans.set(scanId, record)
  pushLog('info', `Queued ${scanType} on ${target} [${scanId.slice(0, 8)}]`)

  runScan(target, scanType)
    .then(({ rawJSON, scanTimeMs }) => {
      const hosts = parseScan(rawJSON)
      record.status = 'complete'
      record.finishedAt = Date.now()
      record.result = { hosts, scanTimeMs }
      recordHosts(hosts, scanType)

      pushLog('success', `Scan [${scanId.slice(0, 8)}] complete — ${hosts.length} host(s), ${scanTimeMs}ms`)
      const vulnCount = hosts.reduce((sum, host) => sum + host.vulnerabilities.length, 0)
      if (vulnCount > 0) {
        pushLog('warn', `Scan [${scanId.slice(0, 8)}] flagged ${vulnCount} vulnerability finding(s)`)
      }
    })
    .catch((err) => {
      record.status = 'error'
      record.finishedAt = Date.now()
      record.error = err.message
      pushLog('error', `Scan [${scanId.slice(0, 8)}] failed: ${err.message}`)
    })

  res.status(202).json({ scanId })
})

app.get('/api/scans/:id', (req, res) => {
  const record = scans.get(req.params.id)
  if (!record) {
    res.status(404).json({ error: 'Scan not found' })
    return
  }
  res.json(record)
})

app.get('/api/hosts', (req, res) => {
  res.json(getHosts())
})

app.get('/api/vulnerabilities', (req, res) => {
  const findings = getHosts().flatMap((host) =>
    host.vulnerabilities.map((vuln) => ({
      ...vuln,
      severity: severityFromOutput(vuln.output),
      hostIp: host.ip,
      hostname: host.hostname,
      scanType: host.scanType,
      detectedAt: host.lastSeen,
    }))
  )
  res.json(findings)
})

app.get('/api/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.flushHeaders()

  const send = (entry) => res.write(`data: ${JSON.stringify(entry)}\n\n`)
  for (const entry of getRecentLogs()) send(entry)

  const listener = (entry) => send(entry)
  logEmitter.on('log', listener)

  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000)

  req.on('close', () => {
    clearInterval(heartbeat)
    logEmitter.off('log', listener)
  })
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  pushLog('info', `NetScan API listening on http://localhost:${PORT}`)
  pushLog('info', `Scan backend: ${scanBackend}`)
  console.log(`NetScan API listening on http://localhost:${PORT}`)
  console.log(`Scan backend: ${scanBackend}`)
})
