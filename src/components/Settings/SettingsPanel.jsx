import { useState } from 'react'
import { Gauge, Plug, MonitorCog, ShieldCheck, Eye, EyeOff, Minus, Plus } from 'lucide-react'

const DEFAULTS = {
  parallelism: 64,
  timeout: 1500,
  retries: 3,
  shodanKey: '',
  slackWebhook: '',
  scanlineOverlay: true,
  soundAlerts: false,
  autoLock: '15 Minutes',
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
      <div className="mb-6 flex items-center gap-3">
        <Icon size={20} className="text-primary-container" />
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Toggle({ active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        active ? 'bg-on-primary-container' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform ${
          active ? 'translate-x-4 bg-primary-container' : 'bg-on-surface'
        }`}
      />
    </button>
  )
}

function SecretInput({ label, value, onChange, visible, onToggleVisible, helperText, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded border border-outline-variant bg-[#06080f] py-3 pl-4 pr-12 font-mono-code text-sm text-primary-container placeholder:text-on-surface-variant transition-all focus:border-primary-container focus:shadow-[0_0_8px_rgba(0,255,136,0.3)] focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary-container"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="font-mono-label text-[11px] text-on-surface-variant">{helperText}</p>
    </div>
  )
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [showShodan, setShowShodan] = useState(false)
  const [showSlack, setShowSlack] = useState(false)

  function set(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="page settings-page mx-auto max-w-4xl">
      <header className="mb-10">
        <h1 className="mb-2 font-display-lg text-display-lg font-bold text-on-surface">
          System Configuration
        </h1>
        <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
          Modify global scan parameters, authentication tokens, and interface behavior. All changes are
          written to the persistent terminal session immediately upon saving.
        </p>
      </header>

      <div className="space-y-6">
        <Section icon={Gauge} title="Scan Engine">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                  Parallelism
                </label>
                <span className="rounded border border-primary-container/20 bg-surface-container-highest px-2 py-1 font-mono-code text-mono-code text-primary-container">
                  {settings.parallelism} threads
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={256}
                value={settings.parallelism}
                onChange={(e) => set('parallelism', Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-highest accent-primary-container"
              />
              <p className="font-mono-label text-[11px] text-on-surface-variant">
                Adjust concurrent scan threads. Higher values may trigger rate limits.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.timeout}
                  onChange={(e) => set('timeout', Number(e.target.value))}
                  className="w-full rounded border border-outline-variant bg-[#06080f] px-4 py-2 font-mono-code text-primary-container transition-all focus:border-primary-container focus:shadow-[0_0_8px_rgba(0,255,136,0.3)] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                  Retries
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => set('retries', Math.max(0, settings.retries - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant bg-[#06080f] text-primary-container hover:bg-surface-container-highest"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="text"
                    readOnly
                    value={settings.retries}
                    className="h-10 w-full border-y border-outline-variant bg-[#06080f] text-center font-mono-code text-primary-container"
                  />
                  <button
                    type="button"
                    onClick={() => set('retries', Math.min(10, settings.retries + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant bg-[#06080f] text-primary-container hover:bg-surface-container-highest"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Plug} title="API & Integrations">
          <div className="space-y-6">
            <SecretInput
              label="Shodan API Key"
              value={settings.shodanKey}
              onChange={(e) => set('shodanKey', e.target.value)}
              visible={showShodan}
              onToggleVisible={() => setShowShodan((v) => !v)}
              helperText="Used for enriching discovered hosts with OSINT metadata."
              placeholder="Enter your Shodan API key"
            />
            <SecretInput
              label="Slack Webhook"
              value={settings.slackWebhook}
              onChange={(e) => set('slackWebhook', e.target.value)}
              visible={showSlack}
              onToggleVisible={() => setShowSlack((v) => !v)}
              helperText="Broadcast critical alerts to your security operations channel."
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
        </Section>

        <Section icon={MonitorCog} title="Display Preferences">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex items-center justify-between rounded border border-outline-variant bg-surface-container-low p-4">
              <div className="space-y-1">
                <span className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                  Enable Scanline Overlay
                </span>
                <p className="font-mono-label text-[11px] text-on-surface-variant">
                  Simulates CRT monitor interference
                </p>
              </div>
              <Toggle
                active={settings.scanlineOverlay}
                onToggle={() => set('scanlineOverlay', !settings.scanlineOverlay)}
              />
            </div>
            <div className="flex items-center justify-between rounded border border-outline-variant bg-surface-container-low p-4">
              <div className="space-y-1">
                <span className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                  Sound Alerts
                </span>
                <p className="font-mono-label text-[11px] text-on-surface-variant">
                  Audible pings for new vulnerabilities
                </p>
              </div>
              <Toggle
                active={settings.soundAlerts}
                onToggle={() => set('soundAlerts', !settings.soundAlerts)}
              />
            </div>
          </div>
        </Section>

        <Section icon={ShieldCheck} title="Security">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1 space-y-2">
              <label className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                Auto-Lock Session (min)
              </label>
              <select
                value={settings.autoLock}
                onChange={(e) => set('autoLock', e.target.value)}
                className="w-full rounded border border-outline-variant bg-[#06080f] px-4 py-3 font-mono-code text-primary-container focus:border-primary-container focus:outline-none"
              >
                <option>5 Minutes</option>
                <option>15 Minutes</option>
                <option>30 Minutes</option>
                <option>Never</option>
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="font-mono-label text-mono-label uppercase tracking-wider text-primary-container">
                Cache Management
              </label>
              <button
                type="button"
                className="w-full rounded border border-error bg-transparent py-3 font-mono-label text-mono-label text-error transition-all hover:bg-error/10 active:scale-95"
              >
                Clear Local Cache
              </button>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4 border-t border-outline-variant pt-6">
            <button
              type="button"
              onClick={() => setSettings(DEFAULTS)}
              className="px-6 py-2 font-mono-label text-mono-label text-on-surface-variant transition-colors hover:text-on-surface"
            >
              DISCARD
            </button>
            <button
              type="button"
              className="rounded bg-primary-container px-8 py-2 font-mono-label text-mono-label font-bold text-on-primary-container transition-all hover:shadow-[0_0_15px_rgba(0,255,136,0.4)]"
            >
              SAVE CONFIGURATION
            </button>
          </div>
        </Section>

        <footer className="py-12 text-center">
          <p className="font-mono-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            NetScan Protocol © 2024 • Terminal Hardware Rev 9
          </p>
        </footer>
      </div>
    </div>
  )
}
