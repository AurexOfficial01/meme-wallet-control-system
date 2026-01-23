// wallet-connect-app/src/App.jsx
import React from "react";
import { WalletProvider } from "./context/WalletContext.js";
import { useWallet } from "./context/WalletContext.js";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import BuyUSDT from "./BuyUSDT.jsx";

function AppContent() {
  const {
    connected,
    loading,
    address,
    chain,
    walletName,
    connect,
    disconnect
  } = useWallet();

  const handleConnect = async () => {
    const result = await connect();
    if (!result.success) {
      alert(`Failed to connect: ${result.error}`);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <span> | </span>
        <Link to="/buy-usdt">Buy USDT</Link>
      </nav>

      <h1>Wallet Connection System</h1>

      <div>
        {!connected ? (
          <button onClick={handleConnect} disabled={loading}>
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <div>
            <p>Connected: {address}</p>
            <p>Chain: {chain}</p>
            {walletName && <p>Wallet: {walletName}</p>}
            <button onClick={handleDisconnect}>Disconnect</button>
          </div>
        )}
      </div>

      <Routes>
        <Route path="/" element={
          <div>
            <h2>Home Screen</h2>
            <p>Use the navigation to access different features.</p>
          </div>
        } />
        <Route path="/buy-usdt" element={<BuyUSDT />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
