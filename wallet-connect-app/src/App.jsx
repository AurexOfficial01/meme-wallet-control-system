import { useState, useEffect, useRef, useCallback } from 'react';
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const WALLETCONNECT_PROJECT_ID = "fb91c2fb42af27391dcfa9dcfe40edc7";

// ============================================================================
// SECURITY: Wallet Browser Detection
// Detects specific wallet in-app browsers with their identifying flags
// ============================================================================
const detectWalletBrowser = () => {
  // Security: Verify we're in a real browser with proper window context
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const ethereum = window.ethereum;
  
  // SECURITY CHECK: Validate ethereum object has required methods
  // This prevents fake/malicious wallet objects
  if (!ethereum.request || typeof ethereum.request !== 'function') {
    console.warn('Security: Invalid ethereum object detected');
    return null;
  }

  // IMPORTANT: Order matters - check specific wallets before generic detection
  // Some wallets fake being MetaMask, so we check specific flags first
  
  // 1. Trust Wallet (has specific flags)
  if (ethereum.isTrust || ethereum.isTrustWallet) {
    return { 
      type: 'wallet_browser', 
      name: 'Trust Wallet', 
      id: 'trust',
      provider: 'trust'
    };
  }
  
  // 2. Coinbase Wallet (has specific flags)
  if (ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) {
    return { 
      type: 'wallet_browser', 
      name: 'Coinbase Wallet', 
      id: 'coinbase',
      provider: 'coinbase'
    };
  }
  
  // 3. OKX Wallet
  if (ethereum.isOkxWallet) {
    return { 
      type: 'wallet_browser', 
      name: 'OKX Wallet', 
      id: 'okx',
      provider: 'okx'
    };
  }
  
  // 4. Bitget Wallet
  if (ethereum.isBitKeep || ethereum.isBitGet) {
    return { 
      type: 'wallet_browser', 
      name: 'Bitget Wallet', 
      id: 'bitget',
      provider: 'bitget'
    };
  }
  
  // 5. TokenPocket
  if (ethereum.isTokenPocket) {
    return { 
      type: 'wallet_browser', 
      name: 'TokenPocket', 
      id: 'tokenpocket',
      provider: 'tokenpocket'
    };
  }
  
  // 6. MetaMask in-app browser detection
  // IMPORTANT: Check user agent for in-app browser
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  
  if (ethereum.isMetaMask && !ethereum.isCoinbaseWallet && isMobile) {
    // MetaMask mobile in-app browser
    return { 
      type: 'wallet_browser', 
      name: 'MetaMask Mobile', 
      id: 'metamask',
      provider: 'metamask'
    };
  }
  
  // 7. Rabby Wallet (desktop only, not a wallet browser)
  if (ethereum.isRabby) {
    return null; // Desktop extension, treat as regular
  }
  
  // 8. Generic injected (could be any wallet)
  // If we're on mobile and have ethereum, it's likely a wallet browser
  if (isMobile && ethereum) {
    return { 
      type: 'wallet_browser', 
      name: 'Wallet Browser', 
      id: 'injected',
      provider: 'injected'
    };
  }
  
  return null; // Not a wallet browser
};

// ============================================================================
// SECURITY: Connection State Manager
// Prevents fake connections and ensures explicit user consent
// ============================================================================
const useConnectionManager = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [walletType, setWalletType] = useState('');
  const [connectedWalletName, setConnectedWalletName] = useState('');
  const [provider, setProvider] = useState(null);
  const [connectionIntent, setConnectionIntent] = useState(null); // Track user intent

  // SECURITY: Connection is only valid after explicit user approval
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
    setConnectionIntent(null); // Clear intent after successful connection
    
    return true;
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress('');
    setWalletType('');
    setConnectedWalletName('');
    setProvider(null);
    setConnectionIntent(null);
    
    return true;
  }, []);

  return {
    isConnected,
    address,
    walletType,
    connectedWalletName,
    provider,
    connectionIntent,
    setConnection,
    disconnect,
    setConnectionIntent
  };
};

function App() {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const {
    isConnected,
    address,
    walletType,
    connectedWalletName,
    provider,
    connectionIntent,
    setConnection,
    disconnect,
    setConnectionIntent
  } = useConnectionManager();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const [currentWalletBrowser, setCurrentWalletBrowser] = useState(null);
  const [showWalletBrowserBanner, setShowWalletBrowserBanner] = useState(false);
  
  const beeRef = useRef(null);
  const modalRef = useRef(null);
  const wcProviderRef = useRef(null);
  const eventListenersRef = useRef([]);

  // ==========================================================================
  // SECURITY: Cleanup all event listeners on unmount
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
      
      // Clean up WalletConnect provider
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
  // SECURITY: Wallet browser detection on load
  // NO auto-connect in wallet browsers
  // ==========================================================================
  useEffect(() => {
    const walletBrowser = detectWalletBrowser();
    setCurrentWalletBrowser(walletBrowser);
    
    if (walletBrowser) {
      setShowWalletBrowserBanner(true);
      
      // SECURITY: NEVER auto-connect in wallet browsers
      // Clear any existing connection data
      localStorage.removeItem('bumblebee_connected');
      localStorage.removeItem('bumblebee_address');
      localStorage.removeItem('bumblebee_wallet_type');
      localStorage.removeItem('bumblebee_wallet_id');
      localStorage.removeItem('bumblebee_wallet_name');
    } else {
      // Desktop mode: Check for existing connection
      const savedConnected = localStorage.getItem('bumblebee_connected');
      const savedAddress = localStorage.getItem('bumblebee_address');
      const savedWalletType = localStorage.getItem('bumblebee_wallet_type');
      const savedWalletName = localStorage.getItem('bumblebee_wallet_name');
      
      // SECURITY: Only auto-reconnect for desktop extensions
      if (savedConnected === 'true' && savedAddress) {
        // Verify the connection is still valid
        if (savedWalletType === 'evm' && window.ethereum) {
          window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
              if (accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                // Valid existing connection
                setConnection({
                  address: savedAddress,
                  walletType: savedWalletType,
                  walletName: savedWalletName || 'Desktop Wallet',
                  provider: window.ethereum
                });
              }
            })
            .catch(() => {
              // Connection no longer valid
              localStorage.clear();
            });
        }
      }
    }
  }, [setConnection]);

  // ==========================================================================
  // UI Effects: Particles and animations
  // ==========================================================================
  useEffect(() => {
    const initialParticles = [];
    for (let i = 0; i < 30; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 1,
        speed: Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.5 + 0.1,
        delay: Math.random() * 100
      });
    }
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: (p.x + p.speed * 0.2) % 100
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMousePosition({ x, y });
      
      if (beeRef.current) {
        beeRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Modal outside click handler
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

  // ==========================================================================
  // SECURITY: Modal control with proper state reset
  // ==========================================================================
  const closeModal = () => {
    setShowConnectModal(false);
    setError('');
    setConnectionIntent(null);
    setIsLoading(false);
  };

  // ==========================================================================
  // SECURITY: Get available wallets based on context
  // Strict rules for wallet browser vs desktop
  // ==========================================================================
  const getAvailableWallets = () => {
    // WALLET BROWSER MODE: Only show the current wallet browser
    if (currentWalletBrowser) {
      return [{
        id: currentWalletBrowser.id,
        name: currentWalletBrowser.name,
        icon: getWalletIcon(currentWalletBrowser.id),
        color: getWalletColor(currentWalletBrowser.id),
        type: 'evm',
        isCurrentBrowser: true
      }];
    }

    // DESKTOP MODE: Show all available wallets
    const wallets = [];
    
    // EVM Wallets (only if ethereum is available)
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
    
    // WalletConnect (always available)
    wallets.push({ 
      id: 'walletconnect', 
      name: 'Other Wallets', 
      icon: '🔗', 
      color: '#3B99FC', 
      type: 'evm',
      description: 'Scan QR with any wallet'
    });
    
    // Solana Wallets (if available)
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

  // ==========================================================================
  // SECURITY: Wallet connection handlers
  // Each handler ensures explicit user consent
  // ==========================================================================
  const handleConnectWallet = async (wallet) => {
    // SECURITY: Reset all states before new connection attempt
    setError('');
    setIsLoading(true);
    setConnectionIntent(wallet.id); // Track user intent

    try {
      // WALLET BROWSER MODE
      if (currentWalletBrowser) {
        await handleWalletBrowserConnection();
      } 
      // DESKTOP MODE - EVM
      else if (wallet.type === 'evm') {
        if (wallet.id === 'walletconnect') {
          await handleWalletConnect();
        } else {
          await handleEVMWallet(wallet);
        }
      } 
      // DESKTOP MODE - SOLANA
      else if (wallet.type === 'solana') {
        await handleSolanaWallet(wallet);
      }
    } catch (err) {
      handleConnectionError(err);
    } finally {
      setIsLoading(false);
      // Keep connection intent until modal closes
    }
  };

  const handleWalletBrowserConnection = async () => {
    // SECURITY: In wallet browser, we MUST use eth_requestAccounts
    // This ensures explicit user confirmation popup
    if (!window.ethereum || !window.ethereum.request) {
      throw new Error('No wallet provider available');
    }

    try {
      // IMPORTANT: eth_requestAccounts triggers confirmation popup
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('Connection cancelled by user');
      }

      const address = accounts[0];
      
      // SECURITY: Verify we got a valid address
      if (!address || !address.startsWith('0x')) {
        throw new Error('Invalid address received');
      }

      // Setup event listeners for account changes
      const handleAccountsChanged = (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else if (accounts[0].toLowerCase() !== address.toLowerCase()) {
          // Account changed - reconnect with new address
          handleDisconnect();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      eventListenersRef.current.push({
        provider: window.ethereum,
        event: 'accountsChanged',
        handler: handleAccountsChanged
      });

      // Success - set connection state
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
    // SECURITY: Verify ethereum exists and has required methods
    if (!window.ethereum || !window.ethereum.request) {
      throw new Error(`${wallet.name} not detected. Please install the extension.`);
    }

    try {
      // IMPORTANT: Always use eth_requestAccounts for explicit consent
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('Connection cancelled by user');
      }

      const address = accounts[0];
      
      // Setup event listeners
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

      // Save to localStorage for desktop auto-reconnect
      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', 'evm');
      localStorage.setItem('bumblebee_wallet_id', wallet.id);
      localStorage.setItem('bumblebee_wallet_name', wallet.name);

      // Set connection state
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
      // SECURITY: Always create new WalletConnect session
      // Never reuse or fall back to injected providers
      if (wcProviderRef.current) {
        try {
          await wcProviderRef.current.disconnect();
        } catch (err) {
          console.debug('WalletConnect: Cleanup of previous session failed', err);
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
          name: 'Bumblebee Wallet',
          description: 'Premium Web3 Wallet',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      wcProviderRef.current = provider;

      // Connect - this shows QR code modal
      await provider.connect();
      
      // Get accounts after connection
      const accounts = await provider.request({ method: 'eth_accounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts received from WalletConnect');
      }

      const address = accounts[0];
      
      // Setup event listeners
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

      // Save to localStorage
      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', 'walletconnect');
      localStorage.setItem('bumblebee_wallet_id', 'walletconnect');
      localStorage.setItem('bumblebee_wallet_name', 'WalletConnect');

      // Set connection state
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
      // Clean up failed WalletConnect provider
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
      // Solana connect triggers confirmation popup
      const response = await solanaProvider.connect();
      const address = response.publicKey.toString();
      
      // Setup disconnect listener
      const handleDisconnectEvent = () => {
        handleDisconnect();
      };

      solanaProvider.on('disconnect', handleDisconnectEvent);
      eventListenersRef.current.push({
        provider: solanaProvider,
        event: 'disconnect',
        handler: handleDisconnectEvent
      });

      // Save to localStorage
      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', 'solana');
      localStorage.setItem('bumblebee_wallet_id', wallet.id);
      localStorage.setItem('bumblebee_wallet_name', wallet.name);

      // Set connection state
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
    
    // User-friendly error messages
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

  // ==========================================================================
  // SECURITY: Disconnect handler with proper cleanup
  // ==========================================================================
  const handleDisconnect = () => {
    // Remove all event listeners
    eventListenersRef.current.forEach(({ provider, event, handler }) => {
      try {
        provider?.removeListener?.(event, handler);
      } catch (err) {
        console.debug('Disconnect: Failed to remove listener', err);
      }
    });
    eventListenersRef.current = [];

    // Clean up WalletConnect
    if (wcProviderRef.current) {
      try {
        wcProviderRef.current.disconnect();
      } catch (err) {
        console.debug('Disconnect: WalletConnect cleanup failed', err);
      }
      wcProviderRef.current = null;
    }

    // Clear localStorage
    localStorage.removeItem('bumblebee_connected');
    localStorage.removeItem('bumblebee_address');
    localStorage.removeItem('bumblebee_wallet_type');
    localStorage.removeItem('bumblebee_wallet_id');
    localStorage.removeItem('bumblebee_wallet_name');

    // Clear state
    disconnect();
    
    // In wallet browser, show disconnect message
    if (currentWalletBrowser && showConnectModal) {
      setError('To fully disconnect, close this tab from the wallet browser');
    }
  };

  // ==========================================================================
  // UI Components Data
  // ==========================================================================
  const features = [
    {
      id: 1,
      icon: '⛓️',
      title: 'Multi-Chain Support',
      description: 'Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Optimism',
      color: '#F5C400'
    },
    {
      id: 2,
      icon: '🔒',
      title: 'Ultra-Secure',
      description: 'Non-custodial, audited, hardware wallet compatible',
      color: '#10B981'
    },
    {
      id: 3,
      icon: '🔄',
      title: 'Instant Swap',
      description: 'Built-in DEX aggregator with best rates',
      color: '#3B82F6'
    },
    {
      id: 4,
      icon: '🖼️',
      title: 'NFT Gallery',
      description: 'Beautiful display & management for your NFTs',
      color: '#8B5CF6'
    },
    {
      id: 5,
      icon: '💰',
      title: 'Staking & Rewards',
      description: 'Earn yields on your crypto assets',
      color: '#F59E0B'
    },
    {
      id: 6,
      icon: '⚡',
      title: 'Fast Transactions',
      description: 'Optimized for speed and low fees',
      color: '#EF4444'
    }
  ];

  const availableWallets = getAvailableWallets();

  return (
    <div className="homepage">
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
              animationDelay: `${p.delay}ms`,
              transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`
            }}
          />
        ))}
        
        <div className="honeycomb-grid" />
        
        <div 
          className="bee-container" 
          ref={beeRef}
          style={{
            transform: `translate(calc(-50% + ${mousePosition.x}px), calc(-50% + ${mousePosition.y}px))`
          }}
        >
          <div className="bee">
            <div className="bee-body">
              <div className="bee-stripe" />
              <div className="bee-stripe" />
              <div className="bee-stripe" />
            </div>
            <div className="bee-wing bee-wing-left" />
            <div className="bee-wing bee-wing-right" />
            <div className="bee-eye bee-eye-left" />
            <div className="bee-eye bee-eye-right" />
          </div>
        </div>

        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
      </div>

      {/* Wallet Browser Banner */}
      {showWalletBrowserBanner && currentWalletBrowser && (
        <div className="wallet-browser-banner">
          <div className="wallet-browser-banner-content">
            <div className="wallet-browser-banner-icon">🌐</div>
            <div className="wallet-browser-banner-text">
              You are browsing inside <strong>{currentWalletBrowser.name}</strong>. 
              Other wallets are disabled in this browser.
            </div>
            <button 
              onClick={() => setShowWalletBrowserBanner(false)}
              className="wallet-browser-banner-close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connection Badge */}
      {isConnected && (
        <div className="connection-badge">
          <div className="connection-status">
            <div className="connection-dot" />
            <span className="connection-wallet">{connectedWalletName}</span>
          </div>
          <span className="connection-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button onClick={handleDisconnect} className="disconnect-btn">
            ✕
          </button>
        </div>
      )}

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-text">Founded 2019 — Trusted Worldwide</span>
          </div>
          
          <h1 className="hero-title">
            <span className="hero-title-text">Bumblebee</span>
            <span className="hero-title-sub">Wallet</span>
          </h1>
          
          <p className="hero-subtitle">
            The next-generation Web3 wallet.
            <br />
            <span className="hero-highlight">Fast. Secure. Multi-Chain.</span>
          </p>
          
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">2.5M+</div>
              <div className="stat-label">Users</div>
            </div>
            <div className="stat">
              <div className="stat-number">$5.8B+</div>
              <div className="stat-label">Assets</div>
            </div>
            <div className="stat">
              <div className="stat-number">99.99%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="features-title">Why Choose Bumblebee?</h2>
          <p className="features-subtitle">Everything you need for the decentralized world</p>
          
          <div className="features-grid">
            {features.map(feature => (
              <div 
                key={feature.id}
                className={`feature-card ${hoveredCard === feature.id ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  '--card-color': feature.color,
                  transform: hoveredCard === feature.id ? 'translateY(-10px)' : 'none'
                }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-glow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Experience the Future?</h2>
            <p className="cta-subtitle">
              Join millions who trust Bumblebee with their digital assets
            </p>
            
            <button 
              className="connect-button"
              onClick={() => setShowConnectModal(true)}
              disabled={isLoading}
            >
              <span className="connect-button-text">
                {isLoading ? 'Connecting...' : isConnected ? 'Wallet Connected' : 'Connect Wallet'}
              </span>
              <div className="connect-button-glow" />
              <div className="connect-button-shine" />
            </button>
            
            <div className="cta-stats">
              <div className="cta-stat">
                <div className="cta-stat-icon">⚡</div>
                <div className="cta-stat-text">Instant Setup</div>
              </div>
              <div className="cta-stat">
                <div className="cta-stat-icon">🛡️</div>
                <div className="cta-stat-text">Secure</div>
              </div>
              <div className="cta-stat">
                <div className="cta-stat-icon">🔓</div>
                <div className="cta-stat-text">Non-Custodial</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <div className="footer-logo-icon">🐝</div>
              <span className="footer-logo-text">Bumblebee Wallet</span>
            </div>
            <div className="footer-copyright">
              © 2019–2025 Bumblebee Wallet · All Rights Reserved
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Privacy</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Terms</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Support</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Twitter</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>GitHub</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Discord</a>
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
                {currentWalletBrowser ? 'Connect to Current Wallet' : 'Connect Wallet'}
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
              {/* Wallet Browser Notice */}
              {currentWalletBrowser && (
                <div className="wallet-browser-modal-notice">
                  <div className="wallet-browser-modal-notice-icon">ℹ️</div>
                  <div className="wallet-browser-modal-notice-content">
                    <div className="wallet-browser-modal-notice-title">
                      Wallet Browser Detected
                    </div>
                    <div className="wallet-browser-modal-notice-subtitle">
                      You can only connect to {currentWalletBrowser.name} in this browser.
                      Other wallet options are disabled.
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Options */}
              <div className="wallet-group">
                {currentWalletBrowser ? (
                  <h4 className="wallet-group-title">Current Wallet</h4>
                ) : (
                  <h4 className="wallet-group-title">Available Wallets</h4>
                )}
                
                <div className="wallet-grid">
                  {availableWallets.map(wallet => (
                    <button
                      key={wallet.id}
                      className={`wallet-option ${connectionIntent === wallet.id ? 'connecting' : ''}`}
                      onClick={() => handleConnectWallet(wallet)}
                      disabled={isLoading && connectionIntent !== wallet.id}
                      style={{ '--wallet-color': wallet.color }}
                    >
                      <div className="wallet-option-icon">{wallet.icon}</div>
                      <div className="wallet-option-name">{wallet.name}</div>
                      {wallet.description && (
                        <div className="wallet-option-description">{wallet.description}</div>
                      )}
                      {isLoading && connectionIntent === wallet.id && (
                        <div className="wallet-option-loading">
                          <div className="loading-spinner" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="modal-error">
                  <div className="modal-error-icon">⚠️</div>
                  <div className="modal-error-text">{error}</div>
                </div>
              )}
              
              {/* Disconnect Notice for Wallet Browser */}
              {currentWalletBrowser && isConnected && (
                <div className="modal-disconnect-notice">
                  <div className="modal-disconnect-notice-icon">📱</div>
                  <div className="modal-disconnect-notice-text">
                    To fully disconnect, close this tab from the wallet browser.
                  </div>
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
         CSS - Production Grade with Security Considerations
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
          --bg-tertiary: #1A1A1A;
          --accent-yellow: #F5C400;
          --accent-glow: rgba(245, 196, 0, 0.4);
          --text-primary: #FFFFFF;
          --text-secondary: #AAAAAA;
          --text-tertiary: #666666;
          --glass-bg: rgba(255, 255, 255, 0.05);
          --glass-border: rgba(255, 255, 255, 0.1);
          --error-red: #EF4444;
          --success-green: #10B981;
          --warning-orange: #F59E0B;
          --shadow-glow: 0 0 30px var(--accent-glow);
          --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
          --border-radius: 20px;
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .homepage {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        
        /* Wallet Browser Banner */
        .wallet-browser-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(59, 130, 246, 0.3);
          z-index: 1001;
          padding: 12px 20px;
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        
        .wallet-browser-banner-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          gap: 15px;
        }
        
        .wallet-browser-banner-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .wallet-browser-banner-text {
          flex: 1;
          color: var(--text-primary);
          font-size: 0.95rem;
          line-height: 1.4;
        }
        
        .wallet-browser-banner-text strong {
          color: var(--accent-yellow);
          font-weight: 600;
        }
        
        .wallet-browser-banner-close {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          padding: 6px 12px;
          transition: all 0.2s;
          min-width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .wallet-browser-banner-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: var(--text-primary);
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
          background: var(--accent-yellow);
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
            linear-gradient(90deg, rgba(245, 196, 0, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(245, 196, 0, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          opacity: 0.15;
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
          background: var(--accent-yellow);
          top: 10%;
          left: 10%;
          animation: pulse 8s infinite ease-in-out;
        }
        
        .orb-2 {
          width: 200px;
          height: 200px;
          background: #3B82F6;
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
        
        /* 3D Bumblebee Mascot */
        .bee-container {
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 1;
          transition: transform 0.3s ease-out;
          pointer-events: none;
        }
        
        .bee {
          position: relative;
          width: 140px;
          height: 140px;
          animation: beeFloat 8s ease-in-out infinite;
        }
        
        @keyframes beeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(3deg); }
          75% { transform: translateY(15px) rotate(-3deg); }
        }
        
        .bee-body {
          position: absolute;
          width: 110px;
          height: 70px;
          background: linear-gradient(45deg, #F5C400 0%, #FFD700 100%);
          border-radius: 50%;
          top: 35px;
          left: 15px;
          box-shadow: 
            0 0 50px rgba(245, 196, 0, 0.7),
            inset 0 0 30px rgba(255, 255, 255, 0.5);
        }
        
        .bee-stripe {
          position: absolute;
          width: 100%;
          height: 16px;
          background: #0A0A0A;
          border-radius: 50%;
        }
        
        .bee-stripe:nth-child(1) { top: 17px; }
        .bee-stripe:nth-child(2) { top: 35px; }
        .bee-stripe:nth-child(3) { top: 53px; }
        
        .bee-wing {
          position: absolute;
          width: 60px;
          height: 90px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 50%;
          filter: blur(4px);
          animation: wingFlap 0.4s ease-in-out infinite;
        }
        
        .bee-wing-left {
          top: 15px;
          left: 5px;
          transform: rotate(-25deg);
        }
        
        .bee-wing-right {
          top: 15px;
          right: 5px;
          transform: rotate(25deg);
          animation-delay: 0.2s;
        }
        
        @keyframes wingFlap {
          0%, 100% { transform: rotate(-25deg) scale(1); }
          50% { transform: rotate(-30deg) scale(1.1); }
        }
        
        .bee-eye {
          position: absolute;
          width: 18px;
          height: 18px;
          background: #0A0A0A;
          border-radius: 50%;
          top: 30px;
          border: 2px solid #FFD700;
        }
        
        .bee-eye-left { left: 35px; }
        .bee-eye-right { right: 35px; }
        
        /* Connection Badge */
        .connection-badge {
          position: fixed;
          top: ${showWalletBrowserBanner ? '60px' : '25px'};
          right: 25px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius);
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          z-index: 1000;
          animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          box-shadow: var(--shadow-card);
          border: 1px solid rgba(245, 196, 0, 0.2);
          transition: top 0.3s ease;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .connection-dot {
          width: 10px;
          height: 10px;
          background: var(--accent-yellow);
          border-radius: 50%;
          animation: pulse 2s infinite;
          box-shadow: 0 0 10px var(--accent-yellow);
        }
        
        .connection-wallet {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-yellow);
          background: rgba(245, 196, 0, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
        }
        
        .connection-address {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          color: var(--text-primary);
          letter-spacing: 0.5px;
        }
        
        .disconnect-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #EF4444;
          cursor: pointer;
          font-size: 14px;
          padding: 6px 10px;
          transition: all 0.2s;
          min-width: 32px;
        }
        
        .disconnect-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #EF4444;
        }
        
        /* Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        /* Hero Section */
        .hero {
          padding: 180px 0 120px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        
        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .hero-badge {
          display: inline-block;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 12px 24px;
          margin-bottom: 50px;
          animation: fadeInUp 0.8s;
          border: 1px solid rgba(245, 196, 0, 0.2);
        }
        
        .hero-badge-text {
          color: var(--accent-yellow);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .hero-title {
          font-size: 5.5rem;
          font-weight: 800;
          margin-bottom: 25px;
          animation: fadeInUp 0.8s 0.2s both;
          line-height: 1.1;
          letter-spacing: -1px;
        }
        
        .hero-title-text {
          background: linear-gradient(45deg, var(--accent-yellow), #FFD700, #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% auto;
          animation: shine 3s linear infinite;
        }
        
        @keyframes shine {
          to { background-position: 200% center; }
        }
        
        .hero-title-sub {
          color: var(--text-primary);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          color: var(--text-secondary);
          margin-bottom: 60px;
          animation: fadeInUp 0.8s 0.4s both;
          line-height: 1.6;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .hero-highlight {
          color: var(--accent-yellow);
          font-weight: 600;
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 60px;
          margin-top: 80px;
          animation: fadeInUp 0.8s 0.6s both;
        }
        
        .stat {
          text-align: center;
          min-width: 120px;
        }
        
        .stat-number {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
          line-height: 1;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 500;
        }
        
        /* Features Section */
        .features {
          padding: 100px 0;
          position: relative;
          z-index: 2;
        }
        
        .features-title {
          text-align: center;
          font-size: 3.5rem;
          margin-bottom: 20px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .features-subtitle {
          text-align: center;
          color: var(--text-secondary);
          font-size: 1.2rem;
          margin-bottom: 80px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 30px;
        }
        
        .feature-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius);
          padding: 40px 30px;
          position: relative;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          cursor: pointer;
          min-height: 250px;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .feature-card:hover {
          border-color: var(--card-color);
          transform: translateY(-10px) scale(1.02);
          box-shadow: var(--shadow-glow);
        }
        
        .feature-card.hovered {
          border-color: var(--card-color);
        }
        
        .feature-icon {
          font-size: 3.5rem;
          margin-bottom: 25px;
          transition: transform 0.3s;
        }
        
        .feature-card:hover .feature-icon {
          transform: scale(1.1);
        }
        
        .feature-title {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .feature-description {
          color: var(--text-secondary);
          line-height: 1.6;
          flex: 1;
        }
        
        .feature-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--card-color, var(--accent-glow)), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          z-index: -1;
        }
        
        .feature-card:hover .feature-glow {
          opacity: 0.2;
        }
        
        /* CTA Section */
        .cta {
          padding: 120px 0;
          position: relative;
          z-index: 2;
          background: linear-gradient(180deg, transparent 0%, rgba(245, 196, 0, 0.03) 100%);
        }
        
        .cta-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        
        .cta-title {
          font-size: 3.5rem;
          margin-bottom: 20px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .cta-subtitle {
          color: var(--text-secondary);
          font-size: 1.2rem;
          margin-bottom: 60px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .connect-button {
          position: relative;
          background: linear-gradient(135deg, rgba(245, 196, 0, 0.1), rgba(245, 196, 0, 0.05));
          backdrop-filter: blur(20px);
          border: 2px solid rgba(245, 196, 0, 0.3);
          border-radius: 18px;
          padding: 22px 70px;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--accent-yellow);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 60px;
          overflow: hidden;
          min-width: 250px;
          letter-spacing: 0.5px;
        }
        
        .connect-button:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(245, 196, 0, 0.2), rgba(245, 196, 0, 0.1));
          border-color: var(--accent-yellow);
          color: #FFFFFF;
          transform: translateY(-5px) scale(1.05);
          box-shadow: var(--shadow-glow);
        }
        
        .connect-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .connect-button-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--accent-yellow), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s;
          z-index: -1;
        }
        
        .connect-button-shine {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 70%
          );
          transform: rotate(45deg);
          transition: transform 0.6s;
          z-index: -1;
        }
        
        .connect-button:hover:not(:disabled) .connect-button-glow {
          opacity: 0.4;
        }
        
        .connect-button:hover:not(:disabled) .connect-button-shine {
          transform: rotate(45deg) translate(20%, 20%);
        }
        
        .cta-stats {
          display: flex;
          justify-content: center;
          gap: 50px;
          margin-top: 40px;
        }
        
        .cta-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 25px;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 15px;
          transition: all 0.3s;
        }
        
        .cta-stat:hover {
          border-color: var(--accent-yellow);
          transform: translateY(-3px);
        }
        
        .cta-stat-icon {
          font-size: 1.8rem;
        }
        
        .cta-stat-text {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 16px;
        }
        
        /* Footer */
        .footer {
          padding: 60px 0 40px;
          position: relative;
          z-index: 2;
          border-top: 1px solid var(--glass-border);
          margin-top: 100px;
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
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .footer-logo-icon {
          font-size: 2rem;
          animation: float 6s ease-in-out infinite;
        }
        
        .footer-logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .footer-copyright {
          color: var(--text-tertiary);
          margin-bottom: 30px;
          font-size: 14px;
          letter-spacing: 0.5px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 30px;
          margin-top: 20px;
        }
        
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.3s;
          position: relative;
          padding: 5px 0;
        }
        
        .footer-link:hover {
          color: var(--accent-yellow);
        }
        
        .footer-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--accent-yellow);
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
          overflow-y: auto;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal {
          background: var(--bg-secondary);
          border-radius: var(--border-radius);
          width: 100%;
          max-width: 900px;
          max-height: 85vh;
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-glow);
          animation: modalSlide 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        @keyframes modalSlide {
          from { transform: translateY(50px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 25px 30px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.02);
        }
        
        .modal-title {
          font-size: 1.8rem;
          color: var(--accent-yellow);
          font-weight: 600;
          margin: 0;
        }
        
        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 24px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 8px;
          transition: all 0.2s;
          width: 40px;
          height: 40px;
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
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 25px;
        }
        
        .wallet-browser-modal-notice {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 10px;
        }
        
        .wallet-browser-modal-notice-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .wallet-browser-modal-notice-content {
          flex: 1;
          text-align: left;
        }
        
        .wallet-browser-modal-notice-title {
          color: #3B82F6;
          font-weight: 600;
          margin-bottom: 5px;
          font-size: 1rem;
        }
        
        .wallet-browser-modal-notice-subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.4;
        }
        
        .wallet-group {
          margin-bottom: 5px;
        }
        
        .wallet-group-title {
          font-size: 1.2rem;
          color: var(--text-primary);
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--glass-border);
          font-weight: 600;
        }
        
        .wallet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 10px;
        }
        
        .wallet-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px 15px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 110px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .wallet-option:hover:not(:disabled) {
          border-color: var(--wallet-color, var(--accent-yellow));
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .wallet-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wallet-option.connecting {
          border-color: var(--wallet-color, var(--accent-yellow));
          box-shadow: 0 0 20px rgba(245, 196, 0, 0.3);
        }
        
        .wallet-option::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--wallet-color, var(--accent-glow)), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
        }
        
        .wallet-option:hover:not(:disabled)::before,
        .wallet-option.connecting::before {
          opacity: 0.2;
        }
        
        .wallet-option-icon {
          font-size: 2.2rem;
          margin-bottom: 5px;
        }
        
        .wallet-option-name {
          font-weight: 600;
          font-size: 16px;
        }
        
        .wallet-option-description {
          font-size: 12px;
          color: var(--text-secondary);
          opacity: 0.8;
        }
        
        .wallet-option-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 10, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
        }
        
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--accent-yellow);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .modal-error {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-top: 10px;
          animation: shake 0.5s;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .modal-error-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .modal-error-text {
          color: #EF4444;
          font-size: 0.95rem;
          flex: 1;
          line-height: 1.5;
        }
        
        .modal-disconnect-notice {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(245, 196, 0, 0.1);
          border: 1px solid rgba(245, 196, 0, 0.3);
          border-radius: 12px;
          padding: 15px;
          margin-top: 10px;
        }
        
        .modal-disconnect-notice-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .modal-disconnect-notice-text {
          color: var(--accent-yellow);
          font-size: 0.9rem;
          flex: 1;
          line-height: 1.4;
        }
        
        .modal-disclaimer {
          color: var(--text-tertiary);
          font-size: 0.85rem;
          text-align: center;
          line-height: 1.6;
          padding-top: 20px;
          margin-top: 10px;
          border-top: 1px solid var(--glass-border);
        }
        
        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .hero-title {
            font-size: 4.5rem;
          }
          
          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
          
          .wallet-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          }
        }
        
        @media (max-width: 768px) {
          .hero {
            padding: ${showWalletBrowserBanner ? '180px 0 80px' : '140px 0 80px'};
          }
          
          .hero-title {
            font-size: 3.5rem;
          }
          
          .hero-subtitle {
            font-size: 1.2rem;
          }
          
          .hero-stats {
            flex-direction: column;
            gap: 30px;
            margin-top: 50px;
          }
          
          .stat-number {
            font-size: 2.5rem;
          }
          
          .features-title,
          .cta-title {
            font-size: 2.5rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .feature-card {
            min-height: 220px;
            padding: 30px 20px;
          }
          
          .cta {
            padding: 80px 0;
          }
          
          .cta-stats {
            flex-direction: column;
            gap: 15px;
            align-items: center;
          }
          
          .cta-stat {
            width: 100%;
            max-width: 250px;
          }
          
          .connect-button {
            padding: 18px 40px;
            font-size: 1.1rem;
            min-width: 200px;
          }
          
          .modal {
            max-height: 90vh;
          }
          
          .wallet-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .connection-badge {
            top: ${showWalletBrowserBanner ? '60px' : '15px'};
            right: 15px;
            padding: 10px 15px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            max-width: 200px;
          }
          
          .connection-status {
            width: 100%;
            justify-content: space-between;
          }
          
          .footer-links {
            gap: 20px;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title {
            font-size: 2.8rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
            margin-bottom: 40px;
          }
          
          .features-title,
          .cta-title {
            font-size: 2rem;
          }
          
          .features-subtitle,
          .cta-subtitle {
            font-size: 1rem;
          }
          
          .feature-card {
            padding: 25px 20px;
          }
          
          .connect-button {
            padding: 16px 30px;
            font-size: 1rem;
            min-width: 180px;
          }
          
          .wallet-grid {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            padding: 20px;
          }
          
          .modal-header {
            padding: 20px;
          }
          
          .connection-badge {
            max-width: 180px;
            padding: 8px 12px;
          }
          
          .connection-address {
            font-size: 12px;
          }
          
          .footer-links {
            flex-direction: column;
            gap: 10px;
          }
        }
        
        /* Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: var(--bg-primary);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: var(--accent-yellow);
        }
        
        /* Selection */
        ::selection {
          background: rgba(245, 196, 0, 0.3);
          color: white;
        }
      `}</style>
    </div>
  );
}

export default App;
