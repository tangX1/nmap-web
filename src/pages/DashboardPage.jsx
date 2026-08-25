import { useEffect, useRef, useState } from 'react'
import ScanControlPanel from '../components/Dashboard/ScanControlPanel'
import TerminalWindow from '../components/Dashboard/TerminalWindow'
import HostResults from '../components/Dashboard/HostResults'
import ConsoleWindow from '../components/Dashboard/ConsoleWindow'

const POLL_INTERVAL_MS = 1500

export default function DashboardPage() {
  const [target, setTarget] = useState('')
  const [scanType, setScanType] = useState('Quick Scan')
  const [status, setStatus] = useState('idle') // idle | scanning | complete | error
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearInterval(pollRef.current)
    }
  }, [])

  async function handleRunScan() {
    clearInterval(pollRef.current)
    setStatus('scanning')
    setError(null)
    setScanResult(null)

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, scanType }),
      })
      const body = await res.json()
      if (!mountedRef.current) return

      if (!res.ok) {
        setStatus('error')
        setError(body.error ?? 'Failed to start scan')
        return
      }

      pollRef.current = setInterval(async () => {
        const pollRes = await fetch(`/api/scans/${body.scanId}`)
        const record = await pollRes.json()
        if (!mountedRef.current) return

        if (record.status === 'complete') {
          clearInterval(pollRef.current)
          setScanResult(record.result)
          setStatus('complete')
        } else if (record.status === 'error') {
          clearInterval(pollRef.current)
          setError(record.error ?? 'Scan failed')
          setStatus('error')
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      if (!mountedRef.current) return
      console.error('Failed to start scan:', err)
      setStatus('error')
      setError('Could not reach the scan API. Is the server running (npm run dev:server)?')
    }
  }

  return (
    <div className="page dashboard-page">
      <ScanControlPanel
        target={target}
        onTargetChange={setTarget}
        scanType={scanType}
        onScanTypeChange={setScanType}
        scanning={status === 'scanning'}
        onRunScan={handleRunScan}
      />
      {status === 'complete' && scanResult ? (
        <HostResults hosts={scanResult.hosts} scanTimeMs={scanResult.scanTimeMs} />
      ) : status === 'error' ? (
        <ConsoleWindow>
          <p style={{ color: 'var(--accent-red)' }}>[ERROR] {error}</p>
        </ConsoleWindow>
      ) : (
        <TerminalWindow />
      )}
    </div>
  )
}
