import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="empty" role="alert">
          <h1>Let's get your workspace back.</h1>
          <p>An unexpected error interrupted this screen. Your saved work is still available.</p>
          <button className="btn primary" onClick={() => location.reload()}>
            Reload workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
