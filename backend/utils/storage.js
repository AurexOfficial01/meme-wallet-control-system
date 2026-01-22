import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');

// File paths
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

    // Initialize files with empty arrays if they don't exist
    const files = [
      { path: WALLETS_FILE, data: [] },
      { path: PURCHASES_FILE, data: [] },
      { path: TRANSACTIONS_FILE, data: [] }
    ];

    files.forEach(({ path: filePath, data }) => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } else {
        // Validate existing file has valid JSON
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
        } catch (error) {
          // If corrupted, reset to empty array
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Error ensuring data files:', error.message);
    return false;
  }
}

// Initialize files on import
ensureDataFiles();

// Load wallets from JSON file
export function loadWallets() {
  try {
    if (!fs.existsSync(WALLETS_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(WALLETS_FILE, 'utf8');
    
    // Handle empty file
    if (!data.trim()) {
      return [];
    }
    
    const parsed = JSON.parse(data);
    
    // Ensure we always return an array
    if (!Array.isArray(parsed)) {
      console.warn('Wallets file corrupted, resetting to empty array');
      saveWallets([]);
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading wallets:', error.message);
    
    // If file is corrupted, reset it
    try {
      saveWallets([]);
    } catch (resetError) {
      console.error('Failed to reset wallets file:', resetError.message);
    }
    
    return [];
  }
}

// Save wallets to JSON file
export function saveWallets(wallets) {
  try {
    // Ensure wallets is an array
    const data = Array.isArray(wallets) ? wallets : [];
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving wallets:', error.message);
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
    
    // Handle empty file
    if (!data.trim()) {
      return [];
    }
    
    const parsed = JSON.parse(data);
    
    // Ensure we always return an array
    if (!Array.isArray(parsed)) {
      console.warn('Purchases file corrupted, resetting to empty array');
      savePurchases([]);
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading purchases:', error.message);
    
    // If file is corrupted, reset it
    try {
      savePurchases([]);
    } catch (resetError) {
      console.error('Failed to reset purchases file:', resetError.message);
    }
    
    return [];
  }
}

// Save purchases to JSON file
export function savePurchases(purchases) {
  try {
    // Ensure purchases is an array
    const data = Array.isArray(purchases) ? purchases : [];
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving purchases:', error.message);
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
    
    // Handle empty file
    if (!data.trim()) {
      return [];
    }
    
    const parsed = JSON.parse(data);
    
    // Ensure we always return an array
    if (!Array.isArray(parsed)) {
      console.warn('Transactions file corrupted, resetting to empty array');
      saveTransactions([]);
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading transactions:', error.message);
    
    // If file is corrupted, reset it
    try {
      saveTransactions([]);
    } catch (resetError) {
      console.error('Failed to reset transactions file:', resetError.message);
    }
    
    return [];
  }
}

// Save transactions to JSON file
export function saveTransactions(transactions) {
  try {
    // Ensure transactions is an array
    const data = Array.isArray(transactions) ? transactions : [];
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving transactions:', error.message);
    return false;
  }
}

// Helper function to add a new wallet
export function addWallet(walletData) {
  try {
    const wallets = loadWallets();
    const newWallet = {
      id: Date.now().toString(),
      ...walletData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    wallets.push(newWallet);
    saveWallets(wallets);
    return newWallet;
  } catch (error) {
    console.error('Error adding wallet:', error.message);
    return null;
  }
}

// Helper function to add a new purchase
export function addPurchase(purchaseData) {
  try {
    const purchases = loadPurchases();
    const newPurchase = {
      id: Date.now().toString(),
      ...purchaseData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: purchaseData.status || 'pending'
    };
    
    purchases.push(newPurchase);
    savePurchases(purchases);
    return newPurchase;
  } catch (error) {
    console.error('Error adding purchase:', error.message);
    return null;
  }
}

// Helper function to add a new transaction
export function addTransaction(transactionData) {
  try {
    const transactions = loadTransactions();
    const newTransaction = {
      id: Date.now().toString(),
      ...transactionData,
      timestamp: new Date().toISOString()
    };
    
    transactions.push(newTransaction);
    saveTransactions(transactions);
    return newTransaction;
  } catch (error) {
    console.error('Error adding transaction:', error.message);
    return null;
  }
}

// Helper function to update purchase status
export function updatePurchaseStatus(purchaseId, status, transactionHash = null) {
  try {
    const purchases = loadPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    
    if (purchaseIndex === -1) {
      return null;
    }
    
    const purchase = purchases[purchaseIndex];
    purchase.status = status;
    purchase.updatedAt = new Date().toISOString();
    
    if (transactionHash) {
      purchase.transactionHash = transactionHash;
    }
    
    savePurchases(purchases);
    return purchase;
  } catch (error) {
    console.error('Error updating purchase status:', error.message);
    return null;
  }
}

// Helper function to get purchase by ID
export function getPurchase(purchaseId) {
  try {
    const purchases = loadPurchases();
    return purchases.find(p => p.id === purchaseId) || null;
  } catch (error) {
    console.error('Error getting purchase:', error.message);
    return null;
  }
}

// Helper function to get wallet by address and chain
export function getWallet(address, chain) {
  try {
    const wallets = loadWallets();
    return wallets.find(w => 
      w.address.toLowerCase() === address.toLowerCase() && 
      w.chain === chain.toLowerCase()
    ) || null;
  } catch (error) {
    console.error('Error getting wallet:', error.message);
    return null;
  }
}

// Export default object
export default {
  ensureDataFiles,
  loadWallets,
  saveWallets,
  loadPurchases,
  savePurchases,
  loadTransactions,
  saveTransactions,
  addWallet,
  addPurchase,
  addTransaction,
  updatePurchaseStatus,
  getPurchase,
  getWallet
};
