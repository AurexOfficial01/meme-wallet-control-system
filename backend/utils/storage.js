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

// Ensure data directory exists - Vercel safe version
export function ensureDataFiles() {
  try {
    // Don't try to create directory on Vercel
    // Just check if files exist and initialize them
    const files = [
      { path: WALLETS_FILE, data: [] },
      { path: PURCHASES_FILE, data: [] },
      { path: TRANSACTIONS_FILE, data: [] }
    ];

    files.forEach(({ path: filePath, data }) => {
      try {
        // Try to read existing file
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
      } catch (error) {
        // If file doesn't exist or is corrupted, create it
        try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (writeError) {
          console.error(`Failed to write file ${filePath}:`, writeError.message);
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Error ensuring data files:', error.message);
    return false;
  }
}

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
    return [];
  }
}

// Save wallets to JSON file
export function saveWallets(wallets) {
  try {
    // Ensure wallets is an array
    const data = Array.isArray(wallets) ? wallets : [];
    
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
    return [];
  }
}

// Save purchases to JSON file
export function savePurchases(purchases) {
  try {
    // Ensure purchases is an array
    const data = Array.isArray(purchases) ? purchases : [];
    
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
    return [];
  }
}

// Save transactions to JSON file
export function saveTransactions(transactions) {
  try {
    // Ensure transactions is an array
    const data = Array.isArray(transactions) ? transactions : [];
    
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving transactions:', error.message);
    return false;
  }
}

export default {
  ensureDataFiles,
  loadWallets,
  saveWallets,
  loadPurchases,
  savePurchases,
  loadTransactions,
  saveTransactions
};
