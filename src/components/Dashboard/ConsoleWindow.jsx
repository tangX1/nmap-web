export default function ConsoleWindow({ children }) {
  return (
    <div className="console-box">
      <div className="console-titlebar">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <span className="console-title">netscan_console_session</span>
      </div>
      <div className="console-body">{children}</div>
    </div>
  )
}
