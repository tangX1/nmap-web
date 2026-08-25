// Aggregates hosts discovered across every completed scan into a single
// live registry, keyed by IP (falling back to hostname for hosts nmap
// couldn't resolve an address for). Later scans overwrite earlier findings
// for the same host, so the registry always reflects the latest known state
// — this is what the Network Map renders instead of fabricated topology.
const registry = new Map()

export function recordHosts(hosts, scanType) {
  const lastSeen = Date.now()
  for (const host of hosts) {
    const key = host.ip ?? host.hostname
    if (!key) continue
    registry.set(key, { ...host, scanType, lastSeen })
  }
}

export function getHosts() {
  return [...registry.values()].sort((a, b) => b.lastSeen - a.lastSeen)
}
