import { createOperationOutcomeResponse } from "../lib/utils/fhir";
import { NextResponse } from "next/server";

describe("createOperationOutcomeResponse", () => {
  it.each([
    ["error", "not-found", "Resource not found", 404],
    ["warning", "incomplete", "Some fields are missing", 400],
    ["information", "informational", "Just letting you know", 200],
    ["fatal", "exception", "System failure", 500]
  ] as const)(
    "should create a valid OperationOutcome response for %s",
    async (severity, code, diagnostics, status) => {
      const response = createOperationOutcomeResponse(
        severity,
        code,
        diagnostics,
        status
      );

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(status);

      const body = await response.json();
      expect(body).toEqual({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity,
            code,
            diagnostics
          }
        ]
      });
    }
  );
});
