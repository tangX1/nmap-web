import { useEffect, useMemo, useState } from 'react'
import {
  Router,
  Database,
  Laptop,
  Monitor,
  Camera,
  Printer,
  HelpCircle,
  Search,
  Plus,
  Minus,
  RotateCcw,
  X,
  ShieldAlert,
} from 'lucide-react'

const POLL_INTERVAL_MS = 5000
const CENTER = { x: 500, y: 400 }
const RING_RADIUS = 300

function stateColor(state) {
  if (state.includes('open')) return 'text-primary-fixed-dim'
  if (state.includes('closed')) return 'text-error'
  return 'text-tertiary-fixed-dim'
}

// nmap's `osclass.type` (from -O) is a structured device classification —
// far more reliable than pattern-matching the free-text OS name, since it's
// nmap's own categorization rather than us guessing from a string. Fall
// back to the name/port heuristics only when -O didn't run or found nothing.
function iconFor(host) {
  const type = (host.osType ?? '').toLowerCase()
  const os = (host.os ?? '').toLowerCase()
  const ports = host.ports.map((p) => p.port)

  if (host.isGateway || type === 'router' || /router|cisco|mikrotik|ubiquiti/.test(os)) return Router
  if (type === 'printer' || ports.includes(9100) || /printer/.test(os)) return Printer
  if (type === 'webcam' || ports.includes(554) || ports.includes(8000) || /embedded/.test(os)) return Camera
  if (type === 'phone' || /windows/.test(os)) return Monitor
  if (/linux|ubuntu|debian|unix|bsd/.test(os)) return Laptop
  if (ports.some((p) => [1433, 3306, 5432, 27017].includes(p))) return Database
  return HelpCircle
}

function renderHostIcon(host, props) {
  const Icon = iconFor(host)
  return <Icon {...props} />
}

function layoutHosts(hosts) {
  const gatewayIndex = hosts.findIndex((h) => h.ip?.endsWith('.1'))
  const gateway = gatewayIndex >= 0 ? hosts[gatewayIndex] : null
  const others = gateway ? hosts.filter((_, i) => i !== gatewayIndex) : hosts

  const positioned = []
  if (gateway) {
    positioned.push({ ...gateway, x: CENTER.x, y: CENTER.y, isGateway: true })
  }
  others.forEach((host, i) => {
    const angle = (2 * Math.PI * i) / Math.max(others.length, 1) - Math.PI / 2
    positioned.push({
      ...host,
      x: CENTER.x + RING_RADIUS * Math.cos(angle),
      y: CENTER.y + RING_RADIUS * Math.sin(angle),
      isGateway: false,
    })
  })
  return positioned
}

function nodeStyle(host) {
  const hasVulns = host.vulnerabilities.length > 0
  const down = host.status !== 'up'

  if (down) {
    return { ring: 'border-outline-variant', iconColor: '#3b4b3d', labelColor: 'text-outline-variant', dim: true }
  }
  if (hasVulns) {
    return {
      ring: 'border-error shadow-[0_0_15px_rgba(255,180,171,0.35)]',
      iconColor: '#ffb4ab',
      labelColor: 'text-error',
    }
  }
  if (host.isGateway) {
    return {
      ring: 'border-primary-fixed shadow-[0_0_15px_rgba(0,228,121,0.4)]',
      iconColor: '#00e479',
      labelColor: 'text-on-surface-variant',
    }
  }
  return { ring: 'border-secondary', iconColor: '#a2e7ff', labelColor: 'text-on-surface-variant' }
}

export default function NetworkGraph() {
  const [hosts, setHosts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)
  const [filter, setFilter] = useState('')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/hosts')
        const data = await res.json()
        if (!cancelled) {
          setHosts(data)
          setLoaded(true)
        }
      } catch {
        // Network hiccups just mean the next poll retries; the panel keeps
        // showing the last known-good data instead of flashing an error.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const nodes = useMemo(() => layoutHosts(hosts), [hosts])
  const nodeByKey = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.ip ?? n.hostname, n])),
    [nodes]
  )
  const gateway = nodes.find((n) => n.isGateway) ?? null

  const selected = selectedKey ? nodeByKey[selectedKey] : null
  const query = filter.trim().toLowerCase()
  const vulnerableCount = nodes.filter((n) => n.vulnerabilities.length > 0).length

  return (
    <div className="relative -m-6 flex h-full flex-col overflow-hidden bg-surface-container-lowest bg-[radial-gradient(circle,_#313442_1px,_transparent_1px)] [background-size:32px_32px]">
      <div className="m-4 flex items-center gap-2 self-start bg-surface-container-lowest border border-outline-variant px-3 py-1.5">
        <Search size={16} className="text-on-surface-variant" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter network nodes..."
          className="w-48 bg-transparent border-none font-mono-label text-on-surface placeholder:text-outline-variant focus:outline-none"
        />
      </div>

      <div className="relative flex-grow cursor-grab overflow-auto active:cursor-grabbing">
        {loaded && nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="font-mono-label text-on-surface-variant">No hosts discovered yet.</p>
            <p className="font-mono-label text-[11px] text-outline">
              Run a scan from the Dashboard to populate the network map.
            </p>
          </div>
        ) : (
          <div
            className="relative mx-auto my-12 transition-transform duration-200"
            style={{ width: 1000, height: 800, transform: `scale(${zoom})` }}
          >
            <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none">
              {gateway &&
                nodes
                  .filter((n) => !n.isGateway)
                  .map((n) => {
                    const key = n.ip ?? n.hostname
                    return (
                      <path
                        key={key}
                        d={`M ${gateway.x} ${gateway.y} L ${n.x} ${n.y}`}
                        stroke="#00e479"
                        strokeWidth="1"
                        fill="none"
                        opacity="0.35"
                      />
                    )
                  })}
            </svg>

            {nodes.map((node) => {
              const key = node.ip ?? node.hostname
              const style = nodeStyle(node)
              const radius = node.isGateway ? 32 : 24
              const dimmed =
                query &&
                !(node.hostname ?? '').toLowerCase().includes(query) &&
                !(node.ip ?? '').includes(query)
              return (
                <div
                  key={key}
                  className="absolute"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: radius * 2,
                    height: radius * 2,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={`relative flex h-full w-full items-center justify-center rounded-full border-2 bg-surface-container-highest transition-opacity ${style.ring} ${
                      dimmed ? 'opacity-20' : style.dim ? 'opacity-50' : ''
                    }`}
                  >
                    {renderHostIcon(node, { size: radius, color: style.iconColor, strokeWidth: 1.75 })}
                    {node.vulnerabilities.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-surface-container-lowest">
                        <ShieldAlert size={11} />
                      </span>
                    )}
                    <span className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 flex-col items-start whitespace-nowrap">
                      <span className={`font-mono-label text-[10px] ${style.labelColor}`}>
                        {node.hostname ?? node.ip}
                      </span>
                      {node.ip && node.hostname && (
                        <span className="font-mono-label text-[10px] text-surface-tint">{node.ip}</span>
                      )}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        className={`absolute right-0 top-0 bottom-0 z-50 flex w-80 flex-col border-l border-outline-variant bg-surface-container transition-transform duration-300 ${
          selected ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selected && (
          <>
            <div className="flex items-center justify-between border-b border-outline-variant p-6">
              <h3 className="font-headline-sm text-headline-sm text-primary">Node Details</h3>
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-grow space-y-8 overflow-y-auto p-6">
              <div>
                <div className="mb-4 flex h-16 w-16 items-center justify-center border border-outline-variant bg-surface-container-low">
                  {renderHostIcon(selected, { size: 32, color: nodeStyle(selected).iconColor })}
                </div>
                <h2 className="font-mono-code text-headline-md text-secondary-fixed">
                  {selected.hostname ?? selected.ip}
                </h2>
                {selected.ip && <p className="font-mono-label text-surface-tint">{selected.ip}</p>}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">
                    Device Name
                  </span>
                  <p className="font-mono-code text-on-surface">
                    {selected.hostname ?? 'Unknown (no reverse DNS / NetBIOS name resolved)'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">
                    IP Address
                  </span>
                  <p className="font-mono-code text-on-surface">{selected.ip ?? 'Unknown'}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">
                    MAC Address
                  </span>
                  <p className="font-mono-code text-on-surface">
                    {selected.mac
                      ? `${selected.mac}${selected.vendor ? ` (${selected.vendor})` : ''}`
                      : 'Unknown (not on local subnet, or scan lacks ARP access)'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">
                    OS Detection
                  </span>
                  <p className="font-mono-code text-on-surface">
                    {selected.os ?? 'Unknown (no OS match — run Quick, Full, or Deep Vulnerability to detect)'}
                    {selected.osAccuracy != null && (
                      <span className="text-on-surface-variant"> ({selected.osAccuracy}% match)</span>
                    )}
                  </p>
                  {selected.osType && (
                    <p className="font-mono-label text-[11px] text-on-surface-variant">
                      Device type: {selected.osType}
                      {selected.osVendor ? ` · ${selected.osVendor}` : ''}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selected.status === 'up' ? 'bg-surface-tint' : 'bg-error'
                      }`}
                    />
                    <span className="font-mono-label text-primary">
                      {selected.status === 'up' ? 'Up' : (selected.status ?? 'unknown')}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">
                    Last Seen
                  </span>
                  <p className="font-mono-code text-on-surface">
                    {new Date(selected.lastSeen).toLocaleString()} — {selected.scanType}
                  </p>
                </div>
              </div>
              <div>
                <span className="mb-3 block font-mono-label text-[10px] uppercase tracking-widest text-outline">
                  Ports ({selected.ports.length})
                </span>
                {selected.ports.length === 0 ? (
                  <p className="font-mono-label text-[11px] text-on-surface-variant">No port data.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selected.ports.map((port) => (
                      <div
                        key={port.port}
                        className="flex items-center justify-between border border-outline-variant bg-surface-container-lowest p-2"
                      >
                        <span className="font-mono-code text-xs text-primary">
                          {port.port}/{port.protocol}
                        </span>
                        <span
                          className={`border border-outline-variant px-1 font-mono-label text-[9px] ${stateColor(port.state)}`}
                        >
                          {port.state.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selected.vulnerabilities.length > 0 && (
                <div className="space-y-2 border border-error bg-error-container/10 p-4">
                  <span className="flex items-center gap-2 font-mono-label text-[10px] uppercase tracking-widest text-error">
                    <ShieldAlert size={14} /> {selected.vulnerabilities.length} Finding(s)
                  </span>
                  <div className="space-y-2 font-mono-code text-[10px] leading-relaxed text-on-surface-variant">
                    {selected.vulnerabilities.map((vuln) => (
                      <div key={`${vuln.id}-${vuln.port ?? 'host'}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-on-surface">{vuln.id}</span>
                          {vuln.cves.map((cve) => (
                            <span key={cve} className="bg-error-container px-1 py-0.5 text-[9px] text-on-error-container">
                              {cve}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-10 right-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
          className="flex h-12 w-12 items-center justify-center border border-outline-variant bg-surface-container text-on-surface transition-colors hover:bg-surface-variant"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
          className="flex h-12 w-12 items-center justify-center border border-outline-variant bg-surface-container text-on-surface transition-colors hover:bg-surface-variant"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="mt-2 flex h-12 w-12 items-center justify-center border border-outline-variant bg-surface-container text-on-surface transition-colors hover:bg-surface-variant"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 flex h-8 items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-4">
        <div className="flex items-center gap-4">
          <span className="font-mono-label text-[10px] text-on-surface-variant">NODE_COUNT: {nodes.length}</span>
          <span className="font-mono-label text-[10px] text-on-surface-variant">
            REFRESH: {POLL_INTERVAL_MS / 1000}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono-label text-[10px] ${vulnerableCount > 0 ? 'text-error' : 'text-surface-tint'}`}
          >
            {vulnerableCount > 0 ? `${vulnerableCount} HOST(S) FLAGGED` : 'NETWORK_SECURE'}
          </span>
          <div className={`h-1.5 w-1.5 rounded-full ${vulnerableCount > 0 ? 'bg-error' : 'bg-surface-tint'}`} />
        </div>
      </div>
    </div>
  )
}
