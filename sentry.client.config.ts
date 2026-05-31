// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // NEXT_PUBLIC_SENTRY_DSN veya evrensel SENTRY_DSN kullanılıyor
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Geliştirme aşamasında izlenebilirlik için tüm işlemler Sentry'ye gönderilir
  tracesSampleRate: 1.0,

  // Console loglarını meşgul etmemek için debug modu kapalı
  debug: false,

  // Hata durumunda session replays'i 100% oranında kaydeder
  replaysOnErrorSampleRate: 1.0,

  // Normal oturumlarda session replays'i %10 oranında kaydeder
  replaysSessionSampleRate: 0.1,
});
