// backend/utils/logger.js - Vercel-safe minimal logger
export const logger = {
  error: (message, metadata = {}) => {
    console.error(`[ERROR] ${message}`, metadata);
  },
  
  warn: (message, metadata = {}) => {
    console.warn(`[WARN] ${message}`, metadata);
  },
  
  info: (message, metadata = {}) => {
    console.log(`[INFO] ${message}`, metadata);
  },
  
  debug: (message, metadata = {}) => {
    console.debug(`[DEBUG] ${message}`, metadata);
  },
  
  api: (method, endpoint, statusCode, duration, metadata = {}) => {
    console.log(`[API] ${method} ${endpoint} - ${statusCode} (${duration}ms)`, metadata);
  },
  
  wallet: (action, address, chain, metadata = {}) => {
    console.log(`[WALLET] ${action}: ${address} (${chain})`, metadata);
  },
  
  purchase: (action, purchaseId, amount, chain, metadata = {}) => {
    console.log(`[PURCHASE] ${action}: ${purchaseId} - $${amount} (${chain})`, metadata);
  },
  
  transaction: (action, txHash, chain, metadata = {}) => {
    console.log(`[TRANSACTION] ${action}: ${txHash} (${chain})`, metadata);
  },
  
  performance: (operation, duration, metadata = {}) => {
    console.log(`[PERF] ${operation} - ${duration}ms`, metadata);
  },
  
  security: (event, user, metadata = {}) => {
    console.warn(`[SECURITY] ${event} - User: ${user}`, metadata);
  },
  
  admin: (action, adminId, metadata = {}) => {
    console.log(`[ADMIN] ${action} by ${adminId}`, metadata);
  },
  
  middleware: (req, res, next) => {
    const start = Date.now();
    
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode || 200;
      
      console.log(`[REQUEST] ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`);
      
      return originalSend.call(this, body);
    };
    
    next();
  }
};

export default logger;
