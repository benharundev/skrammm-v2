// Global test setup — runs before all Vitest unit tests
// Add mock resets, global stubs, or DB teardown hooks here as needed

// Provide a dummy Redis URL so the ioredis client is instantiated in tests.
// The actual connection is never opened because ioredis is mocked in unit tests
// and the client is configured with lazyConnect: true.
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
