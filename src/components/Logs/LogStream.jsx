import { useEffect, useRef, useState } from 'react'
import { Trash2, ArrowDown } from 'lucide-react'
import { apiUrl } from '../../apiBase'

const MAX_ENTRIES = 500
const SCROLL_BOTTOM_THRESHOLD_PX = 24

const LEVEL_STYLE = {
  info: { label: 'INFO', text: 'text-secondary' },
  success: { label: 'OK', text: 'text-primary-fixed-dim' },
  warn: { label: 'WARN', text: 'text-tertiary-fixed-dim' },
  error: { label: 'ERR', text: 'text-error' },
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false })
}

export default function LogStream() {
  const [entries, setEntries] = useState([])
  const [connected, setConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    const source = new EventSource(apiUrl('/api/logs/stream'))
    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.onmessage = (event) => {
      const entry = JSON.parse(event.data)
      setEntries((prev) => {
        const next = [...prev, entry]
        return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
      })
    }
    return () => source.close()
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, autoScroll])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD_PX
    setAutoScroll(atBottom)
  }

  return (
    <div className="relative -m-6 flex h-full flex-col bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-primary-fixed-dim animate-pulse' : 'bg-error'
            }`}
          />
          <h2 className="font-mono-label text-mono-label text-on-surface">LIVE_LOG_STREAM</h2>
          <span className="font-mono-label text-[10px] text-on-surface-variant">
            {entries.length} ENTRIES
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`font-mono-label text-[10px] ${
              connected ? 'text-primary-fixed-dim' : 'text-error'
            }`}
          >
            {connected ? 'LIVE' : 'RECONNECTING…'}
          </span>
          <button
            type="button"
            onClick={() => setEntries([])}
            className="flex items-center gap-1.5 border border-outline-variant px-2 py-1 font-mono-label text-[10px] text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Trash2 size={12} /> CLEAR
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto px-6 py-4 font-mono-code text-xs"
      >
        {entries.length === 0 ? (
          <p className="text-on-surface-variant">
            Waiting for activity — run a scan from the Dashboard to see live events here.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex gap-3 py-0.5 leading-relaxed">
              <span className="shrink-0 text-on-surface-variant/70">{formatTime(entry.timestamp)}</span>
              <span
                className={`w-10 shrink-0 font-bold ${
                  LEVEL_STYLE[entry.level]?.text ?? 'text-on-surface-variant'
                }`}
              >
                {LEVEL_STYLE[entry.level]?.label ?? entry.level.toUpperCase()}
              </span>
              <span className="text-on-surface">{entry.message}</span>
            </div>
          ))
        )}
      </div>

      {!autoScroll && entries.length > 0 && (
        <button
          type="button"
          onClick={() => setAutoScroll(true)}
          className="absolute bottom-6 right-6 flex items-center gap-1.5 border border-primary-fixed-dim bg-surface-container px-3 py-1.5 font-mono-label text-[10px] text-primary-fixed-dim shadow-lg transition-colors hover:bg-surface-container-high"
        >
          <ArrowDown size={12} /> JUMP TO LATEST
        </button>
      )}
    </div>
  )
}
