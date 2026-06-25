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

describe('Redis API Resilience Tests', () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    process.env = { ...originalEnv };
    process.env.UPSTASH_REDIS_REST_URL = 'http://test-url.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should bypass rate limiter and succeed in /api/check when Redis throws a connection timeout', async () => {
    // Mock Upstash Redis to throw on incr (connection timeout / offline)
    jest.doMock('@upstash/redis', () => {
      return {
        Redis: (jest.fn() as any).mockImplementation(() => ({
          incr: (jest.fn() as any).mockRejectedValue(new Error('Redis connection timeout')),
          expire: (jest.fn() as any).mockResolvedValue(true),
        }))
      };
    });

    // Mock interactions DB calls
    jest.doMock('../lib/interactions', () => ({
      findInteractionsDB: (jest.fn() as any).mockResolvedValue([{
        interaction: { id: 'test', severity: 'high', summary: 'Test summary' },
        drug1Name: 'Drug A',
        drug2Name: 'Drug B',
      }]),
      checkAccumulationDB: (jest.fn() as any).mockResolvedValue([]),
    }));

    // Dynamically import check route
    const { POST } = await import('../app/api/check/route');

    const req = new Request('http://localhost/api/check', {
      method: 'POST',
      body: JSON.stringify({ drugIds: ['drug-1', 'drug-2'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.interactions).toHaveLength(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Redis Rate Limiter] Resilient Fallback - Bypass due to Redis error:',
      expect.any(Error)
    );

    jest.dontMock('@upstash/redis');
    jest.dontMock('../lib/interactions');
  });

  it('should bypass cache and call Gemini in /api/explain when Redis throws a read timeout', async () => {
    // Mock Upstash Redis to throw on get/incr
    jest.doMock('@upstash/redis', () => {
      return {
        Redis: (jest.fn() as any).mockImplementation(() => ({
          incr: (jest.fn() as any).mockResolvedValue(1),
          expire: (jest.fn() as any).mockResolvedValue(true),
          get: (jest.fn() as any).mockRejectedValue(new Error('Redis read timeout')),
          set: (jest.fn() as any).mockRejectedValue(new Error('Redis write timeout')),
        }))
      };
    });

    // Mock Gemini call
    jest.doMock('../lib/gemini', () => ({
      getInteractionContext: (jest.fn() as any).mockResolvedValue({
        interaction: { id: 'test', severity: 'high' },
        drug1Name: 'Drug A',
        drug2Name: 'Drug B',
      }),
      callGeminiForInteraction: (jest.fn() as any).mockResolvedValue({
        explanation: 'Resilient explanation directly from Gemini.',
        generatedAt: '12:00:00',
      }),
      shouldUseFallback: (jest.fn() as any).mockReturnValue(false),
    }));

    const { POST } = await import('../app/api/explain/route');

    const req = new Request('http://localhost/api/explain', {
      method: 'POST',
      body: JSON.stringify({ interactionId: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.explanation).toBe('Resilient explanation directly from Gemini.');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Redis] Cache read error, continuing to live AI:',
      expect.any(Error)
    );

    jest.dontMock('@upstash/redis');
    jest.dontMock('../lib/gemini');
  });
});
