// CLEAN, STABLE, CORRECT MULTI-WALLET DETECTOR
// Works correctly on ALL mobile wallet browsers

export function detectWalletEnvironment() {
  if (typeof window === "undefined") {
    return fallback();
  }

  const ua = navigator.userAgent.toLowerCase();

  // ==============================
  // PRIORITY 1 — PHANTOM BROWSER
  // ==============================
  if (ua.includes("phantom")) {
    return {
      chain: "solana",
      walletId: "phantom",
      walletName: "Phantom",
      type: "wallet_browser",
      provider: window.phantom?.solana || null
    };
  }

  // ==============================
  // PRIORITY 2 — TRONLINK BROWSER
  // ==============================
  if (ua.includes("tronlink") || window.tronWeb?.ready) {
    return {
      chain: "tron",
      walletId: "tronlink",
      walletName: "TronLink",
      type: "wallet_browser",
      provider: window.tronWeb || window.tronLink?.tronWeb || null
    };
  }

  // ==============================
  // PRIORITY 3 — TRUST WALLET APP
  // ==============================
  if (ua.includes("trust") || ua.includes("twbrowser")) {
    return {
      chain: "evm",
      walletId: "trust",
      walletName: "Trust Wallet",
      type: "wallet_browser",
      provider: window.ethereum || null
    };
  }

  // ==============================
  // PRIORITY 4 — COINBASE BROWSER
  // ==============================
  if (ua.includes("coinbase")) {
    return {
      chain: "evm",
      walletId: "coinbase",
      walletName: "Coinbase Wallet",
      type: "wallet_browser",
      provider: window.ethereum || null
    };
  }

  // ==============================
  // PRIORITY 5 — OKX BROWSER
  // ==============================
  if (ua.includes("okx") || window.okxwallet) {
    return {
      chain: "evm",
      walletId: "okx",
      walletName: "OKX Wallet",
      type: "wallet_browser",
      provider: window.okxwallet || window.ethereum || null
    };
  }

  // ==============================
  // PRIORITY 6 — BITGET BROWSER
  // ==============================
  if (ua.includes("bitget") || window.bitkeep) {
    return {
      chain: "evm",
      walletId: "bitget",
      walletName: "Bitget Wallet",
      type: "wallet_browser",
      provider: window.bitkeep || window.ethereum || null
    };
  }

  // ==============================
  // INJECTED SOLANA
  // ==============================
  if (window.phantom?.solana?.isPhantom) {
    return {
      chain: "solana",
      walletId: "phantom",
      walletName: "Phantom",
      type: "injected",
      provider: window.phantom.solana
    };
  }

  if (window.solflare?.isSolflare) {
    return {
      chain: "solana",
      walletId: "solflare",
      walletName: "Solflare",
      type: "injected",
      provider: window.solflare
    };
  }

  // ==============================
  // INJECTED TRON
  // ==============================
  if (window.tronWeb?.ready) {
    return {
      chain: "tron",
      walletId: "tronlink",
      walletName: "TronLink",
      type: "injected",
      provider: window.tronWeb
    };
  }

  // ==============================
  // INJECTED EVM (Desktop or Mobile)
  // ==============================
  if (window.ethereum) {
    const eth = window.ethereum;

    if (eth.isMetaMask) {
      return {
        chain: "evm",
        walletId: "metamask",
        walletName: "MetaMask",
        type: "injected",
        provider: eth
      };
    }

    if (eth.isCoinbaseWallet) {
      return {
        chain: "evm",
        walletId: "coinbase",
        walletName: "Coinbase Wallet",
        type: "injected",
        provider: eth
      };
    }

    if (eth.isTrust) {
      return {
        chain: "evm",
        walletId: "trust",
        walletName: "Trust Wallet",
        type: "injected",
        provider: eth
      };
    }

    return {
      chain: "evm",
      walletId: "evm",
      walletName: "EVM Wallet",
      type: "injected",
      provider: eth
    };
  }

  // NOTHING FOUND
  return fallback();
}

function fallback() {
  return {
    chain: null,
    walletId: null,
    walletName: null,
    type: null,
    provider: null
  };
}
