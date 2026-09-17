"use client";

import { Component, type ReactNode } from "react";

// Keep the call provider and its media alive when a page being troubleshot throws.
export default class SupportPageBoundary extends Component<{
  children: ReactNode;
  pathname: string;
  callActive: boolean;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidUpdate(previous: Readonly<{ pathname: string }>) {
    if (previous.pathname !== this.props.pathname && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="mx-auto max-w-lg p-8" role="alert">
      <h1 className="text-xl font-bold">This page couldn’t load</h1>
      <p className="my-4">{this.props.callActive
        ? "Your support call is still available. You can keep talking and sharing your screen while we help."
        : "Try opening the page again. If the problem continues, refresh the browser."}</p>
      <button className="rounded-xl border px-4 py-3 font-semibold" onClick={() => this.setState({ failed: false })}>Try opening the page again</button>
    </main>;
  }
}
