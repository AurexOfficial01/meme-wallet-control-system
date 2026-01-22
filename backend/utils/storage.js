// backend/utils/storage.js - Vercel-safe storage
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const WALLETS_FILE = path.join(__dirname, '..', 'data', 'wallets.json');
const PURCHASES_FILE = path.join(__dirname, '..', 'data', 'purchases.json');
const TRANSACTIONS_FILE = path.join(__dirname, '..', 'data', 'transactions.json');

// Load data - always return array, never crash
export function loadWallets() {
  try {
    if (!fs.existsSync(WALLETS_FILE)) return [];
    const data = fs.readFileSync(WALLETS_FILE, 'utf8');
    if (!data.trim()) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading wallets:', error.message);
    return [];
  }
}

export function saveWallets(wallets) {
  try {
    const data = Array.isArray(wallets) ? wallets : [];
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving wallets:', error.message);
    return false;
  }
}

export function loadPurchases() {
  try {
    if (!fs.existsSync(PURCHASES_FILE)) return [];
    const data = fs.readFileSync(PURCHASES_FILE, 'utf8');
    if (!data.trim()) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading purchases:', error.message);
    return [];
  }
}

export function savePurchases(purchases) {
  try {
    const data = Array.isArray(purchases) ? purchases : [];
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving purchases:', error.message);
    return false;
  }
}

export function loadTransactions() {
  try {
    if (!fs.existsSync(TRANSACTIONS_FILE)) return [];
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    if (!data.trim()) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading transactions:', error.message);
    return [];
  }
}

export function saveTransactions(transactions) {
  try {
    const data = Array.isArray(transactions) ? transactions : [];
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving transactions:', error.message);
    return false;
  }
}

// Ensure data files exist
export function ensureDataFiles() {
  // Don't create directories, just ensure files exist
  if (!fs.existsSync(WALLETS_FILE)) saveWallets([]);
  if (!fs.existsSync(PURCHASES_FILE)) savePurchases([]);
  if (!fs.existsSync(TRANSACTIONS_FILE)) saveTransactions([]);
  return true;
}

export default {
  loadWallets,
  saveWallets,
  loadPurchases,
  savePurchases,
  loadTransactions,
  saveTransactions,
  ensureDataFiles
};
