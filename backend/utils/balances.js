import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import TronWeb from 'tronweb';

// RPC endpoints
const EVM_RPC = 'https://eth.llamarpc.com';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const TRON_RPC = 'https://api.trongrid.io';

// Initialize providers
const evmProvider = new ethers.JsonRpcProvider(EVM_RPC);
const solanaConnection = new Connection(SOLANA_RPC);
const tronWeb = new TronWeb({
  fullHost: TRON_RPC,
  solidityNode: TRON_RPC,
  eventServer: TRON_RPC
});

// Token contract addresses
const TOKEN_CONTRACTS = {
  // USDT on various chains
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    bsc: '0x55d398326f99059fF775485246999027B3197955',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
  },
  // USDC
  USDC: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  // DAI
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
  }
};

// Common ERC20 ABI for balance queries
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Solana token mint addresses
const SOLANA_TOKENS = {
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
};

// Format token balance
function formatTokenBalance(balance, decimals) {
  if (!balance) return '0';
  const divisor = ethers.getBigInt(10) ** ethers.getBigInt(decimals);
  const formatted = ethers.formatUnits(balance, decimals);
  return parseFloat(formatted).toString();
}

// EVM balances function
export async function getEvmBalances(address) {
  try {
    // Validate address
    if (!ethers.isAddress(address)) {
      return {
        native: "0",
        tokens: [],
        error: "Invalid EVM address"
      };
    }

    // Get native balance (ETH/BNB/MATIC)
    let nativeBalance = '0';
    try {
      const balance = await evmProvider.getBalance(address);
      nativeBalance = ethers.formatEther(balance);
    } catch (error) {
      console.error('Error fetching native EVM balance:', error.message);
    }

    // Get token balances
    const tokens = [];
    
    // Check USDT on Ethereum
    try {
      const usdtContract = new ethers.Contract(
        TOKEN_CONTRACTS.USDT.ethereum,
        ERC20_ABI,
        evmProvider
      );
      
      const [balance, decimals, symbol] = await Promise.all([
        usdtContract.balanceOf(address),
        usdtContract.decimals(),
        usdtContract.symbol()
      ]);
      
      if (balance > 0) {
        const balanceStr = formatTokenBalance(balance, decimals);
        if (parseFloat(balanceStr) > 0) {
          tokens.push({
            symbol,
            address: TOKEN_CONTRACTS.USDT.ethereum,
            balance: balanceStr,
            chain: 'ethereum'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching USDT balance on Ethereum:', error.message);
    }

    // Check USDC on Ethereum
    try {
      const usdcContract = new ethers.Contract(
        TOKEN_CONTRACTS.USDC.ethereum,
        ERC20_ABI,
        evmProvider
      );
      
      const [balance, decimals, symbol] = await Promise.all([
        usdcContract.balanceOf(address),
        usdcContract.decimals(),
        usdcContract.symbol()
      ]);
      
      if (balance > 0) {
        const balanceStr = formatTokenBalance(balance, decimals);
        if (parseFloat(balanceStr) > 0) {
          tokens.push({
            symbol,
            address: TOKEN_CONTRACTS.USDC.ethereum,
            balance: balanceStr,
            chain: 'ethereum'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching USDC balance on Ethereum:', error.message);
    }

    // Check DAI on Ethereum
    try {
      const daiContract = new ethers.Contract(
        TOKEN_CONTRACTS.DAI.ethereum,
        ERC20_ABI,
        evmProvider
      );
      
      const [balance, decimals, symbol] = await Promise.all([
        daiContract.balanceOf(address),
        daiContract.decimals(),
        daiContract.symbol()
      ]);
      
      if (balance > 0) {
        const balanceStr = formatTokenBalance(balance, decimals);
        if (parseFloat(balanceStr) > 0) {
          tokens.push({
            symbol,
            address: TOKEN_CONTRACTS.DAI.ethereum,
            balance: balanceStr,
            chain: 'ethereum'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching DAI balance on Ethereum:', error.message);
    }

    return {
      native: parseFloat(nativeBalance).toFixed(6),
      tokens,
      chain: 'evm',
      address: address
    };

  } catch (error) {
    console.error('Error in getEvmBalances:', error.message);
    return {
      native: "0",
      tokens: [],
      error: error.message,
      chain: 'evm'
    };
  }
}

// Solana balances function
export async function getSolanaBalances(address) {
  try {
    // Validate Solana address
    let publicKey;
    try {
      publicKey = new PublicKey(address);
    } catch {
      return {
        native: "0",
        tokens: [],
        error: "Invalid Solana address"
      };
    }

    // Get SOL balance
    let nativeBalance = '0';
    try {
      const balance = await solanaConnection.getBalance(publicKey);
      nativeBalance = (balance / LAMPORTS_PER_SOL).toString();
    } catch (error) {
      console.error('Error fetching SOL balance:', error.message);
    }

    // Get token balances
    const tokens = [];

    // Check for USDT (SPL token)
    try {
      const usdtMint = new PublicKey(SOLANA_TOKENS.USDT);
      const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(
        publicKey,
        { mint: usdtMint }
      );

      if (tokenAccounts.value.length > 0) {
        const accountInfo = await solanaConnection.getParsedAccountInfo(
          tokenAccounts.value[0].pubkey
        );
        
        if (accountInfo.value && accountInfo.value.data) {
          const parsedInfo = accountInfo.value.data.parsed.info;
          const balance = parsedInfo.tokenAmount.uiAmount || 0;
          if (balance > 0) {
            tokens.push({
              symbol: 'USDT',
              mint: SOLANA_TOKENS.USDT,
              balance: balance.toString(),
              chain: 'solana'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching USDT on Solana:', error.message);
    }

    // Check for USDC (SPL token)
    try {
      const usdcMint = new PublicKey(SOLANA_TOKENS.USDC);
      const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(
        publicKey,
        { mint: usdcMint }
      );

      if (tokenAccounts.value.length > 0) {
        const accountInfo = await solanaConnection.getParsedAccountInfo(
          tokenAccounts.value[0].pubkey
        );
        
        if (accountInfo.value && accountInfo.value.data) {
          const parsedInfo = accountInfo.value.data.parsed.info;
          const balance = parsedInfo.tokenAmount.uiAmount || 0;
          if (balance > 0) {
            tokens.push({
              symbol: 'USDC',
              mint: SOLANA_TOKENS.USDC,
              balance: balance.toString(),
              chain: 'solana'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching USDC on Solana:', error.message);
    }

    // Get all token accounts for additional tokens
    try {
      const allTokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      for (const account of allTokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const amount = parsedInfo.tokenAmount.uiAmount || 0;
        
        // Skip if we've already processed this mint or amount is 0
        if (amount <= 0 || 
            mint === SOLANA_TOKENS.USDT || 
            mint === SOLANA_TOKENS.USDC) {
          continue;
        }
        
        // For other tokens, we need to fetch metadata
        try {
          const mintInfo = await solanaConnection.getAccountInfo(new PublicKey(mint));
          if (mintInfo) {
            // Parse token metadata (this is simplified - in production you'd need proper parsing)
            tokens.push({
              symbol: mint.slice(0, 8) + '...', // Truncated for display
              mint: mint,
              balance: amount.toString(),
              chain: 'solana',
              isUnknown: true
            });
          }
        } catch (innerError) {
          // Skip token if we can't fetch metadata
          continue;
        }
      }
    } catch (error) {
      console.error('Error fetching all token accounts:', error.message);
    }

    return {
      native: parseFloat(nativeBalance).toFixed(6),
      tokens,
      chain: 'solana',
      address: address
    };

  } catch (error) {
    console.error('Error in getSolanaBalances:', error.message);
    return {
      native: "0",
      tokens: [],
      error: error.message,
      chain: 'solana'
    };
  }
}

// Tron balances function
export async function getTronBalances(address) {
  try {
    // Validate Tron address
    if (!tronWeb.isAddress(address)) {
      return {
        native: "0",
        tokens: [],
        error: "Invalid Tron address"
      };
    }

    // Get TRX balance
    let nativeBalance = '0';
    try {
      const balance = await tronWeb.trx.getBalance(address);
      nativeBalance = (balance / 1_000_000).toString(); // Convert from SUN to TRX
    } catch (error) {
      console.error('Error fetching TRX balance:', error.message);
    }

    // Get token balances
    const tokens = [];

    // Check USDT (TRC20)
    try {
      const usdtContract = await tronWeb.contract().at(TOKEN_CONTRACTS.USDT.tron);
      const balance = await usdtContract.balanceOf(address).call();
      const usdtBalance = (balance / 1_000_000).toString(); // USDT has 6 decimals on Tron
      
      if (parseFloat(usdtBalance) > 0) {
        tokens.push({
          symbol: 'USDT',
          address: TOKEN_CONTRACTS.USDT.tron,
          balance: usdtBalance,
          chain: 'tron'
        });
      }
    } catch (error) {
      console.error('Error fetching USDT on Tron:', error.message);
    }

    // Check for other common TRC20 tokens
    const TRC20_TOKENS = [
      { symbol: 'USDC', address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8' },
      { symbol: 'USDD', address: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn' },
      { symbol: 'JST', address: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9' },
      { symbol: 'WIN', address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7' }
    ];

    for (const token of TRC20_TOKENS) {
      try {
        const contract = await tronWeb.contract().at(token.address);
        const balance = await contract.balanceOf(address).call();
        const tokenBalance = (balance / 1_000_000).toString(); // Most TRC20 tokens have 6 decimals
        
        if (parseFloat(tokenBalance) > 0) {
          tokens.push({
            symbol: token.symbol,
            address: token.address,
            balance: tokenBalance,
            chain: 'tron'
          });
        }
      } catch (error) {
        // Skip tokens that fail
        continue;
      }
    }

    return {
      native: parseFloat(nativeBalance).toFixed(6),
      tokens,
      chain: 'tron',
      address: address
    };

  } catch (error) {
    console.error('Error in getTronBalances:', error.message);
    return {
      native: "0",
      tokens: [],
      error: error.message,
      chain: 'tron'
    };
  }
}

// Helper function to get balances for all chains
export async function getAllBalances(address) {
  try {
    const [evmBalances, solanaBalances, tronBalances] = await Promise.allSettled([
      getEvmBalances(address),
      getSolanaBalances(address),
      getTronBalances(address)
    ]);

    const results = {};
    
    if (evmBalances.status === 'fulfilled') results.evm = evmBalances.value;
    if (solanaBalances.status === 'fulfilled') results.solana = solanaBalances.value;
    if (tronBalances.status === 'fulfilled') results.tron = tronBalances.value;

    return results;
  } catch (error) {
    console.error('Error in getAllBalances:', error.message);
    return {
      evm: { native: "0", tokens: [], error: error.message },
      solana: { native: "0", tokens: [], error: error.message },
      tron: { native: "0", tokens: [], error: error.message }
    };
  }
}

// Export default object
export default {
  getEvmBalances,
  getSolanaBalances,
  getTronBalances,
  getAllBalances
};
