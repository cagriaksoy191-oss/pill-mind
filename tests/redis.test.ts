import { jest } from '@jest/globals';

describe('Redis Initialization', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleInfoSpy: jest.SpiedFunction<typeof console.info>;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module registry to ensure a fresh import of lib/redis
    jest.resetModules();

    // Setup process.env isolation
    process.env = { ...originalEnv };

    // Set mock env vars
    process.env.UPSTASH_REDIS_REST_URL = 'http://test-url.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('should handle initialization errors when Redis constructor throws', async () => {
    // Use doMock to mock correctly locally within the test
    jest.doMock('@upstash/redis', () => {
      return {
        Redis: jest.fn().mockImplementation(() => {
          throw new Error('Connection failed');
        })
      };
    });

    // Re-import the module under test
    const { redis } = await import('../lib/redis');

    // Assertions
    expect(redis).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Redis] Failed to initialize Upstash Redis:',
      expect.any(Error)
    );
    expect(consoleErrorSpy.mock.calls[0][1].message).toBe('Connection failed');

    jest.dontMock('@upstash/redis');
  });

  it('should initialize successfully when credentials are provided and valid', async () => {
    jest.doMock('@upstash/redis', () => {
      return {
        Redis: jest.fn().mockImplementation(() => ({
          test: true
        }))
      };
    });

    // Re-import the module under test
    const { redis } = await import('../lib/redis');

    // Assertions
    expect(redis).not.toBeNull();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[Redis] Upstash Redis initialized successfully.'
    );

    jest.dontMock('@upstash/redis');
  });

  it('should not initialize and log info when credentials are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    jest.doMock('@upstash/redis', () => {
      return {
        Redis: jest.fn()
      };
    });

    // Re-import the module under test
    const { redis } = await import('../lib/redis');

    // Assertions
    expect(redis).toBeNull();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[Redis] Upstash Redis environment variables are missing. Caching is disabled.'
    );

    jest.dontMock('@upstash/redis');
  });
});
