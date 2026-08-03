import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * React.lazy() rejects when a route chunk fails to load (stale deployed
 * build after a new release, flaky network) — without a boundary that
 * throws during render and leaves the app permanently blank. This shows a
 * retry screen instead. A full page reload (rather than just resetting
 * `failed`) is deliberate: a stale-chunk failure needs a fresh index.html
 * with the new chunk manifest, not just another attempt at the old one.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("Route failed to load", error);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-ink-secondary">Не удалось загрузить страницу. Проверьте соединение и попробуйте снова.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Обновить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
