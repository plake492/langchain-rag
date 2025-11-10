import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import { LogginTypes } from '@types';

export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
};

export const objLog = (value: {}) => JSON.stringify(value, null, 2);

export function getLogFile(fileName: string) {
  // Create Log Directory at src root
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, fileName);
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return fs.createWriteStream(logFile, { flags: 'a' });
}

export function logToFile({ type, file }: LogginTypes, data?: { [key: string]: any }) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${type}] ${timestamp}`;

  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      const formattedValue = typeof value === 'object' ? `\n${JSON.stringify(value, null, 2)}` : value;
      logMessage += `\n${capitalize(key)}: ${formattedValue}`;
    });
  }

  logMessage += '\n' + '-'.repeat(80) + '\n';

  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, `${file}.log`);

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.appendFileSync(logFile, logMessage);
}

export function createMorganLogger(fileName: string) {
  const logFormat = `:timestamp | :method :url | Status: :status | :response-time ms | IP: :remote-addr`;
  const accessLogStream = getLogFile(fileName);
  return morgan(logFormat, { stream: accessLogStream });
}
