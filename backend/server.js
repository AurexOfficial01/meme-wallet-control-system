import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { ethers } from 'ethers';
import * as web3 from '@solana/web3.js';
import TronWeb from 'tronweb';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;

const wallets = new Map();
const pendingTransactions = new Map();
const completedTransactions = new Map();
const purchaseRecords = new Map();

const evmProvider = new ethers.JsonRpcProvider(process.env.EVM_RPC_URL || 'https://eth.llamarpc.com');
const solanaConnection = new web3.Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

let tronWeb;
try {
    tronWeb = new TronWeb({
        fullHost: process.env.TRON_FULL_NODE || 'https://api.trongrid.io',
        solidityNode: process.env.TRON_SOLIDITY_NODE || 'https://api.trongrid.io',
        eventServer: process.env.TRON_EVENT_SERVER || 'https://api.trongrid.io'
    });
} catch (error) {
    console.error('TronWeb initialization error:', error);
}

const EVM_USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const SOLANA_USDT_ADDRESS = new web3.PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const TRON_USDT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

async function getEVMETHBalance(address) {
    try {
        const balance = await evmProvider.getBalance(address);
        return ethers.formatEther(balance);
    } catch (error) {
        console.error('EVM ETH balance error:', error);
        return '0';
    }
}

async function getEVMUSDTBalance(address) {
    try {
        const contract = new ethers.Contract(EVM_USDT_ADDRESS, USDT_ABI, evmProvider);
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();
        return ethers.formatUnits(balance, decimals);
    } catch (error) {
        console.error('EVM USDT balance error:', error);
        return '0';
    }
}

async function getSolanaSOLBalance(address) {
    try {
        const pubkey = new web3.PublicKey(address);
        const balance = await solanaConnection.getBalance(pubkey);
        return (balance / web3.LAMPORTS_PER_SOL).toString();
    } catch (error) {
        console.error('Solana SOL balance error:', error);
        return '0';
    }
}

async function getSolanaUSDTBalance(address) {
    try {
        const pubkey = new web3.PublicKey(address);
        const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(pubkey, { mint: SOLANA_USDT_ADDRESS });
        if (tokenAccounts.value.length === 0) return '0';
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        return balance.toString();
    } catch (error) {
        console.error('Solana USDT balance error:', error);
        return '0';
    }
}

async function getTronTRXBalance(address) {
    try {
        if (!tronWeb) return '0';
        const balance = await tronWeb.trx.getBalance(address);
        return (balance / 1000000).toString();
    } catch (error) {
        console.error('Tron TRX balance error:', error);
        return '0';
    }
}

async function getTronUSDTBalance(address) {
    try {
        if (!tronWeb) return '0';
        const contract = await tronWeb.contract().at(TRON_USDT_ADDRESS);
        const result = await contract.balanceOf(address).call();
        return (result / 1000000).toString();
    } catch (error) {
        console.error('Tron USDT balance error:', error);
        return '0';
    }
}

app.post('/api/wallet/connect', (req, res) => {
    try {
        const { address, chain, walletName, sourcePage } = req.body;
        
        if (!address || !chain || !walletName || !sourcePage) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: address, chain, walletName, sourcePage' 
            });
        }
        
        const validChains = ['evm', 'solana', 'tron'];
        const validPages = ['homepage', 'buy-usdt'];
        
        if (!validChains.includes(chain)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid chain. Must be: evm, solana, or tron' 
            });
        }
        
        if (!validPages.includes(sourcePage)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid source page. Must be: homepage or buy-usdt' 
            });
        }
        
        const walletKey = address.toLowerCase();
        const now = new Date().toISOString();
        
        const walletData = {
            address: walletKey,
            chain,
            walletName,
            sourcePage,
            firstSeen: wallets.has(walletKey) ? wallets.get(walletKey).firstSeen : now,
            lastSeen: now
        };
        
        wallets.set(walletKey, walletData);
        
        res.json({
            success: true,
            message: 'Wallet connected successfully',
            wallet: walletData
        });
    } catch (error) {
        console.error('Wallet connect error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.get('/api/wallets', (req, res) => {
    try {
        const { chain, page, walletAddress } = req.query;
        
        let filteredWallets = Array.from(wallets.values());
        
        if (chain) {
            filteredWallets = filteredWallets.filter(wallet => wallet.chain === chain);
        }
        
        if (page) {
            filteredWallets = filteredWallets.filter(wallet => wallet.sourcePage === page);
        }
        
        if (walletAddress) {
            const searchAddress = walletAddress.toLowerCase();
            filteredWallets = filteredWallets.filter(wallet => 
                wallet.address.includes(searchAddress)
            );
        }
        
        filteredWallets.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
        
        res.json({
            success: true,
            count: filteredWallets.length,
            wallets: filteredWallets
        });
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.get('/api/wallet/:address/assets', async (req, res) => {
    try {
        const address = req.params.address.toLowerCase();
        const wallet = wallets.get(address);
        
        if (!wallet) {
            return res.status(404).json({ 
                success: false, 
                error: 'Wallet not found' 
            });
        }
        
        let assets = {};
        
        switch (wallet.chain) {
            case 'evm':
                assets = {
                    eth: await getEVMETHBalance(wallet.address),
                    usdt: await getEVMUSDTBalance(wallet.address)
                };
                break;
            case 'solana':
                assets = {
                    sol: await getSolanaSOLBalance(wallet.address),
                    usdt: await getSolanaUSDTBalance(wallet.address)
                };
                break;
            case 'tron':
                assets = {
                    trx: await getTronTRXBalance(wallet.address),
                    usdt: await getTronUSDTBalance(wallet.address)
                };
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Unsupported chain' 
                });
        }
        
        res.json({
            success: true,
            address: wallet.address,
            chain: wallet.chain,
            assets
        });
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.post('/api/admin/mark-purchase-completed', (req, res) => {
    try {
        const { purchaseId, transactionHash } = req.body;

        if (!purchaseId || !transactionHash) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: purchaseId, transactionHash'
            });
        }

        const purchase = purchaseRecords.get(purchaseId);
        if (!purchase) {
            return res.status(404).json({
                success: false,
                error: 'Purchase record not found'
            });
        }

        if (purchase.status === 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Purchase already completed'
            });
        }

        purchase.status = 'completed';
        purchase.transactionHash = transactionHash;
        purchase.completedAt = new Date().toISOString();

        purchaseRecords.set(purchaseId, purchase);

        res.json({
            success: true,
            message: 'Purchase marked as completed',
            purchase
        });

    } catch (error) {
        console.error('Mark purchase completed error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.post('/api/admin/prepare-transaction', (req, res) => {
    try {
        const { fromAddress, toAddress, chain, asset, amount } = req.body;
        
        if (!fromAddress || !toAddress || !chain || !asset || !amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: fromAddress, toAddress, chain, asset, amount' 
            });
        }
        
        const validChains = ['evm', 'solana', 'tron'];
        if (!validChains.includes(chain)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid chain' 
            });
        }
        
        const fromWallet = wallets.get(fromAddress.toLowerCase());
        if (!fromWallet || fromWallet.chain !== chain) {
            return res.status(400).json({ 
                success: false, 
                error: 'From wallet not found or chain mismatch' 
            });
        }
        
        const validAssets = {
            evm: ['ETH', 'USDT'],
            solana: ['SOL', 'USDT'],
            tron: ['TRX', 'USDT']
        };
        
        if (!validAssets[chain]?.includes(asset)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid asset for ${chain} chain. Valid assets: ${validAssets[chain]?.join(', ')}` 
            });
        }
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid amount. Must be a positive number' 
            });
        }
        
        const transactionId = uuidv4();
        const transactionData = {
            id: transactionId,
            fromAddress: fromAddress.toLowerCase(),
            toAddress: toAddress.toLowerCase(),
            chain,
            asset,
            amount: amountNum.toString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            confirmed: false,
            signedData: null,
            txHash: null,
            completedAt: null
        };
        
        pendingTransactions.set(transactionId, transactionData);
        
        res.json({
            success: true,
            message: 'Transaction prepared successfully',
            transactionId,
            transaction: transactionData
        });
    } catch (error) {
        console.error('Prepare transaction error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.post('/api/admin/record-transaction', (req, res) => {
    try {
        const { transactionId, txHash, signedData } = req.body;
        
        if (!transactionId || !txHash || !signedData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: transactionId, txHash, signedData' 
            });
        }
        
        const transaction = pendingTransactions.get(transactionId);
        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                error: 'Transaction not found' 
            });
        }
        
        if (transaction.confirmed) {
            return res.status(400).json({ 
                success: false, 
                error: 'Transaction already confirmed' 
            });
        }
        
        transaction.status = 'completed';
        transaction.confirmed = true;
        transaction.signedData = signedData;
        transaction.txHash = txHash;
        transaction.completedAt = new Date().toISOString();
        
        pendingTransactions.delete(transactionId);
        completedTransactions.set(transactionId, transaction);
        
        res.json({
            success: true,
            message: 'Transaction recorded successfully',
            transaction
        });
    } catch (error) {
        console.error('Record transaction error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.get('/api/admin/transactions', (req, res) => {
    try {
        const { status, chain, walletAddress } = req.query;
        
        const allTransactions = [
            ...Array.from(pendingTransactions.values()),
            ...Array.from(completedTransactions.values())
        ];
        
        let filteredTransactions = allTransactions;
        
        if (status) {
            filteredTransactions = filteredTransactions.filter(tx => tx.status === status);
        }
        
        if (chain) {
            filteredTransactions = filteredTransactions.filter(tx => tx.chain === chain);
        }
        
        if (walletAddress) {
            const searchAddress = walletAddress.toLowerCase();
            filteredTransactions = filteredTransactions.filter(tx => 
                tx.fromAddress.includes(searchAddress) || 
                tx.toAddress.includes(searchAddress)
            );
        }
        
        filteredTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const total = filteredTransactions.length;
        const pending = filteredTransactions.filter(tx => tx.status === 'pending').length;
        const completed = filteredTransactions.filter(tx => tx.status === 'completed').length;
        const totalAmount = filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        
        res.json({
            success: true,
            transactions: filteredTransactions,
            stats: {
                total,
                pending,
                completed,
                totalAmount: parseFloat(totalAmount.toFixed(6))
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.post('/api/usdt/purchase', (req, res) => {
    try {
        const { walletAddress, chain, amount, paymentMethod, transactionHash } = req.body;
        
        if (!walletAddress || !chain || !amount || !paymentMethod) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: walletAddress, chain, amount, paymentMethod' 
            });
        }
        
        const validChains = ['evm', 'solana', 'tron'];
        if (!validChains.includes(chain)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid chain' 
            });
        }
        
        const usdAmount = parseFloat(amount);
        if (isNaN(usdAmount) || usdAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid amount. Must be a positive number' 
            });
        }
        
        let usdtAmount;
        if (usdAmount === 20) {
            usdtAmount = 1000;
        } else if (usdAmount === 50) {
            usdtAmount = 2500;
        } else if (usdAmount === 100) {
            usdtAmount = 5000;
        } else if (usdAmount > 100) {
            usdtAmount = usdAmount * 40;
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid purchase amount. Valid amounts: 20, 50, 100, or >100' 
            });
        }
        
        const purchaseId = uuidv4();
        const rate = usdtAmount / usdAmount;
        const purchaseData = {
            purchaseId,
            walletAddress: walletAddress.toLowerCase(),
            chain,
            usdAmount: usdAmount.toString(),
            usdtAmount: usdtAmount.toString(),
            rate: rate.toFixed(2),
            paymentMethod,
            transactionHash: transactionHash || null,
            timestamp: new Date().toISOString(),
            status: transactionHash ? 'completed' : 'pending'
        };
        
        purchaseRecords.set(purchaseId, purchaseData);
        
        res.json({
            success: true,
            message: 'Purchase recorded successfully',
            purchase: purchaseData
        });
    } catch (error) {
        console.error('USDT purchase error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.get('/api/admin/purchases', (req, res) => {
    try {
        const { status, chain, walletAddress } = req.query;
        
        let filteredPurchases = Array.from(purchaseRecords.values());
        
        if (status) {
            filteredPurchases = filteredPurchases.filter(p => p.status === status);
        }
        
        if (chain) {
            filteredPurchases = filteredPurchases.filter(p => p.chain === chain);
        }
        
        if (walletAddress) {
            const searchAddress = walletAddress.toLowerCase();
            filteredPurchases = filteredPurchases.filter(p => 
                p.walletAddress.toLowerCase().includes(searchAddress)
            );
        }
        
        filteredPurchases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const totalPurchases = filteredPurchases.length;
        const pendingPurchases = filteredPurchases.filter(p => p.status === 'pending').length;
        const completedPurchases = filteredPurchases.filter(p => p.status === 'completed').length;
        const totalUSD = filteredPurchases.reduce((sum, p) => sum + parseFloat(p.usdAmount || 0), 0);
        const totalUSDT = filteredPurchases.reduce((sum, p) => sum + parseFloat(p.usdtAmount || 0), 0);
        
        res.json({
            success: true,
            purchases: filteredPurchases,
            stats: {
                total: totalPurchases,
                pending: pendingPurchases,
                completed: completedPurchases,
                totalUSD: parseFloat(totalUSD.toFixed(2)),
                totalUSDT: parseFloat(totalUSDT.toFixed(2))
            }
        });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase records'
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        wallets: wallets.size,
        pendingTransactions: pendingTransactions.size,
        completedTransactions: completedTransactions.size,
        purchases: purchaseRecords.size
    });
});

app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

app.use((error, req, res, next) => {
    console.error('Unhandled server error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
