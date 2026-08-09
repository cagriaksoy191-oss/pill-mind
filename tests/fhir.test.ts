import { createOperationOutcomeResponse } from "../lib/utils/fhir";
import { NextResponse } from "next/server";

describe("createOperationOutcomeResponse", () => {
  it("should create a valid OperationOutcome response for an error", async () => {
    const response = createOperationOutcomeResponse(
      "error",
      "not-found",
      "Resource not found",
      404
    );

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toEqual({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "not-found",
          diagnostics: "Resource not found"
        }
      ]
    });
  });

  it("should create a valid OperationOutcome response for a warning", async () => {
    const response = createOperationOutcomeResponse(
      "warning",
      "incomplete",
      "Some fields are missing",
      400
    );

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "warning",
          code: "incomplete",
          diagnostics: "Some fields are missing"
        }
      ]
    });
  });

  it("should create a valid OperationOutcome response for information", async () => {
    const response = createOperationOutcomeResponse(
      "information",
      "informational",
      "Just letting you know",
      200
    );

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "information",
          code: "informational",
          diagnostics: "Just letting you know"
        }
      ]
    });
  });

  it("should create a valid OperationOutcome response for a fatal error", async () => {
    const response = createOperationOutcomeResponse(
      "fatal",
      "exception",
      "System failure",
      500
    );

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "fatal",
          code: "exception",
          diagnostics: "System failure"
        }
      ]
    });
  });
});
