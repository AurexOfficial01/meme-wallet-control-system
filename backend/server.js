// backend/server.js - Minimal working version
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Create minimal inline utilities to avoid import issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple logger
const logger = {
  error: (msg) => console.error(`[ERROR] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  middleware: (req, res, next) => next()
};

// Create simple storage
const DATA_DIR = path.join(__dirname, 'data');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

function ensureDataFiles() {
  try {
    // Ensure files exist
    [WALLETS_FILE, PURCHASES_FILE, TRANSACTIONS_FILE].forEach(file => {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[]');
      }
    });
  } catch (error) {
    console.error('Error ensuring data files:', error.message);
  }
}

function loadWallets() {
  try {
    if (!fs.existsSync(WALLETS_FILE)) return [];
    const data = fs.readFileSync(WALLETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveWallets(wallets) {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
  } catch (error) {
    console.error('Error saving wallets:', error.message);
  }
}

function loadPurchases() {
  try {
    if (!fs.existsSync(PURCHASES_FILE)) return [];
    const data = fs.readFileSync(PURCHASES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function savePurchases(purchases) {
  try {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(purchases, null, 2));
  } catch (error) {
    console.error('Error saving purchases:', error.message);
  }
}

const app = express();

// Basic CORS
app.use(cors());
app.use(express.json());

// Initialize data files
ensureDataFiles();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Crypto Wallet API is running',
    timestamp: new Date().toISOString()
  });
});

// GET /api/rates
app.get('/api/rates', (req, res) => {
  res.json({ success: true, data: { rate: 40 } });
});

// GET /api/payment/details
app.get('/api/payment/details', (req, res) => {
  try {
    const { chain, usdAmount } = req.query;
    
    if (!chain || !usdAmount) {
      return res.json({ 
        success: false, 
        error: 'Missing chain or usdAmount parameter' 
      });
    }
    
    const usdAmountNum = parseFloat(usdAmount);
    if (isNaN(usdAmountNum) || usdAmountNum <= 0) {
      return res.json({ 
        success: false, 
        error: 'Invalid USD amount' 
      });
    }
    
    // Calculate USDT amount
    let usdtAmount = 0;
    if (usdAmountNum === 20) usdtAmount = 1000;
    else if (usdAmountNum === 50) usdtAmount = 2500;
    else if (usdAmountNum === 100) usdtAmount = 5000;
    else if (usdAmountNum > 100) usdtAmount = Math.floor(usdAmountNum * 40);
    else usdtAmount = Math.floor(usdAmountNum * 40);
    
    // Get receiving address based on chain
    let receivingAddress = '';
    if (chain.toLowerCase().includes('evm') || chain.toLowerCase().includes('eth')) {
      receivingAddress = '0xdb77c99f57d527b25a02760bd8dce833ba48dc46';
    } else if (chain.toLowerCase().includes('sol')) {
      receivingAddress = '5zPETBCsny3sHcoHHQVybojxq5Qi2pGYUMJMmkA5KU8b';
    } else if (chain.toLowerCase().includes('tron')) {
      receivingAddress = 'TAmhzoBrfV3Y5GmmSp4Ry3C56Nf2rVEdrr';
    } else {
      return res.json({ success: false, error: 'Unsupported chain' });
    }
    
    const transactionId = Date.now().toString();
    
    // Save purchase
    const purchases = loadPurchases();
    purchases.push({
      id: transactionId,
      chain: chain.toLowerCase(),
      usdAmount: usdAmountNum,
      usdtAmount,
      receivingAddress,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    savePurchases(purchases);
    
    res.json({
      success: true,
      data: {
        transactionId,
        chain: chain.toLowerCase(),
        receivingAddress,
        usdtAmount,
        usdAmount: usdAmountNum,
        qrCode: null, // Placeholder
        rate: 40
      }
    });
    
  } catch (error) {
    logger.error(`Payment details error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/payment/verify
app.post('/api/payment/verify', (req, res) => {
  try {
    const { transactionId, transactionHash, chain } = req.body;
    
    if (!transactionId || !transactionHash || !chain) {
      return res.json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const purchases = loadPurchases();
    const purchase = purchases.find(p => p.id === transactionId);
    
    if (!purchase) {
      return res.json({ success: false, error: 'Transaction not found' });
    }
    
    // For now, just mark as completed (in real app, verify blockchain tx)
    purchase.status = 'completed';
    purchase.verifiedAt = new Date().toISOString();
    purchase.transactionHash = transactionHash;
    
    savePurchases(purchases);
    
    res.json({
      success: true,
      data: {
        verified: true,
        transactionId,
        usdtAmount: purchase.usdtAmount,
        message: 'Payment verified successfully'
      }
    });
    
  } catch (error) {
    logger.error(`Payment verify error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/wallet/connect
app.post('/api/wallet/connect', (req, res) => {
  try {
    const { address, chain } = req.body;
    
    if (!address || !chain) {
      return res.json({ 
        success: false, 
        error: 'Missing address or chain' 
      });
    }
    
    const wallets = loadWallets();
    wallets.push({
      address,
      chain: chain.toLowerCase(),
      connectedAt: new Date().toISOString(),
      ip: req.ip
    });
    
    saveWallets(wallets);
    
    res.json({
      success: true,
      data: {
        address,
        chain,
        connectedAt: new Date().toISOString(),
        message: 'Wallet connected successfully'
      }
    });
    
  } catch (error) {
    logger.error(`Wallet connect error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Export for Vercel
export default app;
