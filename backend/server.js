import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fsExtra from 'fs-extra';
import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import TronWeb from 'tronweb';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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
  saveTransactions,
  ensureDataFiles 
} from './utils/storage.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Owner receiving addresses
const EVM_RECEIVE_ADDRESS = "0xdb77c99f57d527b25a02760bd8dce833ba48dc46";
const SOLANA_RECEIVE_ADDRESS = "5zPETBCsny3sHcoHHQVybojxq5Qi2pGYUMJMmkA5KU8b";
const TRON_RECEIVE_ADDRESS = "TAmhzoBrfV3Y5GmmSp4Ry3C56Nf2rVEdrr";

// Initialize providers
const evmProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  solidityNode: 'https://api.trongrid.io',
  eventServer: 'https://api.trongrid.io'
});

// Ensure data directory exists
ensureDataFiles();

// CORS configuration
const allowedOrigins = [
  'https://meme-wallet-control-system.vercel.app',
  'https://meme-wallet-control-system-opi5.vercel.app',
  'https://meme-wallet-control-system-hx1r.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware for consistent response format
app.use((req, res, next) => {
  res.jsonResponse = (success, data = null, error = null, statusCode = 200) => {
    return res.status(statusCode).json({
      success,
      data,
      error
    });
  };
  next();
});

// Admin middleware
const adminMiddleware = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.jsonResponse(false, null, 'Unauthorized: Admin access required', 401);
  }
  next();
};

// QR code generation function (for development - in production, pre-generate QR codes)
function getQRCodeBase64(chain) {
  try {
    const qrPath = path.join(__dirname, 'qr', `${chain.toLowerCase()}.png`);
    if (fs.existsSync(qrPath)) {
      const qrImage = fs.readFileSync(qrPath);
      return qrImage.toString('base64');
    } else {
      // Create placeholder QR for development
      const placeholderQR = `QR for ${chain} address`;
      return Buffer.from(placeholderQR).toString('base64');
    }
  } catch (error) {
    logger.error(`QR generation error: ${error.message}`);
    return null;
  }
}

// Calculate USDT amount based on USD
function calculateUSDTAmount(usdAmount) {
  const amount = parseFloat(usdAmount);
  
  if (amount === 20) return 1000;
  if (amount === 50) return 2500;
  if (amount === 100) return 5000;
  
  // For amounts > 100, use usdAmount × 40
  return Math.floor(amount * 40);
}

// Get receiving address by chain
function getReceivingAddress(chain) {
  switch (chain.toLowerCase()) {
    case 'evm':
    case 'eth':
    case 'bnb':
    case 'polygon':
      return EVM_RECEIVE_ADDRESS;
    case 'solana':
    case 'sol':
      return SOLANA_RECEIVE_ADDRESS;
    case 'tron':
    case 'trx':
      return TRON_RECEIVE_ADDRESS;
    default:
      return null;
  }
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/', (req, res) => {
  res.jsonResponse(true, {
    message: 'Crypto Wallet Analytics API',
    version: '1.0.0',
    status: 'operational'
  });
});

// GET /api/payment/details
app.get('/api/payment/details', (req, res) => {
  try {
    const { chain, usdAmount } = req.query;
    
    if (!chain) {
      return res.jsonResponse(false, null, 'Chain parameter is required', 400);
    }
    
    if (!usdAmount || isNaN(usdAmount)) {
      return res.jsonResponse(false, null, 'Valid USD amount is required', 400);
    }
    
    const receivingAddress = getReceivingAddress(chain);
    if (!receivingAddress) {
      return res.jsonResponse(false, null, 'Invalid chain specified', 400);
    }
    
    const usdtAmount = calculateUSDTAmount(parseFloat(usdAmount));
    const transactionId = uuidv4();
    const qrBase64 = getQRCodeBase64(chain);
    
    // Store purchase as pending
    const purchases = loadPurchases();
    const newPurchase = {
      id: transactionId,
      chain: chain.toLowerCase(),
      usdAmount: parseFloat(usdAmount),
      usdtAmount,
      receivingAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      verified: false
    };
    
    purchases.push(newPurchase);
    savePurchases(purchases);
    
    res.jsonResponse(true, {
      receivingAddress,
      qrCode: qrBase64,
      usdtAmount,
      transactionId,
      chain: chain.toLowerCase()
    });
    
  } catch (error) {
    logger.error(`Payment details error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// POST /api/payment/verify
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { transactionHash, chain, transactionId } = req.body;
    
    if (!transactionHash || !chain || !transactionId) {
      return res.jsonResponse(false, null, 'Missing required parameters', 400);
    }
    
    const purchases = loadPurchases();
    const purchase = purchases.find(p => p.id === transactionId);
    
    if (!purchase) {
      return res.jsonResponse(false, null, 'Transaction not found', 404);
    }
    
    if (purchase.status === 'completed') {
      return res.jsonResponse(true, { verified: true, message: 'Already verified' });
    }
    
    let isVerified = false;
    let verificationDetails = {};
    
    switch (chain.toLowerCase()) {
      case 'evm':
      case 'eth':
      case 'bnb':
      case 'polygon':
        // Verify EVM transaction
        try {
          const tx = await evmProvider.getTransaction(transactionHash);
          if (tx && tx.to && tx.to.toLowerCase() === EVM_RECEIVE_ADDRESS.toLowerCase()) {
            const value = ethers.formatEther(tx.value);
            const requiredAmount = purchase.usdAmount.toString();
            
            if (parseFloat(value) >= parseFloat(requiredAmount)) {
              isVerified = true;
              verificationDetails = {
                from: tx.from,
                to: tx.to,
                value: value,
                gasPrice: tx.gasPrice.toString(),
                timestamp: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          logger.error(`EVM verification error: ${error.message}`);
        }
        break;
        
      case 'solana':
      case 'sol':
        // Verify Solana transaction
        try {
          const tx = await solanaConnection.getTransaction(transactionHash);
          if (tx && tx.transaction && tx.transaction.message) {
            const accounts = tx.transaction.message.accountKeys;
            const instructions = tx.transaction.message.instructions;
            
            // Check if transfer to our address exists
            const hasTransferToOwner = instructions.some(instruction => {
              const programId = accounts[instruction.programIdIndex];
              // Look for system program transfers
              if (programId.equals(new PublicKey('11111111111111111111111111111111'))) {
                // This is a system transfer instruction
                const ownerPubkey = new PublicKey(SOLANA_RECEIVE_ADDRESS);
                return accounts.some(account => account.equals(ownerPubkey));
              }
              return false;
            });
            
            if (hasTransferToOwner) {
              // For simplicity, we assume amount is correct in Solana
              // In production, you'd decode the instruction to check exact amount
              isVerified = true;
              verificationDetails = {
                slot: tx.slot,
                blockTime: tx.blockTime,
                fee: tx.meta?.fee || 0
              };
            }
          }
        } catch (error) {
          logger.error(`Solana verification error: ${error.message}`);
        }
        break;
        
      case 'tron':
      case 'trx':
        // Verify Tron transaction
        try {
          const tx = await tronWeb.trx.getTransaction(transactionHash);
          if (tx && tx.raw_data && tx.raw_data.contract) {
            const contract = tx.raw_data.contract[0];
            if (contract.type === 'TransferContract') {
              const toAddress = tronWeb.address.fromHex(contract.parameter.value.to_address);
              const amount = contract.parameter.value.amount / 1_000_000; // Convert from SUN
              
              if (toAddress === TRON_RECEIVE_ADDRESS && amount >= purchase.usdAmount) {
                isVerified = true;
                verificationDetails = {
                  from: tronWeb.address.fromHex(contract.parameter.value.owner_address),
                  to: toAddress,
                  amount: amount,
                  timestamp: tx.raw_data.timestamp
                };
              }
            }
          }
        } catch (error) {
          logger.error(`Tron verification error: ${error.message}`);
        }
        break;
        
      default:
        return res.jsonResponse(false, null, 'Unsupported chain', 400);
    }
    
    if (isVerified) {
      // Update purchase status
      purchase.status = 'completed';
      purchase.verified = true;
      purchase.verifiedAt = new Date().toISOString();
      purchase.verificationDetails = verificationDetails;
      purchase.transactionHash = transactionHash;
      
      savePurchases(purchases);
      
      // Record transaction
      const transactions = loadTransactions();
      transactions.push({
        id: uuidv4(),
        purchaseId: transactionId,
        transactionHash,
        chain: chain.toLowerCase(),
        amountUSD: purchase.usdAmount,
        amountUSDT: purchase.usdtAmount,
        timestamp: new Date().toISOString(),
        type: 'purchase',
        status: 'completed'
      });
      saveTransactions(transactions);
      
      return res.jsonResponse(true, {
        verified: true,
        purchaseId: transactionId,
        usdtAmount: purchase.usdtAmount,
        message: 'Payment verified successfully'
      });
    } else {
      return res.jsonResponse(false, null, 'Transaction verification failed', 400);
    }
    
  } catch (error) {
    logger.error(`Payment verification error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
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
    
    const wallets = loadWallets();
    
    // Check if wallet already exists
    const existingWalletIndex = wallets.findIndex(w => 
      w.address.toLowerCase() === address.toLowerCase() && w.chain === chain.toLowerCase()
    );
    
    const walletData = {
      address,
      chain: chain.toLowerCase(),
      connectedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    
    if (existingWalletIndex !== -1) {
      // Update existing wallet
      wallets[existingWalletIndex].lastActive = new Date().toISOString();
    } else {
      // Add new wallet
      wallets.push(walletData);
    }
    
    saveWallets(wallets);
    
    res.jsonResponse(true, {
      wallet: walletData,
      message: 'Wallet connected successfully'
    });
    
  } catch (error) {
    logger.error(`Wallet connect error: ${error.message}`);
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
      // Return balances for all chains
      const [evmBalances, solanaBalances, tronBalances] = await Promise.allSettled([
        getEvmBalances(address),
        getSolanaBalances(address),
        getTronBalances(address)
      ]);
      
      balances = {
        evm: evmBalances.status === 'fulfilled' ? evmBalances.value : null,
        solana: solanaBalances.status === 'fulfilled' ? solanaBalances.value : null,
        tron: tronBalances.status === 'fulfilled' ? tronBalances.value : null
      };
    } else {
      // Return balance for specific chain
      switch (chain.toLowerCase()) {
        case 'evm':
        case 'eth':
        case 'bnb':
        case 'polygon':
          balances = await getEvmBalances(address);
          break;
        case 'solana':
        case 'sol':
          balances = await getSolanaBalances(address);
          break;
        case 'tron':
        case 'trx':
          balances = await getTronBalances(address);
          break;
        default:
          return res.jsonResponse(false, null, 'Unsupported chain', 400);
      }
    }
    
    res.jsonResponse(true, { address, balances });
    
  } catch (error) {
    logger.error(`Wallet assets error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// POST /api/usdt/purchase
app.post('/api/usdt/purchase', adminMiddleware, (req, res) => {
  try {
    const { walletAddress, chain, usdAmount, customerInfo } = req.body;
    
    if (!walletAddress || !chain || !usdAmount) {
      return res.jsonResponse(false, null, 'Missing required fields', 400);
    }
    
    const usdtAmount = calculateUSDTAmount(parseFloat(usdAmount));
    const transactionId = uuidv4();
    
    const purchases = loadPurchases();
    const newPurchase = {
      id: transactionId,
      walletAddress,
      chain: chain.toLowerCase(),
      usdAmount: parseFloat(usdAmount),
      usdtAmount,
      status: 'pending',
      customerInfo: customerInfo || {},
      createdAt: new Date().toISOString(),
      initiatedBy: 'admin'
    };
    
    purchases.push(newPurchase);
    savePurchases(purchases);
    
    res.jsonResponse(true, {
      purchase: newPurchase,
      message: 'Purchase initiated successfully'
    });
    
  } catch (error) {
    logger.error(`USDT purchase error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// ==================== ADMIN ENDPOINTS ====================

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
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginated = filtered.slice(startIndex, endIndex);
    
    res.jsonResponse(true, {
      purchases: paginated,
      total: filtered.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filtered.length / limit)
    });
    
  } catch (error) {
    logger.error(`Admin purchases error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// POST /api/admin/mark-purchase-completed
app.post('/api/admin/mark-purchase-completed', adminMiddleware, (req, res) => {
  try {
    const { purchaseId, transactionHash } = req.body;
    
    if (!purchaseId) {
      return res.jsonResponse(false, null, 'Purchase ID is required', 400);
    }
    
    const purchases = loadPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    
    if (purchaseIndex === -1) {
      return res.jsonResponse(false, null, 'Purchase not found', 404);
    }
    
    purchases[purchaseIndex].status = 'completed';
    purchases[purchaseIndex].verified = true;
    purchases[purchaseIndex].verifiedAt = new Date().toISOString();
    purchases[purchaseIndex].verifiedBy = 'admin';
    
    if (transactionHash) {
      purchases[purchaseIndex].transactionHash = transactionHash;
    }
    
    savePurchases(purchases);
    
    // Record transaction
    if (transactionHash) {
      const transactions = loadTransactions();
      transactions.push({
        id: uuidv4(),
        purchaseId,
        transactionHash,
        chain: purchases[purchaseIndex].chain,
        amountUSD: purchases[purchaseIndex].usdAmount,
        amountUSDT: purchases[purchaseIndex].usdtAmount,
        timestamp: new Date().toISOString(),
        type: 'purchase',
        status: 'completed',
        verifiedBy: 'admin'
      });
      saveTransactions(transactions);
    }
    
    res.jsonResponse(true, {
      purchase: purchases[purchaseIndex],
      message: 'Purchase marked as completed'
    });
    
  } catch (error) {
    logger.error(`Mark purchase completed error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
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
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginated = filtered.slice(startIndex, endIndex);
    
    res.jsonResponse(true, {
      transactions: paginated,
      total: filtered.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filtered.length / limit)
    });
    
  } catch (error) {
    logger.error(`Admin transactions error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// POST /api/admin/prepare-transaction
app.post('/api/admin/prepare-transaction', adminMiddleware, (req, res) => {
  try {
    const { toAddress, chain, amountUSDT, notes } = req.body;
    
    if (!toAddress || !chain || !amountUSDT) {
      return res.jsonResponse(false, null, 'Missing required fields', 400);
    }
    
    const transactionId = uuidv4();
    
    res.jsonResponse(true, {
      transactionId,
      toAddress,
      chain: chain.toLowerCase(),
      amountUSDT: parseFloat(amountUSDT),
      notes,
      preparedAt: new Date().toISOString(),
      message: 'Transaction prepared successfully'
    });
    
  } catch (error) {
    logger.error(`Prepare transaction error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// POST /api/admin/record-transaction
app.post('/api/admin/record-transaction', adminMiddleware, (req, res) => {
  try {
    const { transactionId, transactionHash, chain, amountUSDT, toAddress, fromAddress, notes } = req.body;
    
    if (!transactionHash || !chain || !amountUSDT) {
      return res.jsonResponse(false, null, 'Missing required fields', 400);
    }
    
    const transactions = loadTransactions();
    const newTransaction = {
      id: transactionId || uuidv4(),
      transactionHash,
      chain: chain.toLowerCase(),
      amountUSDT: parseFloat(amountUSDT),
      toAddress,
      fromAddress: fromAddress || 'system',
      notes: notes || {},
      timestamp: new Date().toISOString(),
      type: 'transfer',
      status: 'completed',
      recordedBy: 'admin'
    };
    
    transactions.push(newTransaction);
    saveTransactions(transactions);
    
    res.jsonResponse(true, {
      transaction: newTransaction,
      message: 'Transaction recorded successfully'
    });
    
  } catch (error) {
    logger.error(`Record transaction error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// GET /api/qr/:chain
app.get('/api/qr/:chain', (req, res) => {
  try {
    const { chain } = req.params;
    const qrBase64 = getQRCodeBase64(chain);
    
    if (!qrBase64) {
      return res.jsonResponse(false, null, 'QR code not available', 404);
    }
    
    res.jsonResponse(true, {
      chain: chain.toLowerCase(),
      qrCode: qrBase64,
      mimeType: 'image/png'
    });
    
  } catch (error) {
    logger.error(`QR endpoint error: ${error.message}`);
    res.jsonResponse(false, null, 'Internal server error', 500);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.jsonResponse(false, null, 'Internal server error', 500);
});

// 404 handler
app.use('*', (req, res) => {
  res.jsonResponse(false, null, 'Endpoint not found', 404);
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for Vercel
export default app;
