import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'

// Rolling in-memory activity log, shared across all connected clients — same
// non-persistent, single-process model as the `scans` Map in index.js.
const MAX_LOGS = 500
const buffer = []

export const logEmitter = new EventEmitter()
logEmitter.setMaxListeners(0)

export function pushLog(level, message) {
  const entry = { id: randomUUID(), level, message, timestamp: Date.now() }
  buffer.push(entry)
  if (buffer.length > MAX_LOGS) buffer.shift()
  logEmitter.emit('log', entry)
  return entry
}

export function getRecentLogs() {
  return buffer.slice()
}
