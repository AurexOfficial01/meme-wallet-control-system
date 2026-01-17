// src/App.jsx

import { useState, useEffect } from 'react';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

// WalletConnect configuration
const WALLETCONNECT_PROJECT_ID = 'fb91c2fb42af27391dcfa9dcfe40edc7'; // Get from https://cloud.walletconnect.com
const WALLETCONNECT_METADATA = {
  name: 'Wallet Connect System',
  description: 'Demo app for wallet connections',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerType, setProviderType] = useState(null); // 'metamask' or 'walletconnect'
  const [walletConnectProvider, setWalletConnectProvider] = useState(null);

  // Initialize WalletConnect
  useEffect(() => {
    const initWalletConnect = async () => {
      try {
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'light',
          },
          chains: [1], // Ethereum mainnet
          events: ['chainChanged', 'accountsChanged'],
          methods: ['eth_sendTransaction', 'personal_sign'],
          metadata: WALLETCONNECT_METADATA,
        });

        provider.on('accountsChanged', handleWalletConnectAccountsChanged);
        provider.on('chainChanged', handleWalletConnectChainChanged);
        provider.on('disconnect', handleWalletConnectDisconnect);

        setWalletConnectProvider(provider);

        // Check if already connected via WalletConnect
        if (provider.session) {
          await handleWalletConnectConnection(provider);
        }
      } catch (err) {
        console.error('Error initializing WalletConnect:', err);
      }
    };

    initWalletConnect();

    return () => {
      if (walletConnectProvider) {
        walletConnectProvider.removeListener('accountsChanged', handleWalletConnectAccountsChanged);
        walletConnectProvider.removeListener('chainChanged', handleWalletConnectChainChanged);
        walletConnectProvider.removeListener('disconnect', handleWalletConnectDisconnect);
      }
    };
  }, []);

  const checkWalletInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  const getNetworkName = (chainId) => {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0x3': 'Ropsten Testnet',
      '0x4': 'Rinkeby Testnet',
      '0x5': 'Goerli Testnet',
      '0x2a': 'Kovan Testnet',
      '0x89': 'Polygon Mainnet',
      '0x13881': 'Polygon Mumbai',
      '0xaa36a7': 'Sepolia',
      '0xa4b1': 'Arbitrum',
      '0xa': 'Optimism',
      '0x38': 'BNB Smart Chain',
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  const getChainId = async (provider) => {
    try {
      const id = await provider.request({ method: 'eth_chainId' });
      setChainId(id);
      setNetworkName(getNetworkName(id));
    } catch (err) {
      console.error('Error getting chainId:', err);
    }
  };

  // MetaMask connection
  const connectMetaMask = async () => {
    if (!checkWalletInstalled()) {
      setError('No Ethereum wallet found. Please install MetaMask.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Disconnect WalletConnect if connected
      if (providerType === 'walletconnect' && walletConnectProvider) {
        await walletConnectProvider.disconnect();
      }

      // Request accounts from MetaMask
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setProviderType('metamask');
        await getChainId(window.ethereum);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect MetaMask');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // WalletConnect connection
  const connectWalletConnect = async () => {
    if (!walletConnectProvider) {
      setError('WalletConnect not initialized');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Disconnect MetaMask if connected
      if (providerType === 'metamask') {
        disconnectMetaMask();
      }

      await walletConnectProvider.connect();
      await handleWalletConnectConnection(walletConnectProvider);
    } catch (err) {
      setError(err.message || 'Failed to connect with WalletConnect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletConnectConnection = async (provider) => {
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setProviderType('walletconnect');
        await getChainId(provider);
      }
    } catch (err) {
      console.error('Error handling WalletConnect connection:', err);
      setIsConnected(false);
    }
  };

  const handleWalletConnectAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAddress(accounts[0]);
    }
  };

  const handleWalletConnectChainChanged = (newChainId) => {
    setChainId(newChainId);
    setNetworkName(getNetworkName(newChainId));
  };

  const handleWalletConnectDisconnect = () => {
    disconnectWallet();
  };

  // MetaMask event handlers
  useEffect(() => {
    if (!checkWalletInstalled() || providerType !== 'metamask') return;

    const handleMetaMaskAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleMetaMaskChainChanged = (newChainId) => {
      setChainId(newChainId);
      setNetworkName(getNetworkName(newChainId));
      // MetaMask recommends page reload
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleMetaMaskAccountsChanged);
    window.ethereum.on('chainChanged', handleMetaMaskChainChanged);

    // Check initial MetaMask connection
    const checkMetaMaskConnection = async () => {
      if (providerType !== 'metamask') return;
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          await getChainId(window.ethereum);
        }
      } catch (err) {
        console.error('Error checking MetaMask connection:', err);
      }
    };

    checkMetaMaskConnection();

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleMetaMaskAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleMetaMaskChainChanged);
      }
    };
  }, [providerType]);

  const disconnectMetaMask = () => {
    // MetaMask doesn't have a disconnect method, just clear state
    setAddress('');
    setChainId('');
    setNetworkName('');
    setIsConnected(false);
    setProviderType(null);
    setError('');
  };

  const disconnectWalletConnect = async () => {
    if (walletConnectProvider) {
      try {
        await walletConnectProvider.disconnect();
      } catch (err) {
        console.error('Error disconnecting WalletConnect:', err);
      }
    }
    disconnectMetaMask(); // Same cleanup
  };

  const disconnectWallet = () => {
    if (providerType === 'metamask') {
      disconnectMetaMask();
    } else if (providerType === 'walletconnect') {
      disconnectWalletConnect();
    } else {
      disconnectMetaMask();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header>
        <h1>Wallet Connect System</h1>
      </header>

      <main style={{ marginTop: '20px' }}>
        {!checkWalletInstalled() && !walletConnectProvider ? (
          <div style={{ color: 'red' }}>
            <p>No wallet connection methods available.</p>
            <p>
              Please install{' '}
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                MetaMask
              </a>
              {' '}or use WalletConnect with a mobile wallet.
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
            <p>
              <strong>Network:</strong> {networkName}
            </p>
            <p>
              <strong>Chain ID:</strong> {chainId}
            </p>
            <p>
              <strong>Provider:</strong> {providerType === 'metamask' ? 'MetaMask' : 'WalletConnect'}
            </p>
            <button
              onClick={disconnectWallet}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px',
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
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              {checkWalletInstalled() && (
                <button
                  onClick={connectMetaMask}
                  disabled={isLoading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f6851b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    flex: 1,
                  }}
                >
                  {isLoading && providerType === 'metamask' ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              )}
              
              <button
                onClick={connectWalletConnect}
                disabled={isLoading || !walletConnectProvider}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b99fc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  opacity: (isLoading || !walletConnectProvider) ? 0.7 : 1,
                  flex: 1,
                }}
              >
                {isLoading && providerType === 'walletconnect' ? 'Connecting...' : 'Connect with WalletConnect'}
              </button>
            </div>

            {!walletConnectProvider && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                <em>WalletConnect initialization failed. Check console for errors.</em>
              </p>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '10px', color: 'red' }}>
            <p>Error: {error}</p>
          </div>
        )}

        {isConnected && (
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            <p>
              <em>
                Connected via {providerType === 'metamask' ? 'MetaMask' : 'WalletConnect'} •{' '}
                Wallet events are being monitored
              </em>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
