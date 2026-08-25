// NSE `--script vuln` output is freeform text, not a structured severity
// field — there's no reliable field to read a severity off of. This makes a
// best-effort call from whatever score/state language the script happened
// to print, and is honest about it: when nothing usable is found, the
// finding is 'UNK' rather than guessing a tier it can't justify.
const CVSS_PATTERNS = [
  // "CVSS:3.1 Base Score: 9.8" — checked first, since the bare "CVSS: X.X"
  // pattern below would otherwise misparse the "3.1" spec version as if it
  // were the score.
  /base\s*score[:\s]+(\d{1,2}(?:\.\d)?)/i,
  /\bCVE-\d{4}-\d{4,7}\s+(\d{1,2}(?:\.\d)?)\s+https?:\/\//i, // vulners.nse style
  /CVSS[v:\s]*(\d{1,2}(?:\.\d)?)/i, // "CVSS: 9.8", "CVSSv3: 7.5" (no version prefix)
]

export function severityFromOutput(output) {
  for (const pattern of CVSS_PATTERNS) {
    const match = output.match(pattern)
    if (!match) continue
    const score = Number.parseFloat(match[1])
    if (Number.isNaN(score) || score > 10) continue
    if (score >= 9) return 'CRT'
    if (score >= 7) return 'HGH'
    if (score >= 4) return 'MED'
    return 'LOW'
  }

  if (/\bVULNERABLE\b/.test(output) && !/likely vulnerable/i.test(output)) return 'HGH'
  if (/likely vulnerable/i.test(output)) return 'MED'
  return 'UNK'
}
