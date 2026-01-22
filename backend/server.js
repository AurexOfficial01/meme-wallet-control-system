import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import TronWeb from 'tronweb';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import utilities
import { 
  getEvmBalances, 
  getSolanaBalances, 
  getTronBalances 
} from './utils/balances.js';
import { 
  loadWallets, 
  saveWallets, 
  loadPurchases, 
  savePurchases, 
  loadTransactions, 
  saveTransactions 
} from './utils/storage.js';
import { logger } from './utils/logger.js';

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Owner receiving addresses (HARD-CODED)
const EVM_RECEIVE_ADDRESS = "0xdb77c99f57d527b25a02760bd8dce833ba48dc46";
const SOLANA_RECEIVE_ADDRESS = "5zPETBCsny3sHcoHHQVybojxq5Qi2pGYUMJMmkA5KU8b";
const TRON_RECEIVE_ADDRESS = "TAmhzoBrfV3Y5GmmSp4Ry3C56Nf2rVEdrr";

// RPC endpoints
const RPC_ENDPOINTS = {
  ethereum: 'https://eth.llamarpc.com',
  bsc: 'https://bsc-dataseed.binance.org',
  polygon: 'https://polygon-rpc.com',
  solana: 'https://api.mainnet-beta.solana.com',
  tron: 'https://api.trongrid.io'
};

// Initialize providers
const evmProviders = {
  ethereum: new ethers.JsonRpcProvider(RPC_ENDPOINTS.ethereum),
  bsc: new ethers.JsonRpcProvider(RPC_ENDPOINTS.bsc),
  polygon: new ethers.JsonRpcProvider(RPC_ENDPOINTS.polygon)
};

const solanaConnection = new Connection(RPC_ENDPOINTS.solana);
const tronWeb = new TronWeb({
  fullHost: RPC_ENDPOINTS.tron,
  solidityNode: RPC_ENDPOINTS.tron,
  eventServer: RPC_ENDPOINTS.tron
});

// CORS configuration
const allowedOrigins = [
  'https://meme-wallet-control-system.vercel.app',
  'https://meme-wallet-control-system-opi5.vercel.app',
  'https://meme-wallet-control-system-hx1r.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-api-key']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply logger middleware
app.use(logger.middleware);

// Response formatter middleware
app.use((req, res, next) => {
  res.jsonResponse = (success, data = null, error = null, statusCode = 200) => {
    const response = { success };
    if (data !== null) response.data = data;
    if (error !== null) response.error = error;
    return res.status(statusCode).json(response);
  };
  next();
});

// Admin middleware
const adminMiddleware = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const validAdminKey = process.env.ADMIN_KEY || 'dev-admin-key-123';
  
  if (!adminKey || adminKey !== validAdminKey) {
    logger.security('Invalid admin key attempt', { ip: req.ip });
    return res.jsonResponse(false, null, 'Unauthorized: Valid x-admin-key header required', 401);
  }
  next();
};

// Helper functions
function calculateUSDTAmount(usdAmount) {
  const amount = parseFloat(usdAmount);
  if (isNaN(amount) || amount <= 0) return 0;
  
  if (amount === 20) return 1000;
  if (amount === 50) return 2500;
  if (amount === 100) return 5000;
  if (amount > 100) return Math.floor(amount * 40);
  
  // For amounts not in predefined tiers
  return Math.floor(amount * 40);
}

function getReceivingAddress(chain) {
  const chainLower = chain.toLowerCase();
  
  if (['evm', 'eth', 'ethereum', 'bnb', 'bsc', 'matic', 'polygon'].includes(chainLower)) {
    return EVM_RECEIVE_ADDRESS;
  }
  
  if (['solana', 'sol'].includes(chainLower)) {
    return SOLANA_RECEIVE_ADDRESS;
  }
  
  if (['tron', 'trx'].includes(chainLower)) {
    return TRON_RECEIVE_ADDRESS;
  }
  
  return null;
}

function getQRCodeBase64(chain) {
  try {
    const chainLower = chain.toLowerCase();
    let fileName = null;

    if (['evm','eth','ethereum','bsc','bnb','polygon','matic'].includes(chainLower)) {
      fileName = 'evm.png';
    } else if (['sol','solana'].includes(chainLower)) {
      fileName = 'solana.png';
    } else if (['tron','trx'].includes(chainLower)) {
      fileName = 'tron.png';
    } else {
      return null;
    }

    // FULL PATH → backend/qr/<file>.png
    const qrPath = path.join(__dirname, 'qr', fileName);

    if (fs.existsSync(qrPath)) {
      const imageBuffer = fs.readFileSync(qrPath);
      const base64 = imageBuffer.toString("base64");
      return `data:image/png;base64,${base64}`;
    }

    // Fallback placeholder if PNG not found
    const placeholder = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="100%" height="100%" fill="#ddd"/>
        <text x="50%" y="50%" font-size="16" text-anchor="middle" dy=".3em">
          QR MISSING
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(placeholder).toString("base64")}`;

  } catch (err) {
    logger.error("QR load failed", { error: err.message, chain });
    return null;
  }
}

// ==================== PUBLIC ENDPOINTS ====================

// Health check
app.get('/', (req, res) => {
  res.jsonResponse(true, {
    service: 'Crypto Wallet Analytics API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    supportedChains: ['EVM', 'Solana', 'Tron'],
    rate: 40
  });
});

// GET /api/rates
app.get('/api/rates', (req, res) => {
  res.jsonResponse(true, { rate: 40 });
});

// POST /api/wallet/connect
app.post('/api/wallet/connect', (req, res) => {
  try {
    const { address, chain, walletType } = req.body;
    
    if (!address || !chain) {
      return res.jsonResponse(false, null, 'Address and chain are required', 400);
    }
    
    // Validate address format based on chain
    let isValid = false;
    const chainLower = chain.toLowerCase();
    
    try {
      if (['evm', 'eth', 'ethereum', 'bnb', 'bsc', 'matic', 'polygon'].includes(chainLower)) {
        isValid = ethers.isAddress(address);
      } else if (['solana', 'sol'].includes(chainLower)) {
        new PublicKey(address); // Will throw if invalid
        isValid = true;
      } else if (['tron', 'trx'].includes(chainLower)) {
        isValid = tronWeb.isAddress(address);
      }
    } catch (error) {
      return res.jsonResponse(false, null, `Invalid ${chain} address format`, 400);
    }
    
    if (!isValid) {
      return res.jsonResponse(false, null, `Invalid ${chain} address`, 400);
    }
    
    const wallets = loadWallets();
    const existingIndex = wallets.findIndex(w => 
      w.address.toLowerCase() === address.toLowerCase() && w.chain === chainLower
    );
    
    const walletData = {
      id: uuidv4(),
      address: address.toLowerCase(),
      chain: chainLower,
      walletType: walletType || 'unknown',
      connectedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      userAgent: req.get('user-agent'),
      ip: req.ip
    };
    
    if (existingIndex !== -1) {
      // Update existing wallet
      wallets[existingIndex] = {
        ...wallets[existingIndex],
        ...walletData,
        id: wallets[existingIndex].id // Keep existing ID
      };
    } else {
      wallets.push(walletData);
    }
    
    saveWallets(wallets);
    logger.wallet('connected', address, chain, { walletType });
    
    res.jsonResponse(true, {
      wallet: {
        id: walletData.id,
        address: walletData.address,
        chain: walletData.chain,
        connectedAt: walletData.connectedAt
      },
      message: 'Wallet connected successfully'
    });
    
  } catch (error) {
    logger.error('Wallet connect failed', { error: error.message });
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// GET /api/wallet/:address/assets
app.get('/api/wallet/:address/assets', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain } = req.query;
    
    if (!address) {
      return res.jsonResponse(false, null, 'Wallet address is required', 400);
    }
    
    let balances = {};
    
    if (!chain) {
      // Get balances for all chains
      const [evmResult, solanaResult, tronResult] = await Promise.allSettled([
        getEvmBalances(address),
        getSolanaBalances(address),
        getTronBalances(address)
      ]);
      
      if (evmResult.status === 'fulfilled') balances.evm = evmResult.value;
      if (solanaResult.status === 'fulfilled') balances.solana = solanaResult.value;
      if (tronResult.status === 'fulfilled') balances.tron = tronResult.value;
      
    } else {
      const chainLower = chain.toLowerCase();
      
      if (['evm', 'eth', 'ethereum', 'bnb', 'bsc', 'matic', 'polygon'].includes(chainLower)) {
        balances = await getEvmBalances(address);
      } else if (['solana', 'sol'].includes(chainLower)) {
        balances = await getSolanaBalances(address);
      } else if (['tron', 'trx'].includes(chainLower)) {
        balances = await getTronBalances(address);
      } else {
        return res.jsonResponse(false, null, 'Unsupported chain', 400);
      }
    }
    
    logger.wallet('assets_queried', address, chain || 'all');
    res.jsonResponse(true, { address, balances });
    
  } catch (error) {
    logger.error('Wallet assets query failed', { error: error.message, address });
    res.jsonResponse(false, null, 'Failed to fetch wallet assets', 500);
  }
});

// GET /api/payment/details
app.get('/api/payment/details', (req, res) => {
  try {
    const { chain, usdAmount } = req.query;
    
    if (!chain) {
      return res.jsonResponse(false, null, 'Chain parameter is required', 400);
    }
    
    if (!usdAmount || isNaN(usdAmount) || parseFloat(usdAmount) <= 0) {
      return res.jsonResponse(false, null, 'Valid USD amount greater than 0 is required', 400);
    }
    
    const receivingAddress = getReceivingAddress(chain);
    if (!receivingAddress) {
      return res.jsonResponse(false, null, 'Unsupported chain. Use: evm, solana, or tron', 400);
    }
    
    const usdAmountNum = parseFloat(usdAmount);
    const usdtAmount = calculateUSDTAmount(usdAmountNum);
    
    if (usdtAmount <= 0) {
      return res.jsonResponse(false, null, 'Invalid USD amount for calculation', 400);
    }
    
    const transactionId = uuidv4();
    const qrCode = getQRCodeBase64(chain);
    
    // Create pending purchase record
    const purchases = loadPurchases();
    const purchase = {
      id: transactionId,
      chain: chain.toLowerCase(),
      usdAmount: usdAmountNum,
      usdtAmount,
      receivingAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };
    
    purchases.push(purchase);
    savePurchases(purchases);
    
    logger.purchase('initiated', transactionId, usdAmountNum, chain);
    
    res.jsonResponse(true, {
      transactionId,
      chain: chain.toLowerCase(),
      receivingAddress,
      usdtAmount,
      usdAmount: usdAmountNum,
      qrCode,
      expiresAt: purchase.expiresAt,
      rate: 40
    });
    
  } catch (error) {
    logger.error('Payment details failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to generate payment details', 500);
  }
});

// POST /api/payment/verify
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { transactionId, transactionHash, chain } = req.body;
    
    if (!transactionId || !transactionHash || !chain) {
      return res.jsonResponse(false, null, 'transactionId, transactionHash, and chain are required', 400);
    }
    
    const purchases = loadPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === transactionId);
    
    if (purchaseIndex === -1) {
      return res.jsonResponse(false, null, 'Transaction not found', 404);
    }
    
    const purchase = purchases[purchaseIndex];
    
    // Check if already verified
    if (purchase.status === 'completed') {
      return res.jsonResponse(true, {
        verified: true,
        message: 'Payment already verified',
        transactionId,
        usdtAmount: purchase.usdtAmount
      });
    }
    
    // Check if expired
    if (new Date(purchase.expiresAt) < new Date()) {
      purchase.status = 'expired';
      savePurchases(purchases);
      return res.jsonResponse(false, null, 'Payment verification window expired', 400);
    }
    
    let isVerified = false;
    let verificationDetails = {};
    const chainLower = chain.toLowerCase();
    
    try {
      if (['evm', 'eth', 'ethereum', 'bnb', 'bsc', 'matic', 'polygon'].includes(chainLower)) {
        // EVM chain verification
        const provider = evmProviders.ethereum; // Use Ethereum provider for now
        const tx = await provider.getTransaction(transactionHash);
        
        if (tx && tx.to) {
          const txTo = tx.to.toLowerCase();
          const expectedTo = purchase.receivingAddress.toLowerCase();
          
          if (txTo === expectedTo) {
            const txValue = ethers.formatEther(tx.value);
            const requiredAmount = purchase.usdAmount;
            
            if (parseFloat(txValue) >= requiredAmount) {
              isVerified = true;
              verificationDetails = {
                from: tx.from,
                to: tx.to,
                value: txValue,
                blockNumber: tx.blockNumber,
                gasPrice: tx.gasPrice?.toString(),
                timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null
              };
            }
          }
        }
        
      } else if (['solana', 'sol'].includes(chainLower)) {
        // Solana verification
        const tx = await solanaConnection.getTransaction(transactionHash, {
          maxSupportedTransactionVersion: 0
        });
        
        if (tx && tx.meta && tx.transaction) {
          // Check if transaction includes our receiving address
          const accounts = tx.transaction.message.accountKeys;
          const ownerPubkey = new PublicKey(SOLANA_RECEIVE_ADDRESS);
          
          const sentToOwner = accounts.some(account => account.equals(ownerPubkey));
          if (sentToOwner && tx.meta.err === null) {
            isVerified = true;
            verificationDetails = {
              slot: tx.slot,
              blockTime: tx.blockTime,
              fee: tx.meta.fee / LAMPORTS_PER_SOL,
              success: true
            };
          }
        }
        
      } else if (['tron', 'trx'].includes(chainLower)) {
        // Tron verification
        const tx = await tronWeb.trx.getTransaction(transactionHash);
        
        if (tx && tx.raw_data && tx.raw_data.contract) {
          const contract = tx.raw_data.contract[0];
          
          if (contract.type === 'TransferContract') {
            const toAddress = tronWeb.address.fromHex(contract.parameter.value.to_address);
            const fromAddress = tronWeb.address.fromHex(contract.parameter.value.owner_address);
            const amount = contract.parameter.value.amount / 1_000_000; // TRX has 6 decimal places
            
            if (toAddress === TRON_RECEIVE_ADDRESS && amount >= purchase.usdAmount) {
              isVerified = true;
              verificationDetails = {
                from: fromAddress,
                to: toAddress,
                amount,
                timestamp: tx.raw_data.timestamp,
                success: true
              };
            }
          }
        }
      }
    } catch (verifyError) {
      logger.error('Transaction verification error', {
        error: verifyError.message,
        transactionHash,
        chain
      });
    }
    
    if (isVerified) {
      // Update purchase status
      purchase.status = 'completed';
      purchase.verifiedAt = new Date().toISOString();
      purchase.transactionHash = transactionHash;
      purchase.verificationDetails = verificationDetails;
      
      // Record transaction
      const transactions = loadTransactions();
      transactions.push({
        id: uuidv4(),
        purchaseId: transactionId,
        transactionHash,
        chain: chainLower,
        amountUSD: purchase.usdAmount,
        amountUSDT: purchase.usdtAmount,
        fromAddress: verificationDetails.from,
        toAddress: verificationDetails.to,
        timestamp: new Date().toISOString(),
        status: 'completed'
      });
      
      savePurchases(purchases);
      saveTransactions(transactions);
      
      logger.purchase('verified', transactionId, purchase.usdAmount, chain);
      logger.transaction('verified', transactionHash, chain);
      
      return res.jsonResponse(true, {
        verified: true,
        transactionId,
        usdtAmount: purchase.usdtAmount,
        usdAmount: purchase.usdAmount,
        chain,
        completedAt: purchase.verifiedAt
      });
    } else {
      // Mark as failed after multiple attempts
      purchase.verificationAttempts = (purchase.verificationAttempts || 0) + 1;
      
      if (purchase.verificationAttempts >= 3) {
        purchase.status = 'failed';
      }
      
      savePurchases(purchases);
      
      return res.jsonResponse(false, null, 'Transaction verification failed. Please check transaction details.', 400);
    }
    
  } catch (error) {
    logger.error('Payment verification failed', { error: error.message });
    res.jsonResponse(false, null, 'Payment verification failed', 500);
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
      mimeType: qrCode.startsWith('data:image/png') ? 'image/png' : 'image/svg+xml'
    });
    
  } catch (error) {
    logger.error('QR endpoint failed', { error: error.message, chain });
    res.jsonResponse(false, null, 'Failed to generate QR code', 500);
  }
});

// ==================== ADMIN ENDPOINTS ====================

// POST /api/usdt/purchase
app.post('/api/usdt/purchase', adminMiddleware, (req, res) => {
  try {
    const { walletAddress, chain, usdAmount, customerInfo } = req.body;
    
    if (!walletAddress || !chain || !usdAmount) {
      return res.jsonResponse(false, null, 'walletAddress, chain, and usdAmount are required', 400);
    }
    
    const usdAmountNum = parseFloat(usdAmount);
    if (isNaN(usdAmountNum) || usdAmountNum <= 0) {
      return res.jsonResponse(false, null, 'Valid USD amount greater than 0 is required', 400);
    }
    
    const receivingAddress = getReceivingAddress(chain);
    if (!receivingAddress) {
      return res.jsonResponse(false, null, 'Unsupported chain', 400);
    }
    
    const usdtAmount = calculateUSDTAmount(usdAmountNum);
    if (usdtAmount <= 0) {
      return res.jsonResponse(false, null, 'Invalid USD amount for calculation', 400);
    }
    
    const transactionId = uuidv4();
    
    const purchases = loadPurchases();
    const purchase = {
      id: transactionId,
      walletAddress,
      chain: chain.toLowerCase(),
      usdAmount: usdAmountNum,
      usdtAmount,
      receivingAddress,
      status: 'pending',
      customerInfo: customerInfo || {},
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      initiatedBy: 'admin'
    };
    
    purchases.push(purchase);
    savePurchases(purchases);
    
    logger.admin('purchase_created', 'admin', { transactionId, walletAddress, chain, usdAmount: usdAmountNum });
    
    res.jsonResponse(true, {
      purchase: {
        id: purchase.id,
        chain: purchase.chain,
        usdAmount: purchase.usdAmount,
        usdtAmount: purchase.usdtAmount,
        receivingAddress: purchase.receivingAddress,
        status: purchase.status,
        expiresAt: purchase.expiresAt
      },
      message: 'Purchase created successfully'
    });
    
  } catch (error) {
    logger.error('Admin purchase creation failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to create purchase', 500);
  }
});

// GET /api/admin/purchases
app.get('/api/admin/purchases', adminMiddleware, (req, res) => {
  try {
    const { status, chain, limit = 50, page = 1 } = req.query;
    const purchases = loadPurchases();
    
    let filtered = [...purchases];
    
    if (status) {
      filtered = filtered.filter(p => p.status === status);
    }
    
    if (chain) {
      filtered = filtered.filter(p => p.chain === chain.toLowerCase());
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginated = filtered.slice(startIndex, endIndex);
    const total = filtered.length;
    
    logger.admin('purchases_viewed', 'admin', { page: pageNum, limit: limitNum, total });
    
    res.jsonResponse(true, {
      purchases: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: endIndex < total,
        hasPrev: startIndex > 0
      }
    });
    
  } catch (error) {
    logger.error('Admin purchases fetch failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to fetch purchases', 500);
  }
});

// POST /api/admin/mark-purchase-completed
app.post('/api/admin/mark-purchase-completed', adminMiddleware, (req, res) => {
  try {
    const { purchaseId, transactionHash, notes } = req.body;
    
    if (!purchaseId) {
      return res.jsonResponse(false, null, 'purchaseId is required', 400);
    }
    
    const purchases = loadPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    
    if (purchaseIndex === -1) {
      return res.jsonResponse(false, null, 'Purchase not found', 404);
    }
    
    const purchase = purchases[purchaseIndex];
    
    // Update purchase
    purchase.status = 'completed';
    purchase.verifiedAt = new Date().toISOString();
    purchase.verifiedBy = 'admin';
    purchase.adminNotes = notes;
    
    if (transactionHash) {
      purchase.transactionHash = transactionHash;
    }
    
    // Record transaction
    if (transactionHash) {
      const transactions = loadTransactions();
      transactions.push({
        id: uuidv4(),
        purchaseId,
        transactionHash,
        chain: purchase.chain,
        amountUSD: purchase.usdAmount,
        amountUSDT: purchase.usdtAmount,
        timestamp: new Date().toISOString(),
        status: 'completed',
        verifiedBy: 'admin',
        notes
      });
      saveTransactions(transactions);
    }
    
    savePurchases(purchases);
    
    logger.admin('purchase_completed', 'admin', { purchaseId, transactionHash });
    logger.purchase('admin_completed', purchaseId, purchase.usdAmount, purchase.chain);
    
    res.jsonResponse(true, {
      purchase: {
        id: purchase.id,
        status: purchase.status,
        verifiedAt: purchase.verifiedAt,
        usdtAmount: purchase.usdtAmount
      },
      message: 'Purchase marked as completed'
    });
    
  } catch (error) {
    logger.error('Admin mark purchase completed failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to update purchase', 500);
  }
});

// GET /api/admin/transactions
app.get('/api/admin/transactions', adminMiddleware, (req, res) => {
  try {
    const { type, chain, limit = 50, page = 1 } = req.query;
    const transactions = loadTransactions();
    
    let filtered = [...transactions];
    
    if (type) {
      filtered = filtered.filter(t => t.type === type);
    }
    
    if (chain) {
      filtered = filtered.filter(t => t.chain === chain.toLowerCase());
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginated = filtered.slice(startIndex, endIndex);
    const total = filtered.length;
    
    logger.admin('transactions_viewed', 'admin', { page: pageNum, limit: limitNum, total });
    
    res.jsonResponse(true, {
      transactions: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: endIndex < total,
        hasPrev: startIndex > 0
      }
    });
    
  } catch (error) {
    logger.error('Admin transactions fetch failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to fetch transactions', 500);
  }
});

// POST /api/admin/prepare-transaction
app.post('/api/admin/prepare-transaction', adminMiddleware, (req, res) => {
  try {
    const { toAddress, chain, amountUSDT, notes } = req.body;
    
    if (!toAddress || !chain || !amountUSDT) {
      return res.jsonResponse(false, null, 'toAddress, chain, and amountUSDT are required', 400);
    }
    
    const amountNum = parseFloat(amountUSDT);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.jsonResponse(false, null, 'Valid USDT amount greater than 0 is required', 400);
    }
    
    const transactionId = uuidv4();
    
    logger.admin('transaction_prepared', 'admin', { transactionId, toAddress, chain, amountUSDT: amountNum });
    
    res.jsonResponse(true, {
      transactionId,
      toAddress,
      chain: chain.toLowerCase(),
      amountUSDT: amountNum,
      notes: notes || '',
      preparedAt: new Date().toISOString(),
      message: 'Transaction prepared successfully'
    });
    
  } catch (error) {
    logger.error('Admin prepare transaction failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to prepare transaction', 500);
  }
});

// POST /api/admin/record-transaction
app.post('/api/admin/record-transaction', adminMiddleware, (req, res) => {
  try {
    const { transactionId, transactionHash, chain, amountUSDT, toAddress, fromAddress, notes } = req.body;
    
    if (!transactionHash || !chain || !amountUSDT) {
      return res.jsonResponse(false, null, 'transactionHash, chain, and amountUSDT are required', 400);
    }
    
    const amountNum = parseFloat(amountUSDT);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.jsonResponse(false, null, 'Valid USDT amount greater than 0 is required', 400);
    }
    
    const transactions = loadTransactions();
    const transaction = {
      id: transactionId || uuidv4(),
      transactionHash,
      chain: chain.toLowerCase(),
      amountUSDT: amountNum,
      toAddress,
      fromAddress: fromAddress || 'system',
      notes: notes || {},
      timestamp: new Date().toISOString(),
      type: 'transfer',
      status: 'completed',
      recordedBy: 'admin'
    };
    
    transactions.push(transaction);
    saveTransactions(transactions);
    
    logger.admin('transaction_recorded', 'admin', { transactionId: transaction.id, transactionHash, chain, amountUSDT: amountNum });
    logger.transaction('recorded', transactionHash, chain);
    
    res.jsonResponse(true, {
      transaction: {
        id: transaction.id,
        transactionHash: transaction.transactionHash,
        chain: transaction.chain,
        amountUSDT: transaction.amountUSDT,
        timestamp: transaction.timestamp,
        status: transaction.status
      },
      message: 'Transaction recorded successfully'
    });
    
  } catch (error) {
    logger.error('Admin record transaction failed', { error: error.message });
    res.jsonResponse(false, null, 'Failed to record transaction', 500);
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { method: req.method, path: req.originalUrl });
  res.jsonResponse(false, null, 'Endpoint not found', 404);
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl
  });
  
  res.jsonResponse(false, null, 'Internal server error', 500);
});

// Export for Vercel
export default app;
