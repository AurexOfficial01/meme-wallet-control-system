// backend/utils/balances.js - Minimal version
import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import TronWeb from 'tronweb';

const evmProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  solidityNode: 'https://api.trongrid.io'
});

export async function getEvmBalances(address) {
  try {
    if (!ethers.isAddress(address)) {
      return { native: "0", tokens: [], error: "Invalid address" };
    }
    
    const nativeBalance = await evmProvider.getBalance(address);
    const ethBalance = ethers.formatEther(nativeBalance);
    
    return {
      native: parseFloat(ethBalance).toFixed(6),
      tokens: [],
      chain: 'evm'
    };
  } catch (error) {
    console.error('EVM balance error:', error.message);
    return { native: "0", tokens: [], chain: 'evm' };
  }
}

export async function getSolanaBalances(address) {
  try {
    const publicKey = new PublicKey(address);
    const balance = await solanaConnection.getBalance(publicKey);
    const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(6);
    
    return {
      native: solBalance,
      tokens: [],
      chain: 'solana'
    };
  } catch (error) {
    console.error('Solana balance error:', error.message);
    return { native: "0", tokens: [], chain: 'solana' };
  }
}

export async function getTronBalances(address) {
  try {
    if (!tronWeb.isAddress(address)) {
      return { native: "0", tokens: [], error: "Invalid address" };
    }
    
    const balance = await tronWeb.trx.getBalance(address);
    const trxBalance = (balance / 1_000_000).toFixed(6);
    
    return {
      native: trxBalance,
      tokens: [],
      chain: 'tron'
    };
  } catch (error) {
    console.error('Tron balance error:', error.message);
    return { native: "0", tokens: [], chain: 'tron' };
  }
}
