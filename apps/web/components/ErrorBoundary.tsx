'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** Keeps a crash in one screen from taking down the whole workspace. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="empty" role="alert">
        <h1>Let&apos;s get your workspace back.</h1>
        <p>An unexpected error interrupted this screen. Your saved work is still available.</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Reload workspace
        </button>
      </div>
    );
  }
}
