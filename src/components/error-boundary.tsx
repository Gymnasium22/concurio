/**
 * Глобальный Error Boundary + fallback UI
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Неизвестная ошибка',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.href = import.meta.env.BASE_URL || '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[rgb(var(--bg-primary))] text-center">
          <div className="max-w-md space-y-4 glass p-8 rounded-2xl border border-[rgb(var(--border-default))]">
            <h1 className="text-xl font-bold">
              {this.props.fallbackTitle ?? 'Что-то пошло не так'}
            </h1>
            <p className="text-sm text-[rgb(var(--fg-muted))] break-words">
              {this.state.message}
            </p>
            <Button onClick={this.handleReset} className="w-full">
              На главную
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
