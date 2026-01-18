/**
 * Centralized Logging System
 * All events from Bridge, Router, and Core are logged with context
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Custom format with chatId/persona context
const contextFormat = winston.format.printf(({ level, message, timestamp, chatId, persona, component, ...meta }) => {
  let contextStr = '';
  if (chatId) contextStr += `[${chatId}]`;
  if (persona) contextStr += `[${persona}]`;
  if (component) contextStr += `[${component}]`;

  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${metaStr}`;
});

// Create the logger instance
const logDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    contextFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        contextFormat
      )
    }),
    // Daily rotate file for all logs
    new DailyRotateFile({
      dirname: logDir,
      filename: 'agent-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Separate error log
    new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Logger wrapper with context support
export interface LogContext {
  chatId?: string;
  persona?: string;
  component?: string;
  [key: string]: unknown;
}

export class ContextLogger {
  private defaultContext: LogContext = {};

  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  private log(level: string, message: string, context?: LogContext): void {
    logger.log(level, message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  // Create a child logger with preset context
  child(context: LogContext): ContextLogger {
    const childLogger = new ContextLogger();
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    return childLogger;
  }
}

export const appLogger = new ContextLogger();
export default appLogger;
