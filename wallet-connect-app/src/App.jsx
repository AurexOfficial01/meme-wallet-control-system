// src/App.jsx - Main App Component for Aviiaor Demo Platform

import { useState } from 'react';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectWallet = async () => {
    // TODO: Implement wallet connection logic
    setIsLoading(true);
    
    // Simulate wallet connection delay
    setTimeout(() => {
      setIsConnected(true);
      setUserAddress('0x742d35Cc6634C0532925a3b844Bc9e');
      setIsLoading(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserAddress('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Wallet Connect System</h1>
        <p className="app-subtitle">
          Educational Demo Platform • No Real Money
        </p>
      </header>

      <main className="app-main">
        <div className="wallet-card">
          <div className="wallet-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <span className="status-text">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="wallet-info">
            {isConnected ? (
              <>
                <div className="address-display">
                  <span className="address-label">Connected Address:</span>
                  <code className="address-value">
                    {userAddress}
                  </code>
                </div>
                <div className="demo-balance">
                  <span className="balance-label">Demo Balance:</span>
                  <span className="balance-value">$10,000.00</span>
                </div>
                <button
                  className="wallet-btn disconnect-btn"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Disconnect Wallet
                </button>
              </>
            ) : (
              <>
                <div className="connect-prompt">
                  <h3 className="prompt-title">Connect Your Wallet</h3>
                  <p className="prompt-description">
                    Connect a wallet to interact with the Aviiaor demo platform.
                    This is for educational purposes only.
                  </p>
                </div>
                <button
                  className="wallet-btn connect-btn"
                  onClick={handleConnectWallet}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="btn-loading">
                      <span className="spinner"></span>
                      Connecting...
                    </span>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              </>
            )}
          </div>

          <div className="demo-notice">
            <p className="notice-text">
              ⚠️ This is an educational demo platform. No real cryptocurrency or money is involved.
              All balances and transactions are simulated for learning purposes.
            </p>
          </div>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <h3 className="feature-title">Learn Web3</h3>
            <p className="feature-description">
              Understand wallet connections, transactions, and smart contract interactions in a safe environment.
            </p>
          </div>
          <div className="feature-card">
            <h3 className="feature-title">Demo Games</h3>
            <p className="feature-description">
              Try crash game and color trading simulations without financial risk.
            </p>
          </div>
          <div className="feature-card">
            <h3 className="feature-title">Safe Environment</h3>
            <p className="feature-description">
              All interactions use test networks and demo currencies. Your real assets are safe.
            </p>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p className="footer-text">
          Aviiaor Demo Platform • Built for Educational Purposes • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default App;
