/**
 * AppModule reads this when the module graph loads (before tests run).
 * Keeps HTTP e2e free of Socket.IO + extra Redis connections when Redis is absent.
 */
process.env.DISABLE_WEBSOCKET ??= 'true';
