import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function safeStringify(obj) {
  try {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      // Remove sensitive data
      if (typeof value === 'string' && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token')
      )) {
        return '[REDACTED]';
      }
      return value;
    });
  } catch (error) {
    return `[Stringify Error: ${error.message}]`;
  }
}

function formatLog(level, message, metadata = {}) {
  const timestamp = getTimestamp();
  const metadataStr = Object.keys(metadata).length > 0 ? safeStringify(metadata) : '';
  
  let logEntry = `[${timestamp}] [${level}] ${message}`;
  if (metadataStr) {
    logEntry += ` ${metadataStr}`;
  }
  
  return logEntry;
}

export const logger = {
  error: (message, metadata = {}) => {
    if (shouldLog('ERROR')) {
      const logEntry = formatLog('ERROR', message, metadata);
      console.error(logEntry);
    }
  },
  
  warn: (message, metadata = {}) => {
    if (shouldLog('WARN')) {
      const logEntry = formatLog('WARN', message, metadata);
      console.warn(logEntry);
    }
  },
  
  info: (message, metadata = {}) => {
    if (shouldLog('INFO')) {
      const logEntry = formatLog('INFO', message, metadata);
      console.log(logEntry);
    }
  },
  
  debug: (message, metadata = {}) => {
    if (shouldLog('DEBUG')) {
      const logEntry = formatLog('DEBUG', message, metadata);
      console.debug(logEntry);
    }
  },
  
  api: (method, endpoint, statusCode, duration, metadata = {}) => {
    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`;
    const apiMetadata = { ...metadata, duration, statusCode };
    
    if (statusCode >= 500) {
      logger.error(message, apiMetadata);
    } else if (statusCode >= 400) {
      logger.warn(message, apiMetadata);
    } else {
      logger.info(message, apiMetadata);
    }
  },
  
  wallet: (action, address, chain, metadata = {}) => {
    const message = `Wallet ${action}: ${address} (${chain})`;
    const walletMetadata = { ...metadata, address, chain, action };
    logger.info(message, walletMetadata);
  },
  
  purchase: (action, purchaseId, amount, chain, metadata = {}) => {
    const message = `Purchase ${action}: ${purchaseId} - $${amount} (${chain})`;
    const purchaseMetadata = { ...metadata, purchaseId, amount, chain, action };
    logger.info(message, purchaseMetadata);
  },
  
  transaction: (action, txHash, chain, metadata = {}) => {
    const message = `Transaction ${action}: ${txHash} (${chain})`;
    const txMetadata = { ...metadata, txHash, chain, action };
    logger.info(message, txMetadata);
  },
  
  performance: (operation, duration, metadata = {}) => {
    const message = `${operation} took ${duration}ms`;
    const perfMetadata = { ...metadata, operation, duration };
    
    if (duration > 1000) {
      logger.warn(message, perfMetadata);
    } else if (duration > 100) {
      logger.info(message, perfMetadata);
    } else {
      logger.debug(message, perfMetadata);
    }
  },
  
  security: (event, user, metadata = {}) => {
    const message = `Security event: ${event} - User: ${user}`;
    const securityMetadata = { ...metadata, event, user };
    logger.warn(message, securityMetadata);
  },
  
  admin: (action, adminId, metadata = {}) => {
    const message = `Admin action: ${action} by ${adminId}`;
    const adminMetadata = { ...metadata, action, adminId };
    logger.info(message, adminMetadata);
  },
  
  middleware: (req, res, next) => {
    const start = Date.now();
    
    // Log request start
    logger.debug(`Request started: ${req.method} ${req.originalUrl}`, {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.method !== 'GET' && req.body && Object.keys(req.body).length > 0 
        ? safeStringify(req.body) 
        : undefined
    });
    
    // Store original send method
    const originalSend = res.send;
    
    // Monkey-patch res.send
    res.send = function(body) {
      const duration = Date.now() - start;
      
      // Ensure statusCode is set
      const statusCode = res.statusCode || 200;
      
      // Log API details
      logger.api(req.method, req.originalUrl, statusCode, duration, {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent') || 'unknown',
        responseSize: typeof body === 'string' ? body.length : 'unknown'
      });
      
      // Call original send
      return originalSend.call(this, body);
    };
    
    // Handle errors
    res.on('finish', () => {
      if (!res.writableFinished) {
        const duration = Date.now() - start;
        const statusCode = res.statusCode || 500;
        
        logger.api(req.method, req.originalUrl, statusCode, duration, {
          ip: req.ip || req.socket.remoteAddress,
          error: 'Response not properly finished'
        });
      }
    });
    
    next();
  }
};

// Export default logger
export default logger;
