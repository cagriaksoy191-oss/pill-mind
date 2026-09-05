import { LRUCache } from "@/lib/lruCache";

describe("LRUCache", () => {
  it("should store and retrieve values", () => {
    const cache = new LRUCache<string, string>(3);
    cache.set("a", "1");
    cache.set("b", "2");

    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBeUndefined();
  });

  it("should evict least recently used items when capacity is exceeded", () => {
    const cache = new LRUCache<string, string>(3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // 'a' is the oldest. Adding 'd' should evict 'a'.
    cache.set("d", "4");

    expect(cache.has("a")).toBe(false);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
    expect(cache.size).toBe(3);
  });

  it("should update recency on get", () => {
    const cache = new LRUCache<string, string>(3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access 'a', making it most recently used.
    expect(cache.get("a")).toBe("1");

    // Now 'b' is the least recently used. Adding 'd' should evict 'b'.
    cache.set("d", "4");

    expect(cache.has("b")).toBe(false);
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  it("should update existing keys without exceeding capacity", () => {
    const cache = new LRUCache<string, string>(2);
    cache.set("a", "1");
    cache.set("b", "2");

    // Update 'a'
    cache.set("a", "10");

    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBe("10");

    // 'b' is now oldest. Adding 'c' should evict 'b'.
    cache.set("c", "30");

    expect(cache.has("b")).toBe(false);
    expect(cache.get("a")).toBe("10");
    expect(cache.get("c")).toBe("30");
  });

  it("should throw error if instantiated with capacity <= 0", () => {
    expect(() => new LRUCache<string, string>(0)).toThrow("Capacity must be greater than 0");
    expect(() => new LRUCache<string, string>(-5)).toThrow("Capacity must be greater than 0");
  });

  it("should clear all items when clear() is called", () => {
    const cache = new LRUCache<string, string>(3);
    cache.set("a", "1");
    cache.set("b", "2");

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.has("a")).toBe(false);
    expect(cache.get("a")).toBeUndefined();
  });
});
