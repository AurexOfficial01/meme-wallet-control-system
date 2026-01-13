// src/App.jsx

import { useState } from 'react';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const checkWalletInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  const handleConnect = async () => {
    if (!checkWalletInstalled()) {
      setError('No Ethereum wallet found. Please install MetaMask.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Request accounts from wallet
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAddress('');
    setIsConnected(false);
    setError('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header>
        <h1>Wallet Connect System</h1>
      </header>

      <main style={{ marginTop: '20px' }}>
        {!checkWalletInstalled() ? (
          <div style={{ color: 'red' }}>
            <p>No Ethereum wallet detected.</p>
            <p>
              Please install{' '}
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                MetaMask
              </a>
              .
            </p>
          </div>
        ) : isConnected ? (
          <div>
            <p>
              <strong>Status:</strong> Connected ✅
            </p>
            <p>
              <strong>Address:</strong> {address}
            </p>
            <button
              onClick={handleDisconnect}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p>
              <strong>Status:</strong> Not Connected ❌
            </p>
            <button
              onClick={handleConnect}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '10px', color: 'red' }}>
            <p>Error: {error}</p>
          </div>
        )}

        {checkWalletInstalled() && isConnected && (
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            <p>
              <em>Connected via {window.ethereum.isMetaMask ? 'MetaMask' : 'Ethereum Wallet'}</em>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
