import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL || 'INFO';

function getTimestamp() {
  return new Date().toISOString();
}

function shouldLog(level) {
  return logLevels[level] <= logLevels[currentLogLevel];
}

function writeToFile(message) {
  try {
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

export const logger = {
  error: (message, metadata = {}) => {
    if (shouldLog('ERROR')) {
      const logMessage = `[${getTimestamp()}] [ERROR] ${message} ${JSON.stringify(metadata)}`;
      console.error(logMessage);
      writeToFile(logMessage);
    }
  },
  
  warn: (message, metadata = {}) => {
    if (shouldLog('WARN')) {
      const logMessage = `[${getTimestamp()}] [WARN] ${message} ${JSON.stringify(metadata)}`;
      console.warn(logMessage);
      writeToFile(logMessage);
    }
  },
  
  info: (message, metadata = {}) => {
    if (shouldLog('INFO')) {
      const logMessage = `[${getTimestamp()}] [INFO] ${message} ${JSON.stringify(metadata)}`;
      console.log(logMessage);
      writeToFile(logMessage);
    }
  },
  
  debug: (message, metadata = {}) => {
    if (shouldLog('DEBUG')) {
      const logMessage = `[${getTimestamp()}] [DEBUG] ${message} ${JSON.stringify(metadata)}`;
      console.debug(logMessage);
      writeToFile(logMessage);
    }
  },
  
  // Specialized loggers for different modules
  api: (method, endpoint, statusCode, duration, metadata = {}) => {
    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`;
    if (statusCode >= 500) {
      logger.error(message, metadata);
    } else if (statusCode >= 400) {
      logger.warn(message, metadata);
    } else {
      logger.info(message, metadata);
    }
  },
  
  wallet: (action, address, chain, metadata = {}) => {
    logger.info(`Wallet ${action}: ${address} (${chain})`, metadata);
  },
  
  purchase: (action, purchaseId, amount, chain, metadata = {}) => {
    logger.info(`Purchase ${action}: ${purchaseId} - $${amount} (${chain})`, metadata);
  },
  
  transaction: (action, txHash, chain, metadata = {}) => {
    logger.info(`Transaction ${action}: ${txHash} (${chain})`, metadata);
  },
  
  // Performance logging
  performance: (operation, duration, metadata = {}) => {
    const message = `${operation} took ${duration}ms`;
    if (duration > 1000) {
      logger.warn(message, metadata);
    } else if (duration > 100) {
      logger.info(message, metadata);
    } else {
      logger.debug(message, metadata);
    }
  },
  
  // Security logging
  security: (event, user, metadata = {}) => {
    logger.warn(`Security event: ${event} - User: ${user}`, metadata);
  },
  
  // Admin actions logging
  admin: (action, adminId, metadata = {}) => {
    logger.info(`Admin action: ${action} by ${adminId}`, metadata);
  },
  
  // Get recent logs
  getRecentLogs: (limit = 100) => {
    try {
      if (!fs.existsSync(LOG_FILE)) {
        return [];
      }
      
      const logContent = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      return lines.slice(-limit);
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  },
  
  // Clear old logs
  clearOldLogs: (daysToKeep = 7) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      if (!fs.existsSync(LOG_FILE)) {
        return;
      }
      
      const logContent = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const recentLogs = lines.filter(line => {
        const timestampMatch = line.match(/\[(.*?)\]/);
        if (timestampMatch) {
          const logDate = new Date(timestampMatch[1]);
          return logDate >= cutoffDate;
        }
        return true; // Keep lines without timestamps
      });
      
      fs.writeFileSync(LOG_FILE, recentLogs.join('\n') + '\n');
      logger.info(`Cleared logs older than ${daysToKeep} days`);
    } catch (error) {
      logger.error('Error clearing old logs:', { error: error.message });
    }
  },
  
  // Middleware for Express
  middleware: (req, res, next) => {
    const start = Date.now();
    
    // Log request
    logger.debug(`Request: ${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined
    });
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - start;
      
      // Log response
      logger.api(req.method, req.originalUrl, res.statusCode, duration, {
        ip: req.ip,
        duration
      });
      
      originalSend.call(this, body);
    };
    
    next();
  }
};

// Auto-clear old logs on startup
logger.clearOldLogs(7);

export default logger;
