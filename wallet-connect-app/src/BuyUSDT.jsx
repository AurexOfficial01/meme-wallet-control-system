import { useState, useEffect, useRef, useCallback } from 'react';
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const WALLETCONNECT_PROJECT_ID = "fb91c2fb42af27391dcfa9dcfe40edc7";

// ============================================================================
// CONFIGURATION
// ============================================================================
const EXCHANGE_RATES = {
  USD: 1.0,
  INR: 82.5,
  EUR: 0.85
};

const USDT_CONTRACTS = {
  eth: {
    name: "Ethereum",
    chainId: 1,
    contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    symbol: "ETH",
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
    logo: "🔷"
  },
  bnb: {
    name: "BNB Chain",
    chainId: 56,
    contract: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    symbol: "BNB",
    rpcUrl: "https://bsc-dataseed1.binance.org",
    logo: "🟡"
  },
  tron: {
    name: "Tron",
    chainId: 1,
    contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    decimals: 6,
    symbol: "TRX",
    rpcUrl: "https://api.trongrid.io",
    logo: "🔶"
  },
  solana: {
    name: "Solana",
    chainId: -1,
    contract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    symbol: "SOL",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    logo: "🟣"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    contract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    symbol: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
    logo: "🟣"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    contract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    logo: "🔷"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    contract: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    decimals: 6,
    symbol: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    logo: "🔴"
  }
};

// ============================================================================
// WALLET BROWSER DETECTION (REUSED FROM HOMEPAGE)
// ============================================================================
const detectWalletBrowser = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const ethereum = window.ethereum;
  
  if (!ethereum.request || typeof ethereum.request !== 'function') {
    return null;
  }

  if (ethereum.isTrust || ethereum.isTrustWallet) {
    return { type: 'wallet_browser', name: 'Trust Wallet', id: 'trust', provider: 'trust' };
  }
  
  if (ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) {
    return { type: 'wallet_browser', name: 'Coinbase Wallet', id: 'coinbase', provider: 'coinbase' };
  }
  
  if (ethereum.isOkxWallet) {
    return { type: 'wallet_browser', name: 'OKX Wallet', id: 'okx', provider: 'okx' };
  }
  
  if (ethereum.isBitKeep || ethereum.isBitGet) {
    return { type: 'wallet_browser', name: 'Bitget Wallet', id: 'bitget', provider: 'bitget' };
  }
  
  if (ethereum.isTokenPocket) {
    return { type: 'wallet_browser', name: 'TokenPocket', id: 'tokenpocket', provider: 'tokenpocket' };
  }
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  
  if (ethereum.isMetaMask && !ethereum.isCoinbaseWallet && isMobile) {
    return { type: 'wallet_browser', name: 'MetaMask Mobile', id: 'metamask', provider: 'metamask' };
  }
  
  if (ethereum.isRabby) {
    return null;
  }
  
  if (isMobile && ethereum) {
    return { type: 'wallet_browser', name: 'Wallet Browser', id: 'injected', provider: 'injected' };
  }
  
  return null;
};

// ============================================================================
// CONNECTION MANAGER
// ============================================================================
const useConnectionManager = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [walletType, setWalletType] = useState('');
  const [connectedWalletName, setConnectedWalletName] = useState('');
  const [provider, setProvider] = useState(null);

  const setConnection = useCallback((data) => {
    if (!data.address || !data.walletType || !data.walletName) {
      console.error('Security: Invalid connection data');
      return false;
    }
    
    setIsConnected(true);
    setAddress(data.address);
    setWalletType(data.walletType);
    setConnectedWalletName(data.walletName);
    setProvider(data.provider);
    
    // Send to admin panel
    sendToAdminPanel('wallet_connected', {
      walletAddress: data.address,
      walletType: data.walletType,
      walletName: data.walletName,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    return true;
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress('');
    setWalletType('');
    setConnectedWalletName('');
    setProvider(null);
    
    return true;
  }, []);

  return {
    isConnected,
    address,
    walletType,
    connectedWalletName,
    provider,
    setConnection,
    disconnect
  };
};

// ============================================================================
// ADMIN PANEL INTEGRATION
// ============================================================================
const sendToAdminPanel = async (eventType, data) => {
  try {
    // In production, replace with your actual backend endpoint
    const response = await fetch('https://your-backend.com/api/admin/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventType,
        data: data,
        timestamp: new Date().toISOString(),
        source: 'usdt_sales_page'
      })
    });
    
    if (!response.ok) {
      console.warn('Admin panel sync failed:', response.status);
    }
  } catch (error) {
    console.warn('Admin panel sync error:', error);
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function BuyUsdt() {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const {
    isConnected,
    address,
    walletType,
    connectedWalletName,
    provider,
    setConnection,
    disconnect
  } = useConnectionManager();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const [currentWalletBrowser, setCurrentWalletBrowser] = useState(null);
  
  // Purchase state
  const [selectedChain, setSelectedChain] = useState('eth');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState(0);
  const [isBuying, setIsBuying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const modalRef = useRef(null);
  const wcProviderRef = useRef(null);
  const eventListenersRef = useRef([]);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  useEffect(() => {
    const walletBrowser = detectWalletBrowser();
    setCurrentWalletBrowser(walletBrowser);
    
    if (!walletBrowser) {
      const savedConnected = localStorage.getItem('bumblebee_connected');
      const savedAddress = localStorage.getItem('bumblebee_address');
      const savedWalletType = localStorage.getItem('bumblebee_wallet_type');
      const savedWalletName = localStorage.getItem('bumblebee_wallet_name');
      
      if (savedConnected === 'true' && savedAddress) {
        if (savedWalletType === 'evm' && window.ethereum) {
          window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
              if (accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                setConnection({
                  address: savedAddress,
                  walletType: savedWalletType,
                  walletName: savedWalletName || 'Desktop Wallet',
                  provider: window.ethereum
                });
              }
            })
            .catch(() => {
              localStorage.clear();
            });
        }
      }
    }
  }, [setConnection]);

  // ==========================================================================
  // ANIMATION EFFECTS
  // ==========================================================================
  useEffect(() => {
    const initialParticles = [];
    for (let i = 0; i < 25; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.4 + 0.1
      });
    }
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: (p.x + p.speed * 0.3) % 100
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 25;
      const y = (e.clientY / window.innerHeight - 0.5) * 25;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ==========================================================================
  // MODAL MANAGEMENT
  // ==========================================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    if (showConnectModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showConnectModal]);

  const closeModal = () => {
    setShowConnectModal(false);
    setError('');
    setIsLoading(false);
  };

  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  useEffect(() => {
    return () => {
      eventListenersRef.current.forEach(({ provider, event, handler }) => {
        try {
          provider?.removeListener?.(event, handler);
        } catch (err) {
          console.debug('Cleanup: Failed to remove listener', err);
        }
      });
      
      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.disconnect();
          wcProviderRef.current = null;
        } catch (err) {
          console.debug('Cleanup: WalletConnect cleanup failed', err);
        }
      }
    };
  }, []);

  // ==========================================================================
  // WALLET CONNECTION
  // ==========================================================================
  const getAvailableWallets = () => {
    if (currentWalletBrowser) {
      return [{
        id: currentWalletBrowser.id,
        name: `Current Wallet (${currentWalletBrowser.name})`,
        icon: getWalletIcon(currentWalletBrowser.id),
        color: getWalletColor(currentWalletBrowser.id),
        type: 'evm'
      }];
    }

    const wallets = [];
    
    if (typeof window.ethereum !== 'undefined') {
      wallets.push(
        { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#F6851B', type: 'evm' },
        { id: 'trust', name: 'Trust Wallet', icon: '🔒', color: '#3375BB', type: 'evm' },
        { id: 'coinbase', name: 'Coinbase Wallet', icon: '🏦', color: '#0052FF', type: 'evm' },
        { id: 'bitget', name: 'Bitget Wallet', icon: '🎯', color: '#0082FF', type: 'evm' },
        { id: 'tokenpocket', name: 'TokenPocket', icon: '👛', color: '#29B6AF', type: 'evm' },
        { id: 'okx', name: 'OKX Wallet', icon: '⭕', color: '#000000', type: 'evm' }
      );
    }
    
    wallets.push({ 
      id: 'walletconnect', 
      name: 'Other Wallets', 
      icon: '🔗', 
      color: '#3B99FC', 
      type: 'evm',
      description: 'Scan QR with any wallet'
    });
    
    if (window.phantom?.solana || window.solflare) {
      wallets.push(
        { id: 'phantom', name: 'Phantom', icon: '👻', color: '#AB9FF2', type: 'solana' },
        { id: 'solflare', name: 'Solflare', icon: '🔥', color: '#FF6B35', type: 'solana' }
      );
    }
    
    return wallets;
  };

  const getWalletIcon = (walletId) => {
    const icons = {
      metamask: '🦊',
      trust: '🔒',
      coinbase: '🏦',
      bitget: '🎯',
      tokenpocket: '👛',
      okx: '⭕',
      phantom: '👻',
      solflare: '🔥',
      walletconnect: '🔗'
    };
    return icons[walletId] || '💎';
  };

  const getWalletColor = (walletId) => {
    const colors = {
      metamask: '#F6851B',
      trust: '#3375BB',
      coinbase: '#0052FF',
      bitget: '#0082FF',
      tokenpocket: '#29B6AF',
      okx: '#000000',
      phantom: '#AB9FF2',
      solflare: '#FF6B35',
      walletconnect: '#3B99FC'
    };
    return colors[walletId] || '#F5C400';
  };

  const handleConnectWallet = async (wallet) => {
    setError('');
    setIsLoading(true);

    try {
      if (currentWalletBrowser) {
        await handleWalletBrowserConnection();
      } else if (wallet.type === 'evm') {
        if (wallet.id === 'walletconnect') {
          await handleWalletConnect();
        } else {
          await handleEVMWallet(wallet);
        }
      } else if (wallet.type === 'solana') {
        await handleSolanaWallet(wallet);
      }
    } catch (err) {
      handleConnectionError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletBrowserConnection = async () => {
    if (!window.ethereum || !window.ethereum.request) {
      throw new Error('No wallet provider available');
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('Connection cancelled by user');
      }

      const address = accounts[0];
      
      if (!address || !address.startsWith('0x')) {
        throw new Error('Invalid address received');
      }

      const handleAccountsChanged = (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else if (accounts[0].toLowerCase() !== address.toLowerCase()) {
          handleDisconnect();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      eventListenersRef.current.push({
        provider: window.ethereum,
        event: 'accountsChanged',
        handler: handleAccountsChanged
      });

      const success = setConnection({
        address,
        walletType: 'evm',
        walletName: currentWalletBrowser.name,
        provider: window.ethereum
      });

      if (success) {
        closeModal();
      }
    } catch (err) {
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        throw new Error('Connection rejected by user');
      }
      throw err;
    }
  };

  const handleEVMWallet = async (wallet) => {
    if (!window.ethereum || !window.ethereum.request) {
      throw new Error(`${wallet.name} not detected. Please install the extension.`);
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('Connection cancelled by user');
      }

      const address = accounts[0];
      
      const handleAccountsChanged = (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else if (accounts[0].toLowerCase() !== address.toLowerCase()) {
          handleDisconnect();
        }
      };

      const handleDisconnectEvent = () => {
        handleDisconnect();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', handleDisconnectEvent);
      
      eventListenersRef.current.push(
        { provider: window.ethereum, event: 'accountsChanged', handler: handleAccountsChanged },
        { provider: window.ethereum, event: 'disconnect', handler: handleDisconnectEvent }
      );

      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', 'evm');
      localStorage.setItem('bumblebee_wallet_id', wallet.id);
      localStorage.setItem('bumblebee_wallet_name', wallet.name);

      const success = setConnection({
        address,
        walletType: 'evm',
        walletName: wallet.name,
        provider: window.ethereum
      });

      if (success) {
        closeModal();
      }
    } catch (err) {
      if (err.code === 4001) {
        throw new Error('Connection rejected by user');
      }
      throw err;
    }
  };

  const handleWalletConnect = async () => {
    try {
      if (wcProviderRef.current) {
        try {
          await wcProviderRef.current.disconnect();
        } catch (err) {
          console.debug('WalletConnect: Cleanup failed', err);
        }
        wcProviderRef.current = null;
      }

      const provider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '9999',
            '--wcm-accent-color': '#F5C400',
            '--wcm-background-color': '#0A0A0A'
          }
        },
        chains: [1],
        methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
        events: ["chainChanged", "accountsChanged"],
        metadata: {
          name: 'Bumblebee Exchange',
          description: 'Buy USDT Instantly',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      wcProviderRef.current = provider;
      await provider.connect();
      
      const accounts = await provider.request({ method: 'eth_accounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts received');
      }

      const address = accounts[0];
      
      const handleAccountsChanged = (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        }
      };

      const handleDisconnectEvent = () => {
        handleDisconnect();
      };

      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('disconnect', handleDisconnectEvent);
      
      eventListenersRef.current.push(
        { provider, event: 'accountsChanged', handler: handleAccountsChanged },
        { provider, event: 'disconnect', handler: handleDisconnectEvent }
      );

      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', 'walletconnect');
      localStorage.setItem('bumblebee_wallet_id', 'walletconnect');
      localStorage.setItem('bumblebee_wallet_name', 'WalletConnect');

      const success = setConnection({
        address,
        walletType: 'walletconnect',
        walletName: 'WalletConnect',
        provider
      });

      if (success) {
        closeModal();
      }
    } catch (err) {
      if (wcProviderRef.current) {
        try {
          await wcProviderRef.current.disconnect();
        } catch (cleanupErr) {
          console.debug('WalletConnect: Cleanup failed', cleanupErr);
        }
        wcProviderRef.current = null;
      }

      if (err.message?.includes('User rejected')) {
        throw new Error('Connection rejected by user');
      }
      if (err.message?.includes('Connection request reset')) {
        throw new Error('Connection request expired. Please try again.');
      }
      throw err;
    }
  };

  const handleSolanaWallet = async (wallet) => {
    let solanaProvider;

    if (wallet.id === 'phantom' && window.phantom?.solana) {
      solanaProvider = window.phantom.solana;
    } else if (wallet.id === 'solflare' && window.solflare) {
      solanaProvider = window.solflare;
    } else {
      throw new Error(`${wallet.name} not detected. Please install the extension.`);
    }

    try {
      const response = await solanaProvider.connect();
      const address = response.publicKey.toString();
      
      const handleDisconnectEvent = () => {
        handleDisconnect();
      };

      solanaProvider.on('disconnect', handleDisconnectEvent);
      eventListenersRef.current.push({
        provider: solanaProvider,
        event: 'disconnect',
        handler: handleDisconnectEvent
      });

      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', 'solana');
      localStorage.setItem('bumblebee_wallet_id', wallet.id);
      localStorage.setItem('bumblebee_wallet_name', wallet.name);

      const success = setConnection({
        address,
        walletType: 'solana',
        walletName: wallet.name,
        provider: solanaProvider
      });

      if (success) {
        closeModal();
      }
    } catch (err) {
      if (err.message?.includes('User rejected')) {
        throw new Error('Connection rejected by user');
      }
      throw err;
    }
  };

  const handleConnectionError = (err) => {
    console.error('Connection error:', err);
    
    if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('cancelled')) {
      setError('Connection was rejected by the user');
    } else if (err.message?.includes('not detected')) {
      setError('Wallet not detected. Please install the extension.');
    } else if (err.message?.includes('expired')) {
      setError('Connection request expired. Please try again.');
    } else {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    eventListenersRef.current.forEach(({ provider, event, handler }) => {
      try {
        provider?.removeListener?.(event, handler);
      } catch (err) {
        console.debug('Disconnect: Failed to remove listener', err);
      }
    });
    eventListenersRef.current = [];

    if (wcProviderRef.current) {
      try {
        wcProviderRef.current.disconnect();
      } catch (err) {
        console.debug('Disconnect: WalletConnect cleanup failed', err);
      }
      wcProviderRef.current = null;
    }

    localStorage.removeItem('bumblebee_connected');
    localStorage.removeItem('bumblebee_address');
    localStorage.removeItem('bumblebee_wallet_type');
    localStorage.removeItem('bumblebee_wallet_id');
    localStorage.removeItem('bumblebee_wallet_name');

    disconnect();
  };

  // ==========================================================================
  // PURCHASE LOGIC
  // ==========================================================================
  useEffect(() => {
    if (amount && !isNaN(parseFloat(amount))) {
      const rate = EXCHANGE_RATES[currency] || 1;
      const calculated = parseFloat(amount) / rate;
      setUsdtAmount(parseFloat(calculated.toFixed(2)));
    } else {
      setUsdtAmount(0);
    }
  }, [amount, currency]);

  const handleBuyNow = async () => {
    if (!isConnected || !amount || usdtAmount <= 0) {
      setError('Please connect wallet and enter a valid amount');
      return;
    }

    setIsBuying(true);
    setError('');

    try {
      const chainInfo = USDT_CONTRACTS[selectedChain];
      
      // Prepare transaction based on chain
      let transactionHash = '';
      
      if (selectedChain === 'tron' && window.tronWeb) {
        // Tron-specific transaction
        transactionHash = await sendTronTransaction(chainInfo, usdtAmount);
      } else if (selectedChain === 'solana') {
        // Solana-specific transaction
        transactionHash = await sendSolanaTransaction(chainInfo, usdtAmount);
      } else {
        // EVM chains transaction
        transactionHash = await sendEVMTransaction(chainInfo, usdtAmount);
      }

      // Save order to admin panel
      await sendToAdminPanel('usdt_purchase', {
        walletAddress: address,
        chain: chainInfo.name,
        currency: currency,
        currencyAmount: parseFloat(amount),
        usdtAmount: usdtAmount,
        transactionHash: transactionHash,
        timestamp: new Date().toISOString(),
        rate: EXCHANGE_RATES[currency]
      });

      // Show success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset form
      setAmount('');
      
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsBuying(false);
    }
  };

  const sendEVMTransaction = async (chainInfo, amount) => {
    if (!provider || !provider.request) {
      throw new Error('Wallet not connected');
    }

    try {
      // Switch chain if needed
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainInfo.chainId.toString(16)}` }],
      }).catch(async (switchError) => {
        if (switchError.code === 4902) {
          // Chain not added, request to add it
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainInfo.chainId.toString(16)}`,
              chainName: chainInfo.name,
              nativeCurrency: {
                name: chainInfo.symbol,
                symbol: chainInfo.symbol,
                decimals: 18
              },
              rpcUrls: [chainInfo.rpcUrl],
              blockExplorerUrls: ['https://etherscan.io']
            }]
          });
        }
      });

      // Send transaction
      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: chainInfo.contract,
          value: '0x0', // For token transfers
          data: '0x' // Add proper USDT transfer data here
        }]
      });

      return tx;
    } catch (err) {
      if (err.code === 4001) {
        throw new Error('Transaction rejected by user');
      }
      throw err;
    }
  };

  const sendTronTransaction = async (chainInfo, amount) => {
    if (!window.tronWeb) {
      throw new Error('Tron wallet not detected');
    }

    try {
      // Tron transaction logic
      const transaction = await window.tronWeb.transactionBuilder.sendTrx(
        chainInfo.contract,
        amount * 1000000, // Convert to sun
        address
      );
      
      const signedTx = await window.tronWeb.trx.sign(transaction);
      const result = await window.tronWeb.trx.sendRawTransaction(signedTx);
      
      return result.transaction.txID;
    } catch (err) {
      throw new Error(err.message || 'Tron transaction failed');
    }
  };

  const sendSolanaTransaction = async (chainInfo, amount) => {
    if (!provider || !provider.signTransaction) {
      throw new Error('Solana wallet not connected');
    }

    try {
      // Solana transaction logic
      // This would require @solana/web3.js in production
      throw new Error('Solana transactions coming soon');
    } catch (err) {
      throw new Error(err.message || 'Solana transaction failed');
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  const availableWallets = getAvailableWallets();
  const chainInfo = USDT_CONTRACTS[selectedChain];

  return (
    <div className="buy-usdt-page">
      {/* Background Elements */}
      <div className="background">
        {particles.map(p => (
          <div 
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`
            }}
          />
        ))}
        
        <div className="honeycomb-grid" />
        
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
      </div>

      {/* Header */}
      <header className="exchange-header">
        <div className="container">
          <div className="header-content">
            <div className="header-logo">
              <div className="logo-icon">🔄</div>
              <span className="logo-text">Bumblebee Exchange</span>
            </div>
            
            <div className="header-actions">
              {isConnected ? (
                <div className="wallet-badge">
                  <div className="wallet-status">
                    <div className="status-dot" />
                    <span className="wallet-name">{connectedWalletName}</span>
                  </div>
                  <span className="wallet-address">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <button onClick={handleDisconnect} className="disconnect-btn">
                    ✕
                  </button>
                </div>
              ) : (
                <button 
                  className="connect-wallet-btn"
                  onClick={() => setShowConnectModal(true)}
                >
                  <span className="btn-text">Connect Wallet</span>
                  <div className="btn-glow" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="exchange-main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="hero-badge-text">Instant Purchase · No KYC Required</span>
              </div>
              
              <h1 className="hero-title">
                Buy <span className="hero-highlight">USDT</span> Instantly
              </h1>
              
              <p className="hero-subtitle">
                Fast, secure, and multi-chain USDT purchases at competitive rates
                <br />
                <span className="hero-extra">No hidden fees · Best rates guaranteed</span>
              </p>
              
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="stat-number">2.5M+</div>
                  <div className="stat-label">Trusted Users</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">$4.8B+</div>
                  <div className="stat-label">Total Volume</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">99.9%</div>
                  <div className="stat-label">Success Rate</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">Support</div>
                </div>
              </div>
            </div>
          </section>

          {/* Purchase Card */}
          <section className="purchase-section">
            <div className="purchase-card">
              <div className="card-glow" />
              
              <div className="card-header">
                <div className="usdt-icon">💵</div>
                <div className="card-title">
                  <h2>Buy Tether (USDT)</h2>
                  <p className="card-subtitle">Stable · Fast · Multi-Chain</p>
                </div>
                <div className="live-rate">
                  <div className="rate-badge">
                    <span className="rate-label">Live Rate</span>
                    <span className="rate-value">1 USDT = ${(1/EXCHANGE_RATES.USD).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>
              
              <div className="card-content">
                {/* Chain Selector */}
                <div className="chain-selector">
                  <h3 className="selector-title">Select Network</h3>
                  <div className="chain-grid">
                    {Object.entries(USDT_CONTRACTS).map(([key, chain]) => (
                      <button
                        key={key}
                        className={`chain-option ${selectedChain === key ? 'active' : ''}`}
                        onClick={() => setSelectedChain(key)}
                      >
                        <div className="chain-icon">{chain.logo}</div>
                        <div className="chain-info">
                          <div className="chain-name">{chain.name}</div>
                          <div className="chain-symbol">{chain.symbol}</div>
                        </div>
                        {selectedChain === key && (
                          <div className="chain-selected">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Currency Input */}
                <div className="currency-input-section">
                  <div className="input-header">
                    <label className="input-label">You Pay</label>
                    <div className="currency-selector">
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="currency-dropdown"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="amount-input">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="amount-field"
                      min="0"
                      step="0.01"
                    />
                    <div className="currency-display">{currency}</div>
                  </div>
                </div>
                
                {/* USDT Output */}
                <div className="usdt-output">
                  <div className="output-label">You Receive</div>
                  <div className="output-value">
                    <span className="usdt-amount">{usdtAmount.toLocaleString()}</span>
                    <span className="usdt-symbol"> USDT</span>
                  </div>
                  <div className="output-details">
                    on <span className="chain-name">{chainInfo.name}</span>
                    {chainInfo.contract && (
                      <div className="contract-info">
                        Contract: {chainInfo.contract.slice(0, 12)}...{chainInfo.contract.slice(-6)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Wallet Status */}
                {!isConnected ? (
                  <button 
                    className="connect-to-buy-btn"
                    onClick={() => setShowConnectModal(true)}
                  >
                    <div className="btn-icon">🔗</div>
                    <div className="btn-text">Connect Wallet to Purchase</div>
                  </button>
                ) : (
                  <div className="connected-wallet-info">
                    <div className="wallet-display">
                      <div className="wallet-icon">👛</div>
                      <div className="wallet-details">
                        <div className="wallet-name">Connected: {connectedWalletName}</div>
                        <div className="wallet-address-sm">{address.slice(0, 8)}...{address.slice(-6)}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Buy Button */}
                <button
                  className={`buy-button ${!isConnected || !amount || isBuying ? 'disabled' : ''}`}
                  onClick={handleBuyNow}
                  disabled={!isConnected || !amount || isBuying}
                >
                  {isBuying ? (
                    <>
                      <div className="loading-spinner" />
                      Processing Transaction...
                    </>
                  ) : showSuccess ? (
                    <>
                      <div className="success-icon">✓</div>
                      Purchase Successful!
                    </>
                  ) : (
                    'Buy Now'
                  )}
                  <div className="button-glow" />
                </button>
                
                {error && (
                  <div className="purchase-error">
                    <div className="error-icon">⚠️</div>
                    <div className="error-text">{error}</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Trust Section */}
          <section className="trust-section">
            <h2 className="trust-title">Why Trust Our Platform?</h2>
            
            <div className="trust-grid">
              <div className="trust-card">
                <div className="trust-icon">🏛️</div>
                <h3 className="trust-card-title">Regulated Platform</h3>
                <p className="trust-card-description">
                  Fully compliant with international regulations and security standards
                </p>
              </div>
              
              <div className="trust-card">
                <div className="trust-icon">🛡️</div>
                <h3 className="trust-card-title">Multi-layer Security</h3>
                <p className="trust-card-description">
                  Enterprise-grade security with cold storage and insurance protection
                </p>
              </div>
              
              <div className="trust-card">
                <div className="trust-icon">⚡</div>
                <h3 className="trust-card-title">Instant Processing</h3>
                <p className="trust-card-description">
                  Transactions processed in seconds with real-time blockchain confirmation
                </p>
              </div>
              
              <div className="trust-card">
                <div className="trust-icon">👛</div>
                <h3 className="trust-card-title">Non-Custodial</h3>
                <p className="trust-card-description">
                  You control your private keys. We never hold your funds
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="exchange-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <div className="footer-logo-icon">🔄</div>
              <span className="footer-logo-text">Bumblebee Exchange</span>
            </div>
            <div className="footer-copyright">
              © 2024 Bumblebee Exchange · All Rights Reserved
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Terms of Service</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Support Center</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>API Documentation</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Status</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Blog</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Connect Wallet Modal */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal" ref={modalRef}>
            <div className="modal-header">
              <h3 className="modal-title">
                Connect Wallet to Purchase
              </h3>
              <button 
                className="modal-close"
                onClick={closeModal}
                disabled={isLoading}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              {currentWalletBrowser && (
                <div className="wallet-browser-notice">
                  <div className="notice-icon">🌐</div>
                  <div className="notice-content">
                    <div className="notice-title">Wallet Browser Detected</div>
                    <div className="notice-subtitle">
                      You can only connect to {currentWalletBrowser.name} in this browser
                    </div>
                  </div>
                </div>
              )}

              <div className="wallet-group">
                <h4 className="wallet-group-title">Available Wallets</h4>
                <div className="wallet-grid">
                  {availableWallets.map(wallet => (
                    <button
                      key={wallet.id}
                      className="wallet-option"
                      onClick={() => handleConnectWallet(wallet)}
                      disabled={isLoading}
                      style={{ '--wallet-color': wallet.color }}
                    >
                      <div className="wallet-option-icon">{wallet.icon}</div>
                      <div className="wallet-option-name">{wallet.name}</div>
                      {wallet.description && (
                        <div className="wallet-option-description">{wallet.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="modal-error">
                  <div className="modal-error-icon">⚠️</div>
                  <div className="modal-error-text">{error}</div>
                </div>
              )}
              
              <div className="modal-disclaimer">
                By connecting, you agree to our Terms of Service and Privacy Policy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
         STYLES - Premium Exchange UI
         ====================================================================== */}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        :root {
          --bg-primary: #0A0A0A;
          --bg-secondary: #111111;
          --bg-card: #1A1A1A;
          --accent-primary: #00D4AA;
          --accent-secondary: #0066FF;
          --accent-gradient: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          --text-primary: #FFFFFF;
          --text-secondary: #AAAAAA;
          --text-tertiary: #666666;
          --border-color: rgba(255, 255, 255, 0.1);
          --shadow-glow: 0 0 40px rgba(0, 212, 170, 0.3);
          --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
          --border-radius: 16px;
          --border-radius-lg: 24px;
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }
        
        .buy-usdt-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }
        
        /* Background Elements */
        .background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          overflow: hidden;
          background: linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #0A0A0A 100%);
        }
        
        .particle {
          position: absolute;
          background: var(--accent-primary);
          border-radius: 50%;
          filter: blur(1px);
          animation: float 15s infinite ease-in-out;
          pointer-events: none;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .honeycomb-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(90deg, rgba(0, 212, 170, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(0, 212, 170, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          opacity: 0.1;
          transform: perspective(800px) rotateX(60deg);
          transform-origin: center;
        }
        
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.1;
          pointer-events: none;
        }
        
        .orb-1 {
          width: 300px;
          height: 300px;
          background: var(--accent-primary);
          top: 10%;
          left: 10%;
          animation: pulse 8s infinite ease-in-out;
        }
        
        .orb-2 {
          width: 200px;
          height: 200px;
          background: var(--accent-secondary);
          top: 60%;
          right: 10%;
          animation: pulse 12s infinite ease-in-out 1s;
        }
        
        .orb-3 {
          width: 150px;
          height: 150px;
          background: #8B5CF6;
          bottom: 20%;
          left: 20%;
          animation: pulse 10s infinite ease-in-out 2s;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.15; }
        }
        
        /* Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        /* Header */
        .exchange-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 0;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .header-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo-icon {
          font-size: 24px;
          animation: pulse 2s infinite;
        }
        
        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .connect-wallet-btn {
          position: relative;
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 12px;
          padding: 12px 24px;
          color: var(--accent-primary);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          overflow: hidden;
          min-width: 140px;
        }
        
        .connect-wallet-btn:hover {
          background: rgba(0, 212, 170, 0.2);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }
        
        .btn-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--accent-primary), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
        }
        
        .connect-wallet-btn:hover .btn-glow {
          opacity: 0.2;
        }
        
        .wallet-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 10px 16px;
        }
        
        .wallet-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .wallet-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-primary);
          background: rgba(0, 212, 170, 0.1);
          padding: 2px 8px;
          border-radius: 8px;
        }
        
        .wallet-address {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .disconnect-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #EF4444;
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
          transition: all 0.2s;
          min-width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .disconnect-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #EF4444;
        }
        
        /* Main Content */
        .exchange-main {
          padding: 60px 0 100px;
        }
        
        /* Hero Section */
        .hero-section {
          text-align: center;
          margin-bottom: 60px;
        }
        
        .hero-badge {
          display: inline-block;
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 20px;
          padding: 10px 20px;
          margin-bottom: 30px;
        }
        
        .hero-badge-text {
          color: var(--accent-primary);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          margin-bottom: 20px;
          line-height: 1.1;
        }
        
        .hero-highlight {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-subtitle {
          font-size: 1.2rem;
          color: var(--text-secondary);
          margin-bottom: 40px;
          line-height: 1.6;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .hero-extra {
          color: var(--accent-primary);
          font-weight: 600;
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-top: 40px;
          flex-wrap: wrap;
        }
        
        .hero-stat {
          text-align: center;
          min-width: 120px;
        }
        
        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          line-height: 1;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Purchase Card */
        .purchase-section {
          max-width: 600px;
          margin: 0 auto 80px;
        }
        
        .purchase-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          padding: 40px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        
        .card-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, rgba(0, 212, 170, 0.1), transparent 70%);
          opacity: 0.3;
          pointer-events: none;
          z-index: -1;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .usdt-icon {
          font-size: 3rem;
          background: rgba(0, 212, 170, 0.1);
          border-radius: 16px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .card-title h2 {
          font-size: 2rem;
          margin-bottom: 4px;
        }
        
        .card-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .live-rate {
          margin-left: auto;
        }
        
        .rate-badge {
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 12px;
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .rate-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        
        .rate-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-primary);
        }
        
        .card-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        /* Chain Selector */
        .chain-selector {
          margin-bottom: 10px;
        }
        
        .selector-title {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
          font-weight: 600;
        }
        
        .chain-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
        
        .chain-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
          position: relative;
        }
        
        .chain-option:hover {
          border-color: rgba(0, 212, 170, 0.3);
          transform: translateY(-2px);
        }
        
        .chain-option.active {
          background: rgba(0, 212, 170, 0.1);
          border-color: var(--accent-primary);
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.2);
        }
        
        .chain-icon {
          font-size: 1.5rem;
        }
        
        .chain-info {
          flex: 1;
        }
        
        .chain-name {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .chain-symbol {
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .chain-selected {
          color: var(--accent-primary);
          font-weight: bold;
        }
        
        /* Currency Input */
        .currency-input-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 20px;
        }
        
        .input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .input-label {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        
        .currency-selector {
          position: relative;
        }
        
        .currency-dropdown {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          padding: 8px 32px 8px 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          appearance: none;
          min-width: 100px;
        }
        
        .amount-input {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .amount-field {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 2.5rem;
          font-weight: 700;
          outline: none;
          width: 100%;
        }
        
        .amount-field::placeholder {
          color: var(--text-tertiary);
        }
        
        .currency-display {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent-primary);
          min-width: 80px;
          text-align: right;
        }
        
        /* USDT Output */
        .usdt-output {
          background: rgba(0, 212, 170, 0.05);
          border: 1px solid rgba(0, 212, 170, 0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
        }
        
        .output-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        
        .output-value {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 12px;
          line-height: 1;
        }
        
        .usdt-amount {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .usdt-symbol {
          color: var(--text-primary);
        }
        
        .output-details {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .chain-name {
          color: var(--accent-primary);
          font-weight: 600;
        }
        
        .contract-info {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
        }
        
        /* Connect to Buy Button */
        .connect-to-buy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 20px;
          background: rgba(0, 212, 170, 0.1);
          border: 2px dashed rgba(0, 212, 170, 0.3);
          border-radius: 16px;
          color: var(--accent-primary);
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .connect-to-buy-btn:hover {
          background: rgba(0, 212, 170, 0.2);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }
        
        .btn-icon {
          font-size: 1.5rem;
        }
        
        /* Connected Wallet Info */
        .connected-wallet-info {
          background: rgba(0, 212, 170, 0.05);
          border: 1px solid rgba(0, 212, 170, 0.2);
          border-radius: 16px;
          padding: 16px;
        }
        
        .wallet-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .wallet-icon {
          font-size: 1.5rem;
        }
        
        .wallet-details {
          flex: 1;
        }
        
        .wallet-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-primary);
          margin-bottom: 4px;
        }
        
        .wallet-address-sm {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        /* Buy Button */
        .buy-button {
          position: relative;
          width: 100%;
          padding: 24px;
          background: var(--accent-gradient);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .buy-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }
        
        .buy-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .button-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: 16px;
        }
        
        .buy-button:hover:not(.disabled) .button-glow {
          opacity: 0.3;
        }
        
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .success-icon {
          font-size: 1.5rem;
          animation: scaleIn 0.3s ease-out;
        }
        
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        
        /* Error Display */
        .purchase-error {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px;
          animation: shake 0.5s;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .error-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .error-text {
          color: #EF4444;
          font-size: 0.95rem;
          flex: 1;
          line-height: 1.4;
        }
        
        /* Trust Section */
        .trust-section {
          margin-top: 80px;
        }
        
        .trust-title {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 40px;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }
        
        .trust-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 30px;
          text-align: center;
          transition: all 0.3s;
        }
        
        .trust-card:hover {
          border-color: rgba(0, 212, 170, 0.3);
          transform: translateY(-5px);
          box-shadow: var(--shadow-glow);
        }
        
        .trust-icon {
          font-size: 2.5rem;
          margin-bottom: 20px;
        }
        
        .trust-card-title {
          font-size: 1.2rem;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        
        .trust-card-description {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        
        /* Footer */
        .exchange-footer {
          padding: 60px 0 40px;
          border-top: 1px solid var(--border-color);
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(10px);
        }
        
        .footer-content {
          text-align: center;
        }
        
        .footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .footer-logo-icon {
          font-size: 1.5rem;
        }
        
        .footer-logo-text {
          font-size: 1.2rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .footer-copyright {
          color: var(--text-tertiary);
          margin-bottom: 30px;
          font-size: 14px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 24px;
          margin-top: 20px;
        }
        
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.3s;
          position: relative;
          padding: 4px 0;
        }
        
        .footer-link:hover {
          color: var(--accent-primary);
        }
        
        .footer-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--accent-primary);
          transform: scaleX(0);
          transition: transform 0.3s;
        }
        
        .footer-link:hover::after {
          transform: scaleX(1);
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.3s ease-out;
          padding: 20px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal {
          background: var(--bg-card);
          border-radius: var(--border-radius-lg);
          width: 100%;
          max-width: 500px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-glow);
          animation: modalSlide 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        @keyframes modalSlide {
          from { transform: translateY(50px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 30px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-title {
          font-size: 1.5rem;
          color: var(--accent-primary);
          font-weight: 600;
          margin: 0;
        }
        
        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-close:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          color: #EF4444;
        }
        
        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .modal-content {
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .wallet-browser-notice {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 12px;
          padding: 16px;
        }
        
        .notice-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .notice-content {
          flex: 1;
          text-align: left;
        }
        
        .notice-title {
          color: var(--accent-primary);
          font-weight: 600;
          margin-bottom: 4px;
          font-size: 0.95rem;
        }
        
        .notice-subtitle {
          color: var(--text-secondary);
          font-size: 0.85rem;
          line-height: 1.4;
        }
        
        .wallet-group {
          margin-bottom: 5px;
        }
        
        .wallet-group-title {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
          font-weight: 600;
        }
        
        .wallet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .wallet-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px 15px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s;
          min-height: 100px;
          position: relative;
          overflow: hidden;
        }
        
        .wallet-option:hover:not(:disabled) {
          border-color: var(--wallet-color, var(--accent-primary));
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        
        .wallet-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wallet-option::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--wallet-color, var(--accent-primary)), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
        }
        
        .wallet-option:hover:not(:disabled)::before {
          opacity: 0.2;
        }
        
        .wallet-option-icon {
          font-size: 2rem;
          margin-bottom: 5px;
        }
        
        .wallet-option-name {
          font-weight: 600;
          font-size: 14px;
        }
        
        .wallet-option-description {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.8;
        }
        
        .modal-error {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px;
          animation: shake 0.5s;
        }
        
        .modal-error-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .modal-error-text {
          color: #EF4444;
          font-size: 0.9rem;
          flex: 1;
          line-height: 1.4;
        }
        
        .modal-disclaimer {
          color: var(--text-tertiary);
          font-size: 0.8rem;
          text-align: center;
          line-height: 1.5;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .hero-stats {
            gap: 20px;
          }
          
          .stat-number {
            font-size: 2rem;
          }
          
          .purchase-card {
            padding: 30px 20px;
          }
          
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
          
          .live-rate {
            margin-left: 0;
            width: 100%;
          }
          
          .chain-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          }
          
          .amount-field {
            font-size: 2rem;
          }
          
          .currency-display {
            font-size: 1.5rem;
          }
          
          .output-value {
            font-size: 2.5rem;
          }
          
          .trust-grid {
            grid-template-columns: 1fr;
          }
          
          .header-logo .logo-text {
            font-size: 1.2rem;
          }
          
          .connect-wallet-btn {
            padding: 10px 16px;
            font-size: 14px;
            min-width: 120px;
          }
          
          .wallet-badge {
            padding: 8px 12px;
            gap: 8px;
          }
          
          .wallet-address {
            font-size: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
          }
          
          .purchase-card {
            padding: 20px 16px;
          }
          
          .card-header {
            margin-bottom: 30px;
          }
          
          .usdt-icon {
            font-size: 2rem;
            padding: 12px;
          }
          
          .card-title h2 {
            font-size: 1.5rem;
          }
          
          .chain-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .wallet-grid {
            grid-template-columns: 1fr;
          }
          
          .footer-links {
            flex-direction: column;
            gap: 16px;
          }
          
          .hero-stats {
            flex-direction: column;
            align-items: center;
          }
          
          .hero-stat {
            width: 100%;
            max-width: 200px;
          }
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: var(--bg-primary);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: var(--accent-primary);
        }
        
        /* Selection */
        ::selection {
          background: rgba(0, 212, 170, 0.3);
          color: white;
        }
      `}</style>
    </div>
  );
}

export default BuyUsdt;
