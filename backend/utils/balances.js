import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be set via environment variable)
const CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
const LOG_LEVEL_NUM = LOG_LEVELS[CURRENT_LOG_LEVEL] || LOG_LEVELS.INFO;

// Sensitive field patterns to redact
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'key',
  'token',
  'apiKey',
  'apikey',
  'auth',
  'authorization',
  'privateKey',
  'mnemonic',
  'seed',
  'passphrase',
  'jwt',
  'accessToken',
  'refreshToken'
];

// Get current timestamp in ISO format
function getTimestamp() {
  return new Date().toISOString();
}

// Redact sensitive information from metadata
function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  const sanitized = { ...metadata };
  
  for (const key in sanitized) {
    const keyLower = key.toLowerCase();
    
    // Check if this key should be redacted
    const shouldRedact = SENSITIVE_FIELDS.some(field => 
      keyLower.includes(field.toLowerCase())
    );
    
    if (shouldRedact && sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
    
    // Recursively sanitize nested objects
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Format log message
function formatLogMessage(level, message, metadata = {}) {
  const timestamp = getTimestamp();
  const sanitizedMetadata = sanitizeMetadata(metadata);
  
  let logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Only add metadata if it exists and is not empty
  if (sanitizedMetadata && Object.keys(sanitizedMetadata).length > 0) {
    try {
      logLine += ` ${JSON.stringify(sanitizedMetadata)}`;
    } catch (error) {
      // If JSON.stringify fails (circular reference, etc.), include error in log
      logLine += ` {metadataError: "${error.message}"}`;
    }
  }
  
  return logLine;
}

// Check if should log at this level
function shouldLog(level) {
  const levelNum = LOG_LEVELS[level.toUpperCase()];
  return levelNum !== undefined && levelNum >= LOG_LEVEL_NUM;
}

// Core logger functions
export const logger = {
  error: (message, metadata = {}) => {
    if (shouldLog('ERROR')) {
      console.error(formatLogMessage('ERROR', message, metadata));
    }
  },
  
  warn: (message, metadata = {}) => {
    if (shouldLog('WARN')) {
      console.warn(formatLogMessage('WARN', message, metadata));
    }
  },
  
  info: (message, metadata = {}) => {
    if (shouldLog('INFO')) {
      console.log(formatLogMessage('INFO', message, metadata));
    }
  },
  
  debug: (message, metadata = {}) => {
    if (shouldLog('DEBUG')) {
      console.debug(formatLogMessage('DEBUG', message, metadata));
    }
  },
  
  // Specialized loggers
  api: (method, endpoint, statusCode, duration, metadata = {}) => {
    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`;
    const apiMetadata = {
      ...metadata,
      method,
      endpoint,
      statusCode,
      duration
    };
    
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
    const walletMetadata = {
      ...metadata,
      action,
      address: address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : null,
      chain
    };
    logger.info(message, walletMetadata);
  },
  
  purchase: (action, purchaseId, amount, chain, metadata = {}) => {
    const message = `Purchase ${action}: ${purchaseId} - $${amount} (${chain})`;
    const purchaseMetadata = {
      ...metadata,
      action,
      purchaseId,
      amount,
      chain
    };
    logger.info(message, purchaseMetadata);
  },
  
  transaction: (action, txHash, chain, metadata = {}) => {
    const message = `Transaction ${action}: ${txHash?.substring(0, 16)}... (${chain})`;
    const txMetadata = {
      ...metadata,
      action,
      txHash: txHash ? `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}` : null,
      chain
    };
    logger.info(message, txMetadata);
  },
  
  performance: (operation, duration, metadata = {}) => {
    const message = `${operation} - ${duration}ms`;
    const perfMetadata = {
      ...metadata,
      operation,
      duration
    };
    
    if (duration > 1000) {
      logger.warn(message, perfMetadata);
    } else if (duration > 100) {
      logger.info(message, perfMetadata);
    } else {
      logger.debug(message, perfMetadata);
    }
  },
  
  security: (event, user, metadata = {}) => {
    const message = `Security: ${event} - User: ${user || 'unknown'}`;
    const securityMetadata = {
      ...metadata,
      event,
      user: user ? `${user.substring(0, 6)}...` : null
    };
    logger.warn(message, securityMetadata);
  },
  
  admin: (action, adminId, metadata = {}) => {
    const message = `Admin: ${action} - AdminID: ${adminId?.substring(0, 8)}...`;
    const adminMetadata = {
      ...metadata,
      action,
      adminId: adminId ? `${adminId.substring(0, 4)}...` : null
    };
    logger.info(message, adminMetadata);
  },
  
  // Express middleware for request/response logging
  middleware: (req, res, next) => {
    const startTime = Date.now();
    
    // Log incoming request (debug level)
    logger.debug(`Request started: ${req.method} ${req.originalUrl}`, {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
      query: Object.keys(req.query).length > 0 ? req.query : undefined
    });
    
    // Capture original send function
    const originalSend = res.send;
    
    // Override send to capture response info
    res.send = function(body) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode || 200;
      
      // Log the API call
      logger.api(req.method, req.originalUrl, statusCode, duration, {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent') || 'unknown',
        contentLength: res.get('content-length') || (typeof body === 'string' ? body.length : 'unknown')
      });
      
      // Call original send
      return originalSend.call(this, body);
    };
    
    // Handle response finish event as backup
    res.on('finish', () => {
      if (!res.writableFinished) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode || 500;
        
        logger.warn(`Response finished without send override: ${req.method} ${req.originalUrl}`, {
          statusCode,
          duration,
          ip: req.ip || req.socket.remoteAddress
        });
      }
    });
    
    // Handle errors
    res.on('error', (error) => {
      const duration = Date.now() - startTime;
      logger.error(`Response error: ${req.method} ${req.originalUrl}`, {
        error: error.message,
        duration,
        ip: req.ip || req.socket.remoteAddress
      });
    });
    
    next();
  },
  
  // Helper to get current log level
  getLogLevel: () => CURRENT_LOG_LEVEL,
  
  // Helper to check if a level is enabled
  isLevelEnabled: (level) => shouldLog(level)
};

export default logger;
