// Single source of truth for scan profile names, shared between the Express
// API (server/scanner.js, which maps each name to its nmap flag set) and the
// frontend (ScanControlPanel's dropdown). Keeping this in one file means the
// two can no longer drift out of sync by hand-editing duplicated string lists.
export const SCAN_PROFILES = {
  // -O (OS/device detection) is on by default so the Network Map has real
  // device data to show. It's left off Stealth Scan, since the extra probes
  // it sends work against that profile's whole point.
  'Quick Scan': ['-T4', '-F', '-sV', '-O'],
  'Full Scan': ['-T4', '-p-', '-sV', '-O'],
  'Stealth Scan': ['-sS', '-T2', '-sV'],
  'Deep Vulnerability': ['-T4', '-sV', '-O', '--script', 'vuln'],
}

export const SCAN_TYPES = Object.keys(SCAN_PROFILES)
