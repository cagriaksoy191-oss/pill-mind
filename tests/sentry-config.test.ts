import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(),
}));

const configs = [
  { name: "Client", load: () => import("../sentry.client.config") },
  { name: "Server", load: () => import("../sentry.server.config") },
  { name: "Edge", load: () => import("../sentry.edge.config") },
];

describe.each(configs)("Sentry $name Configuration PII Scrubbing", ({ load }) => {
  let beforeSendHandler: (event: Sentry.Event) => Sentry.Event | null | Promise<Sentry.Event | null>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await jest.isolateModulesAsync(async () => {
      await load();
    });
    const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
    beforeSendHandler = initCall.beforeSend;
  });

  it("should scrub PII data from breadcrumb data objects", () => {
    const mockEvent: Sentry.Event = {
      breadcrumbs: [
        {
          message: "User logged in with email test@example.com",
          data: {
            email: "sensitive@example.com",
            userNotes: "Contact at user@domain.com",
            nested: {
              cookie: "session=xyz123",
              drugs: ["aspirin"],
            },
          },
        },
      ],
    };

    const processedEvent = beforeSendHandler(mockEvent) as Sentry.Event;

    expect(processedEvent.breadcrumbs?.[0].message).toContain("[REDACTED]");
    expect((processedEvent.breadcrumbs?.[0].data as Record<string, unknown>).email).toBe("[REDACTED]");
    expect((processedEvent.breadcrumbs?.[0].data as Record<string, unknown>).userNotes).toBe("Contact at [REDACTED]");
    expect(((processedEvent.breadcrumbs?.[0].data as Record<string, unknown>).nested as Record<string, unknown>).cookie).toBe("[REDACTED]");
    expect(((processedEvent.breadcrumbs?.[0].data as Record<string, unknown>).nested as Record<string, unknown>).drugs).toBe("[REDACTED]");
  });

  it("should scrub PII data from request headers and cookies", () => {
    const mockEvent: Sentry.Event = {
      request: {
        headers: {
          authorization: "Bearer secret-token",
          "x-user-email": "user@test.com",
        },
        cookies: "session=abc123secret",
      },
    };

    const processedEvent = beforeSendHandler(mockEvent) as Sentry.Event;

    expect(processedEvent.request?.headers?.authorization).toBe("[REDACTED]");
    expect(processedEvent.request?.headers?.["x-user-email"]).toBe("[REDACTED]");
    expect(processedEvent.request?.cookies).toBe("[REDACTED]");
  });
});
