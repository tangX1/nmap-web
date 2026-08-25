import ConsoleWindow from './ConsoleWindow'

export default function TerminalWindow() {
  return (
    <ConsoleWindow>
      <p className="green">netscan --version: v4.2.0-stable</p>
      <p>Initialize kernel module... [OK]</p>
      <p>Establishing secure listener on port 44321... [OK]</p>
      <p className="prompt">
        &gt; Awaiting target... <span className="cursor" />
      </p>
    </ConsoleWindow>
  )
}
