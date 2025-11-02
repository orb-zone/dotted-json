/**
 * Structured Logging Module
 *
 * Provides a simple, configurable logging system for JSöN with production suppression.
 * Replaces scattered console.warn/error calls with structured output and control.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface LoggerConfig {
  /** Minimum log level to output (default: 'warn' in production, 'debug' otherwise) */
  minLevel?: LogLevel;

  /** Custom output function (default: console) */
  output?: (entry: LogEntry) => void;

  /** If true, suppress all logs (useful for tests or production) */
  silent?: boolean;

  /** Prefix for all log messages */
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    const isProduction =
      typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV === 'production';

    this.config = {
      minLevel: isProduction ? 'warn' : 'debug',
      output: this.defaultOutput,
      silent: false,
      prefix: '[JSöN]',
      ...config,
    };
  }

  private defaultOutput = (entry: LogEntry): void => {
    if (typeof globalThis === 'undefined' || !globalThis.console) {
      return;
    }

    const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
    const message = `${prefix}${entry.level.toUpperCase()}: ${entry.message}`;

    const consoleMethod = globalThis.console[
      entry.level as 'debug' | 'info' | 'warn' | 'error'
    ] as (msg: string, ctx?: Record<string, unknown>) => void;

    if (consoleMethod) {
      if (entry.context && Object.keys(entry.context).length > 0) {
        consoleMethod(message, entry.context);
      } else {
        consoleMethod(message);
      }
    }
  };

  private shouldLog(level: LogLevel): boolean {
    if (this.config.silent) {
      return false;
    }

    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
    };

    this.config.output(entry);
  }

  /**
   * Log a debug message (lowest priority)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning (default in production)
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Update logger configuration
   */
  configure(config: LoggerConfig): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

/**
 * Get or create the global logger instance
 *
 * @param config - Optional configuration (only used on first call)
 * @returns The global logger instance
 *
 * @example
 * ```typescript
 * const logger = getLogger();
 * logger.warn('Something unexpected happened', { data: value });
 *
 * // Suppress all logs in tests
 * getLogger().configure({ silent: true });
 * ```
 */
export function getLogger(config?: LoggerConfig): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

/**
 * Convenience function to log a warning
 */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  getLogger().warn(message, context);
}

/**
 * Convenience function to log an error
 */
export function logError(message: string, context?: Record<string, unknown>): void {
  getLogger().error(message, context);
}

/**
 * Convenience function to log debug info
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  getLogger().debug(message, context);
}

/**
 * Convenience function to log info
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  getLogger().info(message, context);
}
