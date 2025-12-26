/**
 * Simple logger that writes to stderr (stdout reserved for MCP protocol).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

/**
 * Set the minimum log level.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get current timestamp in ISO format.
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Format and write log message to stderr.
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;

  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const formatted = args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
  console.error(`${prefix} ${formatted}`);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => log("debug", message, ...args),
  info: (message: string, ...args: unknown[]) => log("info", message, ...args),
  warn: (message: string, ...args: unknown[]) => log("warn", message, ...args),
  error: (message: string, ...args: unknown[]) => log("error", message, ...args),
};
