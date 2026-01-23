// wallet-connect-app/src/wallets/connector.js
import { detectWalletEnvironment } from "./detector.js";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

/**
 * Connect to the detected wallet
 * Returns connection info with address and provider
 */
export async function connectWallet() {
  // Detect current wallet environment
  const detection = detectWalletEnvironment();
  
  // Check if provider is available
  if (!detection.provider && detection.walletId !== 'walletconnect') {
    throw new Error("Wallet provider unavailable");
  }

  let address;
  let provider = detection.provider;

  // -----------------------------------------------------
  // CASE 1 — SOLANA (Phantom or Solflare)
  // -----------------------------------------------------
if (detection.chain === "solana") {
  if (!provider) {
    throw new Error("Solana wallet not available");
  }

  try {
    await provider.connect();
    address = provider.publicKey.toString();
  } catch (error) {
    throw new Error(`Failed to connect to Solana wallet: ${error.message}`);
  }

  if (!address) {
    throw new Error("No account returned by Solana wallet");
  }
}

  // -----------------------------------------------------
  // CASE 2 — TRON (TronLink)
  // -----------------------------------------------------
  else if (detection.chain === "tron") {
    if (!provider || provider.ready !== true) {
      throw new Error("TronLink not ready or available");
    }

    try {
      address = provider.defaultAddress.base58;
    } catch (error) {
      throw new Error(`Failed to get Tron address: ${error.message}`);
    }

    if (!address) {
      throw new Error("No account returned by TronLink");
    }
  }

  // -----------------------------------------------------
  // CASE 3 — EVM (MetaMask, Trust, Coinbase, etc.)
  // -----------------------------------------------------
  else if (detection.chain === "evm" && detection.walletId !== "walletconnect") {
    if (!provider) {
      throw new Error("EVM wallet provider not available");
    }

    try {
      // Request accounts from EVM wallet
      const accounts = await provider.request({
        method: "eth_requestAccounts"
      });

      address = accounts[0];
    } catch (error) {
      throw new Error(`Failed to connect to EVM wallet: ${error.message}`);
    }

    if (!address) {
      throw new Error("No account returned by wallet");
    }

    // EVM addresses must be lowercase
    address = address.toLowerCase();
  }

  // -----------------------------------------------------
  // CASE 4 — WALLETCONNECT (EVM ONLY)
  // -----------------------------------------------------
  else if (detection.walletId === "walletconnect") {
    try {
      // Initialize WalletConnect
      const wcProvider = await EthereumProvider.init({
        projectId: "f6c8b6a6c2c4e0b6c8b6a6c2c4e0b6c8", // Dummy project ID
        chains: [1], // Ethereum mainnet
        showQrModal: true,
        methods: ["eth_sendTransaction", "personal_sign"],
        events: ["chainChanged", "accountsChanged"]
      });

      // Connect via WalletConnect
      await wcProvider.connect();
      
      // Get accounts
      const accounts = await wcProvider.request({
        method: "eth_accounts"
      });

      address = accounts[0];
      provider = wcProvider;
    } catch (error) {
      throw new Error(`WalletConnect failed: ${error.message}`);
    }

    if (!address) {
      throw new Error("No account returned via WalletConnect");
    }

    // EVM addresses must be lowercase
    address = address.toLowerCase();
    detection.chain = "evm";
    detection.walletId = "walletconnect";
    detection.walletName = "WalletConnect";
  }

  // -----------------------------------------------------
  // UNKNOWN CHAIN / PROVIDER
  // -----------------------------------------------------
  else {
    throw new Error(`Unsupported chain or wallet: ${detection.chain}`);
  }

  // -----------------------------------------------------
  // FINAL VALIDATION
  // -----------------------------------------------------
  if (!address) {
    throw new Error("Failed to retrieve wallet address");
  }

  // Return final connection result
  return {
    chain: detection.chain,
    address: address,
    walletId: detection.walletId,
    walletName: detection.walletName,
    provider: provider
  };
}
