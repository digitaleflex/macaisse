import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@/content';
import { BrandMark, Button, Icon } from '@/ui';
import { reportError } from '@/services';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  copied: boolean;
}

/**
 * Frontière d'erreur globale (P0 ergonomie).
 *
 * Un crash de rendu ne doit jamais produire un écran blanc : on affiche un
 * écran de secours lisible, on **journalise** via `reportError` (donc dans le
 * flux de toasts/support) et on offre deux issues concrètes : recharger, ou
 * copier le détail technique pour le support.
 *
 * Placé au-dessus de `<App />` dans `main.tsx` : il couvre aussi les écrans
 * lazy (Suspense) et les modales.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const frame = (info.componentStack ?? '').trim().split('\n')[1]?.trim() ?? '';
    reportError(`Crash d'interface : ${error.message}${frame ? ` (${frame})` : ''}`);
  }

  private copyDetail = (): void => {
    const error = this.state.error;
    const detail = error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : '';
    if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return;
    void navigator.clipboard
      .writeText(detail)
      .then(() => this.setState({ copied: true }))
      .catch(() => undefined);
  };

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error === null) return this.props.children;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-canvas p-6 text-center">
        <BrandMark className="size-14" />
        <div className="max-w-md">
          <div className="flex items-center justify-center gap-2 text-ink-900">
            <Icon name="warning" size={22} className="text-rose-500" />
            <h1 className="font-display font-extrabold text-xl">{t.crash.title}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-2">{t.crash.text}</p>
          <p className="text-xs text-slate-500 mt-3 font-num break-words">{this.state.error.message}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button icon="refresh" onClick={this.reload}>
            {t.crash.reload}
          </Button>
          <Button variant="secondary" icon="content_copy" onClick={this.copyDetail}>
            {this.state.copied ? t.crash.copied : t.crash.copy}
          </Button>
        </div>
      </div>
    );
  }
}
