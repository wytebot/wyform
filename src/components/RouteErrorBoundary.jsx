import React from 'react';

const RELOAD_KEY = 'wyform-route-reload';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) {
    const message = String(error?.message || error || '');
    const looksLikeChunkFailure = /chunk|loading chunk|failed to fetch dynamically imported module|importing a module script failed|module script/i.test(message);
    if (looksLikeChunkFailure && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    }
  }
  componentDidUpdate() {
    if (!this.state.error) sessionStorage.removeItem(RELOAD_KEY);
  }
  retry = () => {
    sessionStorage.removeItem(RELOAD_KEY);
    window.location.reload();
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card empty routeError" role="alert">
        <h2>This page could not load</h2>
        <p className="muted">WyForm recovered from a temporary page-loading error.</p>
        <button className="primary" onClick={this.retry}>Reload page</button>
      </div>
    );
  }
}
