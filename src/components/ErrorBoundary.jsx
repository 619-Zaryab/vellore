import { Component } from 'react';
export class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error('UI error:', error.message, info.componentStack); }
    render() {
        if (!this.state.error)
            return this.props.children;
        return (<div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold">Something broke on our side</h1>
          <p className="mt-2 text-muted">The page hit an unexpected error. Reloading usually fixes it.</p>
          <button className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-fg" onClick={() => window.location.assign('/')}>Back to the store</button>
        </div>
      </div>);
    }
}
