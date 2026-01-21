import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// Ensure data directory exists
export function ensureDataFiles() {
  try {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Create wallets.json if it doesn't exist
    if (!fs.existsSync(WALLETS_FILE)) {
      fs.writeFileSync(WALLETS_FILE, JSON.stringify([], null, 2));
    }

    // Create purchases.json if it doesn't exist
    if (!fs.existsSync(PURCHASES_FILE)) {
      fs.writeFileSync(PURCHASES_FILE, JSON.stringify([], null, 2));
    }

    // Create transactions.json if it doesn't exist
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2));
    }

    console.log('Data files ensured successfully');
  } catch (error) {
    console.error('Error ensuring data files:', error);
  }
}

// Load wallets from JSON file
export function loadWallets() {
  try {
    if (!fs.existsSync(WALLETS_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(WALLETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading wallets:', error);
    return [];
  }
}

// Save wallets to JSON file
export function saveWallets(wallets) {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving wallets:', error);
    return false;
  }
}

// Load purchases from JSON file
export function loadPurchases() {
  try {
    if (!fs.existsSync(PURCHASES_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(PURCHASES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading purchases:', error);
    return [];
  }
}

// Save purchases to JSON file
export function savePurchases(purchases) {
  try {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(purchases, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving purchases:', error);
    return false;
  }
}

// Load transactions from JSON file
export function loadTransactions() {
  try {
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
}

// Save transactions to JSON file
export function saveTransactions(transactions) {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving transactions:', error);
    return false;
  }
}

// Add a new wallet
export function addWallet(walletData) {
  const wallets = loadWallets();
  wallets.push({
    ...walletData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  saveWallets(wallets);
  return walletData;
}

// Add a new purchase
export function addPurchase(purchaseData) {
  const purchases = loadPurchases();
  const newPurchase = {
    ...purchaseData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending'
  };
  purchases.push(newPurchase);
  savePurchases(purchases);
  return newPurchase;
}

// Add a new transaction
export function addTransaction(transactionData) {
  const transactions = loadTransactions();
  const newTransaction = {
    ...transactionData,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  transactions.push(newTransaction);
  saveTransactions(transactions);
  return newTransaction;
}

// Update purchase status
export function updatePurchaseStatus(purchaseId, status, transactionHash = null) {
  const purchases = loadPurchases();
  const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
  
  if (purchaseIndex === -1) {
    return null;
  }
  
  purchases[purchaseIndex].status = status;
  purchases[purchaseIndex].updatedAt = new Date().toISOString();
  
  if (transactionHash) {
    purchases[purchaseIndex].transactionHash = transactionHash;
  }
  
  savePurchases(purchases);
  return purchases[purchaseIndex];
}

// Get wallet by address and chain
export function getWallet(address, chain) {
  const wallets = loadWallets();
  return wallets.find(w => 
    w.address.toLowerCase() === address.toLowerCase() && 
    w.chain === chain.toLowerCase()
  );
}

// Get purchase by ID
export function getPurchase(purchaseId) {
  const purchases = loadPurchases();
  return purchases.find(p => p.id === purchaseId);
}

// Get transactions by purchase ID
export function getTransactionsByPurchase(purchaseId) {
  const transactions = loadTransactions();
  return transactions.filter(t => t.purchaseId === purchaseId);
}

// Get all pending purchases
export function getPendingPurchases() {
  const purchases = loadPurchases();
  return purchases.filter(p => p.status === 'pending');
}

// Get completed purchases
export function getCompletedPurchases() {
  const purchases = loadPurchases();
  return purchases.filter(p => p.status === 'completed');
}

// Backup data
export function backupData(backupPath = null) {
  try {
    const backupDir = backupPath || path.join(DATA_DIR, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      wallets: loadWallets(),
      purchases: loadPurchases(),
      transactions: loadTransactions()
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`Backup created at: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
}
