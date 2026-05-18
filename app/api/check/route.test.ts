import { test, describe } from "node:test";
import assert from "node:assert";
import { POST } from "./route.ts";

describe("POST /api/check", () => {
  test("returns 200 and interactions for valid drug IDs", async () => {
    const mockRequest = {
      json: async () => ({ drugIds: ["aspirin", "warfarin"] }),
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(data.interactions));
    assert.strictEqual(data.checkedDrugs.length, 2);
    assert.strictEqual(data.totalFound, 1);
  });

  test("returns 400 when less than 2 drug IDs are provided", async () => {
    const mockRequest = {
      json: async () => ({ drugIds: ["aspirin"] }),
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.error, "En az 2 ilaç ID'si gereklidir.");
  });

  test("returns 400 when drugIds is not an array", async () => {
    const mockRequest = {
      json: async () => ({ drugIds: "not-an-array" }),
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.error, "En az 2 ilaç ID'si gereklidir.");
  });

  test("returns 500 when JSON parsing fails (Error path test)", async () => {
    const mockRequest = {
      json: async () => {
        throw new Error("Invalid JSON");
      },
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    assert.strictEqual(response.status, 500);
    assert.strictEqual(data.error, "Kontrol sırasında bir hata oluştu.");
  });
});
