import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
const mockGet = vi.fn(async (key: string) => store.get(key) ?? null);
const mockSet = vi.fn(async (key: string, value: string, _ex: string, _ttl: number) => {
  store.set(key, value);
  return "OK" as const;
});
const mockDel = vi.fn(async (key: string) => {
  store.delete(key);
  return 1;
});

vi.mock("ioredis", () => ({
  default: vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    del: mockDel,
    on: vi.fn(),
  })),
}));

describe("cachedFn", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("calls fn on cache miss and stores result", async () => {
    const { cachedFn } = await import("./index");
    const fn = vi.fn(async () => ({ score: 42 }));
    const result = await cachedFn("miss-key", 300, fn);
    expect(result).toEqual({ score: 42 });
    expect(fn).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("miss-key", JSON.stringify({ score: 42 }), "EX", 300);
  });

  it("returns cached value on hit without calling fn", async () => {
    const { cachedFn } = await import("./index");
    const fn = vi.fn(async () => ({ score: 99 }));
    await cachedFn("hit-key", 300, fn);
    const second = await cachedFn("hit-key", 300, fn);
    expect(second).toEqual({ score: 99 });
    expect(fn).toHaveBeenCalledOnce();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("falls through to fn when Redis get throws", async () => {
    const { cachedFn } = await import("./index");
    mockGet.mockRejectedValueOnce(new Error("Redis down"));
    const fn = vi.fn(async () => 777);
    const result = await cachedFn("error-key", 300, fn);
    expect(result).toBe(777);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("propagates fn() error without calling fn() a second time", async () => {
    const { cachedFn } = await import("./index");
    const error = new Error("DB down");
    const fn = vi.fn(async () => { throw error; });
    await expect(cachedFn("throw-key", 300, fn)).rejects.toThrow("DB down");
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("cache.del", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("removes key so next cachedFn call misses", async () => {
    const { cachedFn, cache } = await import("./index");
    const fn = vi.fn(async () => "value");
    await cachedFn("del-key", 300, fn);
    await cache.del("del-key");
    expect(mockDel).toHaveBeenCalledWith("del-key");
    await cachedFn("del-key", 300, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
