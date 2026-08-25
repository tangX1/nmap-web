import { Play, Loader2, ChevronDown } from 'lucide-react'
import { SCAN_TYPES } from '../../../shared/scanTypes.js'

export default function ScanControlPanel({ target, onTargetChange, scanType, onScanTypeChange, scanning, onRunScan }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onRunScan()
      }}
      className="sticky top-0 z-10 flex flex-col md:flex-row gap-4 items-center bg-surface-container border border-outline-variant px-margin-desktop py-4"
    >
      <div className="relative flex-grow w-full">
        <span className="absolute inset-y-0 left-0 z-10 flex items-center pl-4 pointer-events-none text-primary-fixed-dim font-mono-code">
          $
        </span>
        <input
          type="text"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder="e.g. 192.168.1.0/24"
          className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-mono-code pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary-fixed-dim transition-colors"
        />
      </div>

      <div className="flex gap-4 w-full md:w-auto">
        <div className="relative w-full md:w-48">
          <select
            value={scanType}
            onChange={(e) => onScanTypeChange(e.target.value)}
            className="w-full appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface font-mono-label px-4 py-2.5 focus:outline-none focus:border-primary-fixed-dim transition-colors"
          >
            {SCAN_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
          />
        </div>

        <button
          type="submit"
          disabled={scanning || !target.trim()}
          className="flex items-center gap-2 whitespace-nowrap bg-primary-container text-on-primary-container font-bold px-8 py-2.5 hover:bg-primary-fixed transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {scanning ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Scan
            </>
          )}
        </button>
      </div>
    </form>
  )
}
