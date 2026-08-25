// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function scrubPIIData(value: unknown): unknown {
  if (!value) return value;
  if (typeof value === "string") {
    return value
      .replace(EMAIL_REGEX, "[REDACTED]")
      .replace(/(session=)[a-zA-Z0-9%._:+-]+/gi, "$1[REDACTED]")
      .replace(/[a-f0-9]{24,}:[a-f0-9]{32,}:[a-f0-9]{32,}/gi, "[REDACTED]");
  }
  if (Array.isArray(value)) {
    return value.map(scrubPIIData);
  }
  if (typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === "email" || lowerKey === "cookie" || lowerKey === "authorization") {
          copy[key] = "[REDACTED]";
        } else if (lowerKey === "drugids" || lowerKey === "selecteddrugs" || lowerKey === "drugs") {
          copy[key] = "[REDACTED]";
        } else {
          copy[key] = scrubPIIData((value as Record<string, unknown>)[key]);
        }
      }
    }
    return copy;
  }
  return value;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Sunucu tarafındaki işlemlerin izlenebilirlik oranı
  tracesSampleRate: 1.0,

  debug: false,

  beforeSend(event) {
    if (!event) return event;

    if (event.request) {
      if (event.request.headers) {
        const headers = event.request.headers;
        for (const key in headers) {
          if (Object.prototype.hasOwnProperty.call(headers, key)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey === "cookie" || lowerKey === "authorization" || lowerKey === "set-cookie") {
              headers[key] = "[REDACTED]";
            } else if (typeof headers[key] === "string") {
              headers[key] = headers[key].replace(EMAIL_REGEX, "[REDACTED]");
            }
          }
        }
      }
      if (event.request.cookies) {
        if (typeof event.request.cookies === "string") {
          (event.request as { cookies?: unknown }).cookies = "[REDACTED]";
        } else {
          for (const key in event.request.cookies) {
            event.request.cookies[key] = "[REDACTED]";
          }
        }
      }
      if (event.request.data && typeof event.request.data === "string") {
        event.request.data = event.request.data
          .replace(EMAIL_REGEX, "[REDACTED]")
          .replace(/("drugIds"\s*:\s*\[)[^\]]*(\])/gi, "$1\"[REDACTED]\"$2")
          .replace(/(session=)[a-zA-Z0-9%._:+-]+/gi, "$1[REDACTED]");
      }
    }

    if (event.message && typeof event.message === "string") {
      event.message = event.message.replace(EMAIL_REGEX, "[REDACTED]");
    }

    if (event.exception && event.exception.values) {
      for (const val of event.exception.values) {
        if (val.value && typeof val.value === "string") {
          val.value = val.value.replace(EMAIL_REGEX, "[REDACTED]");
        }
      }
    }

    if (event.breadcrumbs) {
      for (const breadcrumb of event.breadcrumbs) {
        if (breadcrumb.message && typeof breadcrumb.message === "string") {
          breadcrumb.message = breadcrumb.message
            .replace(EMAIL_REGEX, "[REDACTED]")
            .replace(/(session=)[a-zA-Z0-9%._:+-]+/gi, "$1[REDACTED]")
            .replace(/("drugIds"\s*:\s*\[)[^\]]*(\])/gi, "$1\"[REDACTED]\"$2");
        }
        if (breadcrumb.data) {
          breadcrumb.data = scrubPIIData(breadcrumb.data) as Record<string, unknown> | undefined;
        }
      }
    }

    return event;
  }
});
