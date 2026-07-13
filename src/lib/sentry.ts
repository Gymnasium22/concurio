/**
 * Sentry monitoring (optional — only if VITE_SENTRY_DSN set)
 */
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn?.trim()) return;

  Sentry.init({
    dsn: dsn.trim(),
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.15,
    sendDefaultPii: false,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.error(error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}
