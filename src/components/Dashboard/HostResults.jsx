import { Info, CheckCircle2, ShieldAlert } from 'lucide-react'

function stateColor(state) {
  if (state.includes('open')) return 'text-primary-fixed-dim'
  if (state.includes('closed')) return 'text-error'
  return 'text-tertiary-fixed-dim' // filtered / unfiltered / other
}

export default function HostResults({ hosts, scanTimeMs }) {
  const openPortCount = hosts.reduce(
    (sum, host) => sum + host.ports.filter((p) => p.state.includes('open')).length,
    0
  )
  const durationLabel = scanTimeMs != null ? `${(scanTimeMs / 1000).toFixed(1)}s` : '—'

  if (hosts.length === 0) {
    return (
      <div className="bg-surface-container-high border border-outline-variant p-6 text-center font-mono-code text-on-surface-variant">
        No hosts responded for this target.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-surface-container-high border border-outline-variant p-4">
        <div className="flex items-center gap-3 pr-6 border-r border-outline-variant">
          <span className="font-bold text-headline-sm text-primary-fixed-dim">{hosts.length}</span>
          <span className="font-mono-label text-on-surface-variant">HOSTS FOUND</span>
        </div>
        <div className="flex items-center gap-3 px-6 border-r border-outline-variant">
          <span className="font-bold text-headline-sm text-secondary-fixed-dim">{openPortCount}</span>
          <span className="font-mono-label text-on-surface-variant">OPEN PORTS</span>
        </div>
        <div className="flex items-center gap-3 px-6">
          <span className="font-bold text-headline-sm text-on-surface">{durationLabel}</span>
          <span className="font-mono-label text-on-surface-variant">DURATION</span>
        </div>
        <div className="ml-auto flex items-center gap-2 border border-primary-fixed/30 bg-on-primary-fixed-variant/30 px-3 py-1 text-primary-fixed">
          <CheckCircle2 size={16} />
          <span className="font-mono-label">SCAN COMPLETE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {hosts.map((host) => {
          const hasVulns = host.vulnerabilities.length > 0
          return (
            <div
              key={host.ip ?? host.hostname}
              className={`bg-surface-container-low border border-outline-variant border-l-4 ${
                hasVulns ? 'border-l-error' : 'border-l-primary-fixed-dim'
              }`}
            >
              <div className="flex items-center justify-between gap-3 bg-surface-container border-b border-outline-variant p-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono-code text-body-lg text-secondary">
                    {host.ip ?? host.hostname ?? 'unknown'}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${
                      host.status === 'up'
                        ? 'bg-on-primary-fixed-variant text-primary-fixed'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {host.status?.toUpperCase() ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-label text-on-surface-variant">
                    OS: {host.os ?? 'Unknown'}
                  </span>
                  <Info
                    size={16}
                    className="cursor-pointer text-on-surface-variant transition-colors hover:text-primary"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono-code text-mono-label">
                  <thead className="bg-surface-container-lowest text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-2 font-medium">Port</th>
                      <th className="px-4 py-2 font-medium">Protocol</th>
                      <th className="px-4 py-2 font-medium">State</th>
                      <th className="px-4 py-2 font-medium">Service</th>
                      <th className="px-4 py-2 font-medium">Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {host.ports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-on-surface-variant">
                          No port data
                        </td>
                      </tr>
                    ) : (
                      host.ports.map((p) => (
                        <tr key={p.port} className="hover:bg-surface-container-high transition-colors">
                          <td className="px-4 py-2 text-on-surface">{p.port}</td>
                          <td className="px-4 py-2">{p.protocol}</td>
                          <td className={`px-4 py-2 ${stateColor(p.state)}`}>{p.state}</td>
                          <td className="px-4 py-2">{p.service ?? '-'}</td>
                          <td className="px-4 py-2 text-on-surface-variant">
                            {[p.product, p.version].filter(Boolean).join(' ') || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {hasVulns && (
                <div className="space-y-2 border-t border-outline-variant bg-error-container/10 p-4">
                  <div className="flex items-center gap-2 font-mono-label text-error">
                    <ShieldAlert size={14} />
                    <span>{host.vulnerabilities.length} FINDING(S)</span>
                  </div>
                  {host.vulnerabilities.map((vuln) => (
                    <div key={`${vuln.id}-${vuln.port ?? 'host'}`} className="text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-code text-on-surface">{vuln.id}</span>
                        {vuln.port && (
                          <span className="font-mono-label text-[10px] text-on-surface-variant">
                            :{vuln.port}
                          </span>
                        )}
                        {vuln.cves.map((cve) => (
                          <span
                            key={cve}
                            className="bg-error-container px-1.5 py-0.5 text-[10px] font-bold text-on-error-container"
                          >
                            {cve}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-on-surface-variant">{vuln.output}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
