import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error while rendering page:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="console-box">
          <div className="console-body">
            <p style={{ color: 'var(--accent-red)' }}>
              [FATAL] {this.state.error.message ?? 'Something went wrong rendering this page.'}
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
