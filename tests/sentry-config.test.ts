import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(),
}));

describe("Sentry Client / Server / Edge Configuration PII Scrubbing", () => {
  let beforeSendHandler: (event: any) => any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      require("../sentry.client.config");
    });
    const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
    beforeSendHandler = initCall.beforeSend;
  });

  it("should scrub PII data from breadcrumb data objects", () => {
    const mockEvent = {
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

    const processedEvent = beforeSendHandler(mockEvent);

    expect(processedEvent.breadcrumbs[0].message).toContain("[REDACTED]");
    expect(processedEvent.breadcrumbs[0].data.email).toBe("[REDACTED]");
    expect(processedEvent.breadcrumbs[0].data.userNotes).toBe("Contact at [REDACTED]");
    expect(processedEvent.breadcrumbs[0].data.nested.cookie).toBe("[REDACTED]");
    expect(processedEvent.breadcrumbs[0].data.nested.drugs).toBe("[REDACTED]");
  });

  it("should scrub PII data from request headers and cookies", () => {
    const mockEvent = {
      request: {
        headers: {
          authorization: "Bearer secret-token",
          "x-user-email": "user@test.com",
        },
        cookies: "session=abc123secret",
      },
    };

    const processedEvent = beforeSendHandler(mockEvent);

    expect(processedEvent.request.headers.authorization).toBe("[REDACTED]");
    expect(processedEvent.request.headers["x-user-email"]).toBe("[REDACTED]");
    expect(processedEvent.request.cookies).toBe("[REDACTED]");
  });
});
