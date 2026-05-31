// sentry.edge.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Edge tarafındaki işlemlerin izlenebilirlik oranı
  tracesSampleRate: 1.0,

  debug: false,
});
