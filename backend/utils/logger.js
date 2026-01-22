export const logger = {
  error: (msg, meta) => console.error(msg, meta),
  warn: (msg, meta) => console.warn(msg, meta),
  info: (msg, meta) => console.log(msg, meta),
  debug: (msg, meta) => console.debug(msg, meta),
  api: (method, endpoint, statusCode, duration, meta) => 
    console.log(`${method} ${endpoint} - ${statusCode} (${duration}ms)`),
  wallet: (action, address, chain, meta) => 
    console.log(`Wallet ${action}: ${address} (${chain})`),
  purchase: (action, purchaseId, amount, chain, meta) => 
    console.log(`Purchase ${action}: ${purchaseId} - $${amount} (${chain})`),
  transaction: (action, txHash, chain, meta) => 
    console.log(`Transaction ${action}: ${txHash} (${chain})`),
  performance: (operation, duration, meta) => 
    console.log(`${operation} - ${duration}ms`),
  security: (event, user, meta) => 
    console.warn(`Security: ${event} - User: ${user}`),
  admin: (action, adminId, meta) => 
    console.log(`Admin: ${action} by ${adminId}`),
  middleware: (req, res, next) => next(),
  getLogLevel: () => 'INFO',
  isLevelEnabled: () => true
};

export default logger;
