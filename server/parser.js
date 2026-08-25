const CVE_PATTERN = /CVE-\d{4}-\d{4,7}/g

function extractScriptFindings(scripts, port) {
  if (!scripts) return []
  return scripts.map((script) => {
    const output = script.$?.output ?? ''
    const cves = [...new Set(output.match(CVE_PATTERN) ?? [])]
    return { id: script.$?.id ?? 'unknown', port: port ?? null, output, cves }
  })
}

function parsePort(portItem) {
  const service = portItem.service?.[0]?.$ ?? {}
  return {
    port: Number(portItem.$.portid),
    protocol: portItem.$.protocol,
    state: portItem.state?.[0]?.$.state ?? 'unknown',
    service: service.name ?? null,
    product: service.product ?? null,
    version: service.version ?? null,
  }
}

// nmap's OS detection is a best-effort fingerprint match, not a certain ID —
// it exposes that uncertainty via `accuracy` (% match) and, when there's no
// exact match, several candidate `osmatch` entries. We only take the top
// candidate, but keep its accuracy and structured `osclass` (device
// type/vendor) alongside the name rather than collapsing it to a bare
// string, since the type field is far more reliable for icon selection than
// pattern-matching the free-text name.
function parseOs(osNode) {
  const osmatch = osNode?.[0]?.osmatch?.[0]
  if (!osmatch) return { name: null, accuracy: null, type: null, vendor: null }
  const osclass = osmatch.osclass?.[0]?.$ ?? {}
  return {
    name: osmatch.$?.name ?? null,
    accuracy: osmatch.$?.accuracy ? Number(osmatch.$.accuracy) : null,
    type: osclass.type ?? null,
    vendor: osclass.vendor ?? null,
  }
}

function parseHost(host) {
  const addresses = host.address ?? []
  const ipEntry = addresses.find((a) => a.$.addrtype === 'ipv4' || a.$.addrtype === 'ipv6')
  const macEntry = addresses.find((a) => a.$.addrtype === 'mac')

  const hostnameEntry = host.hostnames?.[0]?.hostname?.[0]
  const portList = host.ports?.[0]?.port ?? []

  const portVulns = portList.flatMap((portItem) =>
    extractScriptFindings(portItem.script, Number(portItem.$.portid))
  )
  const hostVulns = extractScriptFindings(host.hostscript?.[0]?.script)
  const vulnerabilities = [...portVulns, ...hostVulns].filter((v) => v.cves.length > 0)

  const os = parseOs(host.os)

  return {
    ip: ipEntry?.$.addr ?? null,
    mac: macEntry?.$.addr ?? null,
    vendor: macEntry?.$.vendor ?? null,
    hostname: hostnameEntry?.$.name ?? null,
    status: host.status?.[0]?.$.state ?? 'unknown',
    os: os.name,
    osAccuracy: os.accuracy,
    osType: os.type,
    osVendor: os.vendor,
    ports: portList.map(parsePort),
    vulnerabilities,
  }
}

export function parseScan(rawJSON) {
  const hosts = rawJSON?.nmaprun?.host ?? []
  return hosts.map(parseHost)
}
