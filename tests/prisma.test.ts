import { PrismaClient } from "@prisma/client";

// Mock PrismaClient
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
  };
});

describe("prisma.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (globalThis as unknown as { prisma: PrismaClient | undefined }).prisma = undefined;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
    (globalThis as unknown as { prisma: PrismaClient | undefined }).prisma = undefined;
  });

  it("should create a new PrismaClient with development log levels in development mode", () => {
    process.env.NODE_ENV = "development";

    // We must re-require the module to trigger PrismaClient instantiation
    const { PrismaClient: MockPrismaClient } = require("@prisma/client");
    const { prisma } = require("../lib/prisma");

    expect(MockPrismaClient).toHaveBeenCalledTimes(1);
    expect(MockPrismaClient).toHaveBeenCalledWith({
      log: ["query", "error", "warn"],
    });

    // globalThis.prisma should be set
    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
    expect(globalForPrisma.prisma).toBe(prisma);
  });

  it("should create a new PrismaClient with production log levels in production mode", () => {
    process.env.NODE_ENV = "production";

    // We must re-require the module to trigger PrismaClient instantiation
    const { PrismaClient: MockPrismaClient } = require("@prisma/client");
    const { prisma } = require("../lib/prisma");

    expect(MockPrismaClient).toHaveBeenCalledTimes(1);
    expect(MockPrismaClient).toHaveBeenCalledWith({
      log: ["error"],
    });

    // globalThis.prisma should NOT be set
    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
    expect(globalForPrisma.prisma).toBeUndefined();
  });

  it("should reuse the existing globalThis.prisma instance if available", () => {
    process.env.NODE_ENV = "development";

    const mockPrismaInstance = { $connect: jest.fn(), $disconnect: jest.fn() } as unknown as PrismaClient;
    (globalThis as unknown as { prisma: PrismaClient | undefined }).prisma = mockPrismaInstance;

    // clear the mock calls so we can check if it's called during require
    jest.clearAllMocks();
    const { PrismaClient: MockPrismaClient } = require("@prisma/client");
    const { prisma } = require("../lib/prisma");

    // Should not create a new instance
    expect(MockPrismaClient).not.toHaveBeenCalled();
    expect(prisma).toBe(mockPrismaInstance);
  });
});
