import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const queryTransports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat })
];

const scraperTransports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat })
];

if (process.env.NODE_ENV !== 'production') {
    queryTransports.push(new DailyRotateFile({
        filename: path.join('logs', 'queries-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
    }));
    queryTransports.push(new DailyRotateFile({
        filename: path.join('logs', 'queries-error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
    }));
    scraperTransports.push(new DailyRotateFile({
        filename: path.join('logs', 'scraper-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
    }));
}


// Query logger - for API requests and responses
const queryLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: queryTransports,
});

// Scraper logger - for scraping activity
const scraperLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: scraperTransports,
});


// Helper functions for structured logging
export const logQuery = (data: { question: string; answer?: string; sources?: number; duration?: number; error?: string; userId?: string }) => {
  const logData = {
    type: 'query',
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (data.error) {
    queryLogger.error('Query failed', logData);
  } else {
    queryLogger.info('Query completed', logData);
  }
};

export const logScraperActivity = (data: {
  action: 'start' | 'scrape_url' | 'validate' | 'deduplicate' | 'store' | 'complete' | 'error';
  url?: string;
  chunks?: number;
  validChunks?: number;
  duplicates?: number;
  totalDocuments?: number;
  organization?: string;
  error?: string;
  message?: string;
}) => {
  const logData = {
    type: 'scraper',
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (data.action === 'error') {
    scraperLogger.error('Scraper error', logData);
  } else {
    scraperLogger.info(`Scraper: ${data.action}`, logData);
  }
};

export { queryLogger, scraperLogger };