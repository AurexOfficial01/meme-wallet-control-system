import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import TronWeb from 'tronweb';

// Initialize providers
const evmProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  solidityNode: 'https://api.trongrid.io'
});

// USDT contract addresses
const USDT_CONTRACTS = {
  evm: {
    ethereum: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    bsc: '0x55d398326f99059fF775485246999027B3197955',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  },
  tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT on Tron
};

// ABI for USDT ERC20
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

export async function getEvmBalances(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }

    // Get native balance (ETH)
    const nativeBalance = await evmProvider.getBalance(address);
    const ethBalance = ethers.formatEther(nativeBalance);

    // Get USDT balance on Ethereum
    const usdtContractEthereum = new ethers.Contract(
      USDT_CONTRACTS.evm.ethereum,
      ERC20_ABI,
      evmProvider
    );

    let usdtBalance = '0';
    try {
      const usdtBalanceWei = await usdtContractEthereum.balanceOf(address);
      const decimals = await usdtContractEthereum.decimals();
      usdtBalance = ethers.formatUnits(usdtBalanceWei, decimals);
    } catch (error) {
      console.warn('Failed to fetch USDT balance on Ethereum:', error.message);
    }

    return {
      coinBalance: parseFloat(ethBalance).toFixed(6),
      usdtBalance: parseFloat(usdtBalance).toFixed(2),
      coinSymbol: 'ETH',
      usdtSymbol: 'USDT',
      network: 'Ethereum'
    };
  } catch (error) {
    console.error('Error fetching EVM balances:', error);
    return {
      coinBalance: '0',
      usdtBalance: '0',
      coinSymbol: 'ETH',
      usdtSymbol: 'USDT',
      error: error.message
    };
  }
}

export async function getSolanaBalances(address) {
  try {
    // Validate Solana address
    let publicKey;
    try {
      publicKey = new PublicKey(address);
    } catch {
      throw new Error('Invalid Solana address');
    }

    // Get SOL balance
    const solBalance = await solanaConnection.getBalance(publicKey);
    const solBalanceFormatted = (solBalance / LAMPORTS_PER_SOL).toFixed(6);

    // Get USDT balance (SPL token)
    // USDT mint address on Solana: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
    const usdtMint = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
    
    // Find token account
    const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(
      publicKey,
      { mint: usdtMint }
    );

    let usdtBalance = 0;
    if (tokenAccounts.value.length > 0) {
      const accountInfo = await solanaConnection.getParsedAccountInfo(
        tokenAccounts.value[0].pubkey
      );
      
      if (accountInfo.value) {
        const parsedInfo = accountInfo.value.data.parsed.info;
        usdtBalance = (parsedInfo.tokenAmount.uiAmount || 0).toFixed(2);
      }
    }

    return {
      coinBalance: solBalanceFormatted,
      usdtBalance: parseFloat(usdtBalance).toFixed(2),
      coinSymbol: 'SOL',
      usdtSymbol: 'USDT',
      network: 'Solana'
    };
  } catch (error) {
    console.error('Error fetching Solana balances:', error);
    return {
      coinBalance: '0',
      usdtBalance: '0',
      coinSymbol: 'SOL',
      usdtSymbol: 'USDT',
      error: error.message
    };
  }
}

export async function getTronBalances(address) {
  try {
    // Validate Tron address
    if (!tronWeb.isAddress(address)) {
      throw new Error('Invalid Tron address');
    }

    // Get TRX balance
    const trxBalance = await tronWeb.trx.getBalance(address);
    const trxBalanceFormatted = (trxBalance / 1_000_000).toFixed(6); // Convert from SUN

    // Get USDT balance (TRC20)
    const usdtContractAddress = USDT_CONTRACTS.tron;
    let usdtBalance = 0;

    try {
      const contract = await tronWeb.contract().at(usdtContractAddress);
      const result = await contract.balanceOf(address).call();
      usdtBalance = (result / 1_000_000).toFixed(2); // USDT has 6 decimals on Tron
    } catch (error) {
      console.warn('Failed to fetch USDT balance on Tron:', error.message);
    }

    return {
      coinBalance: trxBalanceFormatted,
      usdtBalance: parseFloat(usdtBalance).toFixed(2),
      coinSymbol: 'TRX',
      usdtSymbol: 'USDT',
      network: 'Tron'
    };
  } catch (error) {
    console.error('Error fetching Tron balances:', error);
    return {
      coinBalance: '0',
      usdtBalance: '0',
      coinSymbol: 'TRX',
      usdtSymbol: 'USDT',
      error: error.message
    };
  }
}
