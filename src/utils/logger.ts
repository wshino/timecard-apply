import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'application.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Processing history logger
export function logProcessingResult(result: {
  type: 'success' | 'error' | 'skip';
  rowId?: string;
  message: string;
  details?: any;
}) {
  const historyFile = path.join(logsDir, `processing-history-${new Date().toISOString().split('T')[0]}.log`);
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    ...result
  };
  
  // Append to history file
  fs.appendFileSync(historyFile, JSON.stringify(logEntry) + '\n');
  
  // Also log to main logger
  if (result.type === 'error') {
    logger.error(result.message, result.details);
  } else if (result.type === 'skip') {
    logger.warn(result.message, result.details);
  } else {
    logger.info(result.message, result.details);
  }
}

// Session logger
export function logSession(event: 'start' | 'end', stats?: {
  processed?: number;
  errors?: number;
  skipped?: number;
  duration?: number;
}) {
  const sessionFile = path.join(logsDir, 'sessions.log');
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    event,
    ...stats
  };
  
  fs.appendFileSync(sessionFile, JSON.stringify(logEntry) + '\n');
  
  if (event === 'start') {
    logger.info('Session started');
  } else {
    logger.info('Session ended', stats);
  }
}