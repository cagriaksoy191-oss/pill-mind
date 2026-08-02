import { NextResponse } from "next/server";

export function createOperationOutcomeResponse(
  severity: "error" | "warning" | "information" | "fatal",
  code: string,
  diagnostics: string,
  status: number
) {
  return NextResponse.json({
    resourceType: "OperationOutcome",
    issue: [
      {
        severity,
        code,
        diagnostics
      }
    ]
  }, { status });
}
