/** @jest-environment node */
import { NextResponse } from "next/server";
import { jsonNoStore } from "../lib/http";

// Mock NextResponse
jest.mock("next/server", () => {
  return {
    NextResponse: {
      json: jest.fn(),
    },
  };
});

describe("http utility functions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("jsonNoStore", () => {
    it("should return a NextResponse with no-store headers and default status 200", () => {
      const mockBody = { message: "success" };
      jsonNoStore(mockBody);

      expect(NextResponse.json).toHaveBeenCalledWith(mockBody, {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    });

    it("should return a NextResponse with no-store headers and custom status", () => {
      const mockBody = { error: "not found" };
      jsonNoStore(mockBody, 404);

      expect(NextResponse.json).toHaveBeenCalledWith(mockBody, {
        status: 404,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    });
  });
});
