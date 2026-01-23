// wallet-connect-app/src/wallets/chains.js

// --------------------------------------------------------
// EXPORT 1: getChainUtils(chain)
// --------------------------------------------------------
export function getChainUtils(chain) {
  const chainLower = chain.toLowerCase();

  // ====================
  // EVM CHAIN UTILS
  // ====================
  if (chainLower === "evm") {
    return {
      // Convert ETH to Wei (18 decimals)
      toSmallestUnit: (amount) => {
        return BigInt(Math.floor(amount * 1e18));
      },

      // Build native ETH transfer
      buildNativeTransfer: (to, amount) => {
        const wei = BigInt(Math.floor(amount * 1e18));
        return {
          to: to.toLowerCase(),
          value: "0x" + wei.toString(16)
        };
      },

      // Build USDT ERC20 transfer
      buildUsdtTransfer: (to, amount) => {
        const wei = BigInt(Math.floor(amount * 1e6)); // USDT has 6 decimals
        const toAddress = to.toLowerCase().replace("0x", "").padStart(64, "0");
        const amountHex = wei.toString(16).padStart(64, "0");
        
        // ERC20 transfer method signature: transfer(address,uint256)
        const data = "0xa9059cbb" + toAddress + amountHex;
        
        return {
          to: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          data: data
        };
      }
    };
  }

  // ====================
  // SOLANA CHAIN UTILS
  // ====================
  else if (chainLower === "solana") {
    return {
      // Convert SOL to lamports (9 decimals)
      toSmallestUnit: (amount) => {
        return Math.floor(amount * 1e9);
      },

      // Build native SOL transfer
      buildNativeTransfer: (to, amount) => {
        return {
          type: "sol_transfer",
          to: to,
          lamports: Math.floor(amount * 1e9)
        };
      },

      // Build SPL USDT transfer
      buildUsdtTransfer: (to, amount) => {
        // USDT on Solana has 6 decimals
        const amountSmallest = Math.floor(amount * 1e9);
        return {
          type: "spl_transfer",
          to: to,
          amount: amountSmallest,
          mint: "Es9vMFrzaCERzWdY4xXHzkwmo7aX6ixkmKfeNHfYBqsp"
        };
      }
    };
  }

  // ====================
  // TRON CHAIN UTILS
  // ====================
  else if (chainLower === "tron") {
    return {
      // Convert TRX to Sun (6 decimals)
      toSmallestUnit: (amount) => {
        return Math.floor(amount * 1e6);
      },

      // Build native TRX transfer
      buildNativeTransfer: (to, amount) => {
        return {
          type: "trx_transfer",
          to: to,
          amount: Math.floor(amount * 1e6)
        };
      },

      // Build TRC20 USDT transfer
      buildUsdtTransfer: (to, amount) => {
        // USDT on Tron has 6 decimals
        const amountSmallest = Math.floor(amount * 1e6);
        return {
          type: "trc20_transfer",
          contract: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
          to: to,
          amount: amountSmallest
        };
      }
    };
  }

  // ====================
  // UNSUPPORTED CHAIN
  // ====================
  else {
    throw new Error(`Unsupported chain: ${chain}`);
  }
}

// --------------------------------------------------------
// EXPORT 2: getNativeSymbol(chain)
// --------------------------------------------------------
export function getNativeSymbol(chain) {
  const chainLower = chain.toLowerCase();

  if (chainLower === "evm") {
    return "ETH";
  } else if (chainLower === "solana") {
    return "SOL";
  } else if (chainLower === "tron") {
    return "TRX";
  } else {
    throw new Error(`Unsupported chain: ${chain}`);
  }
}

// --------------------------------------------------------
// EXPORT 3: getUsdtContract(chain)
// --------------------------------------------------------
export function getUsdtContract(chain) {
  const chainLower = chain.toLowerCase();

  if (chainLower === "evm") {
    return "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  } else if (chainLower === "solana") {
    return "Es9vMFrzaCERzWdY4xXHzkwmo7aX6ixkmKfeNHfYBqsp";
  } else if (chainLower === "tron") {
    return "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8";
  } else {
    throw new Error(`Unsupported chain: ${chain}`);
  }
}
