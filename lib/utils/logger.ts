/**
 * Structured logging utility for observability
 * Provides consistent logging format across the application
 *
 * Note: This utility works in both client and server contexts.
 * Environment detection is done at runtime to support both environments.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  module: string;
  action: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// ============================================================
// Environment Configuration
// ============================================================

/**
 * Logger configuration - can be set at app initialization
 */
let loggerConfig: { isDev: boolean } | null = null;

/**
 * Configure logger at app initialization
 * Call this from server.ts or app initialization with serverEnv.nodeEnv
 */
export function configureLogger(nodeEnv: string): void {
  loggerConfig = { isDev: nodeEnv === 'development' };
}

/**
 * Get isDev flag - uses configured value or falls back to runtime detection
 * This allows the logger to work before explicit configuration
 */
function getIsDev(): boolean {
  if (loggerConfig !== null) {
    return loggerConfig.isDev;
  }
  // Fallback: detect at runtime (works in both client and server)
  // This is safe because NODE_ENV is set by Next.js build process
  return typeof window === 'undefined'
    ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV ===
        'development'
    : !window.location.hostname.includes('production'); // Client-side heuristic
}

function formatLogEntry(entry: LogEntry): string {
  if (getIsDev()) {
    // Pretty format for development
    const { level, message, context, error } = entry;
    const prefix = `[${level.toUpperCase()}]`;
    const moduleInfo = context ? ` [${context.module}:${context.action}]` : '';
    const errorInfo = error ? ` | Error: ${error.message}` : '';

    // Extract additional context fields (exclude module and action)
    let extraInfo = '';
    if (context) {
      const { module: _m, action: _a, ...extra } = context;
      if (Object.keys(extra).length > 0) {
        // Format extra fields as key=value pairs
        extraInfo =
          ' | ' +
          Object.entries(extra)
            .map(([k, v]) => {
              // Truncate long values (like prompt content)
              // Handle undefined/null values safely
              if (v === undefined) return `${k}=undefined`;
              if (v === null) return `${k}=null`;
              const strVal = typeof v === 'string' ? v : JSON.stringify(v);
              const displayVal = strVal.length > 200 ? strVal.slice(0, 200) + '...' : strVal;
              return `${k}=${displayVal}`;
            })
            .join(', ');
      }
    }

    return `${prefix}${moduleInfo} ${message}${extraInfo}${errorInfo}`;
  }
  // JSON format for production (easier to parse in log aggregators)
  return JSON.stringify(entry);
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: getIsDev() ? error.stack : undefined,
      code: (error as { code?: string }).code,
    };
  }

  return entry;
}

function shouldLog(level: LogLevel): boolean {
  const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const minLevel = getIsDev() ? 'debug' : 'info';
  return logLevels.indexOf(level) >= logLevels.indexOf(minLevel);
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, context);
    console.debug(formatLogEntry(entry));
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, context);
    console.info(formatLogEntry(entry));
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, context);
    console.warn(formatLogEntry(entry));
  },

  error(message: string, error?: Error, context?: LogContext): void {
    if (!shouldLog('error')) return;
    const entry = createLogEntry('error', message, context, error);
    console.error(formatLogEntry(entry));
  },
};
