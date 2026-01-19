import { useState, useEffect, useRef } from 'react';
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const WALLETCONNECT_PROJECT_ID = "fb91c2fb42af27391dcfa9dcfe40edc7";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const [walletType, setWalletType] = useState('');
  const [provider, setProvider] = useState(null);
  const beeRef = useRef(null);

  // Check for existing connection on load
  useEffect(() => {
    const checkExistingConnection = async () => {
      const savedConnected = localStorage.getItem('bumblebee_connected');
      const savedAddress = localStorage.getItem('bumblebee_address');
      const savedWalletType = localStorage.getItem('bumblebee_wallet_type');
      
      if (savedConnected === 'true' && savedAddress && savedWalletType) {
        setAddress(savedAddress);
        setIsConnected(true);
        setWalletType(savedWalletType);
        
        // Try to re-establish connection
        try {
          if (savedWalletType === 'metamask' && window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0 && accounts[0] === savedAddress) {
              setProvider(window.ethereum);
              addAdminLog('Reconnected to MetaMask', 'connect');
            } else {
              disconnectWallet();
            }
          } else if (savedWalletType === 'phantom' && window.phantom?.solana) {
            const solProvider = window.phantom.solana;
            const isConnected = await solProvider.isConnected();
            if (isConnected) {
              setProvider(solProvider);
              addAdminLog('Reconnected to Phantom', 'connect');
            } else {
              disconnectWallet();
            }
          } else if (savedWalletType === 'walletconnect') {
            // WalletConnect sessions don't persist across page reloads by default
            disconnectWallet();
          }
        } catch (err) {
          console.log('Reconnection failed:', err);
          disconnectWallet();
        }
      }
    };
    
    checkExistingConnection();
  }, []);

  // Initialize particles
  useEffect(() => {
    const initialParticles = [];
    for (let i = 0; i < 20; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2
      });
    }
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });

      if (beeRef.current) {
        beeRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Add admin log
  const addAdminLog = (message, type) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const detectWallets = () => {
  const wallets = [];

  // MetaMask
  if (window.ethereum?.isMetaMask) {
    wallets.push({
      type: "evm",
      name: "MetaMask",
      icon: "🦊",
      provider: "metamask",
      color: "#F6851B"
    });
  }

  // Trust Wallet
  if (window.ethereum?.isTrust) {
    wallets.push({
      type: "evm",
      name: "Trust Wallet",
      icon: "🔒",
      provider: "trust",
      color: "#3375BB"
    });
  }

  // --- OTHER WALLETS GROUP (renamed WalletConnect) ---
  wallets.push({
    type: "evm",
    name: "Other Wallets",
    icon: "🌐",
    provider: "walletconnect",
    color: "#3B99FC"
  });

  // Extra EVM wallets
  wallets.push({
    type: "evm",
    name: "OKX Wallet",
    icon: "⭕",
    provider: "okx",
    color: "#000000"
  });

  wallets.push({
    type: "evm",
    name: "Coinbase Wallet",
    icon: "🔵",
    provider: "coinbase",
    color: "#0052FF"
  });

  wallets.push({
    type: "evm",
    name: "Binance Web3 Wallet",
    icon: "🟡",
    provider: "binance",
    color: "#F0B90B"
  });

  wallets.push({
    type: "evm",
    name: "Rainbow Wallet",
    icon: "🌈",
    provider: "rainbow",
    color: "#9F7AEA"
  });

  wallets.push({
    type: "evm",
    name: "Rabby Wallet",
    icon: "🐰",
    provider: "rabby",
    color: "#FF8B37"
  });

  wallets.push({
    type: "evm",
    name: "Bitget Wallet",
    icon: "🟦",
    provider: "bitget",
    color: "#0CC0DF"
  });

  wallets.push({
    type: "evm",
    name: "TokenPocket",
    icon: "💼",
    provider: "tokenpocket",
    color: "#3C7DFF"
  });

  // --- SOLANA WALLETS ---
  if (window.phantom?.solana?.isPhantom) {
    wallets.push({
      type: "solana",
      name: "Phantom",
      icon: "👻",
      provider: "phantom",
      color: "#AB9FF2"
    });
  }

  wallets.push({
    type: "solana",
    name: "Solflare",
    icon: "🔥",
    provider: "solflare",
    color: "#FF7A00"
  });

  wallets.push({
    type: "solana",
    name: "Backpack",
    icon: "🎒",
    provider: "backpack",
    color: "#FFB100"
  });

  wallets.push({
    type: "solana",
    name: "Glow Wallet",
    icon: "✨",
    provider: "glow",
    color: "#FFD54F"
  });

  wallets.push({
    type: "solana",
    name: "Nightly Wallet",
    icon: "🌙",
    provider: "nightly",
    color: "#7F7FFF"
  });

  wallets.push({
    type: "solana",
    name: "SafePal",
    icon: "🛡️",
    provider: "safepal",
    color: "#0A84FF"
  });

  return wallets;
};

  const connectWallet = async (walletInfo) => {
    setIsLoading(true);
    setError('');
    
    try {
      let address;
      let walletProvider;
      
      if (walletInfo.type === 'evm') {
        if (walletInfo.provider === 'walletconnect') {
          const wcProvider = await EthereumProvider.init({
            projectId: WALLETCONNECT_PROJECT_ID,
            showQrModal: true,
            qrModalOptions: {
              themeMode: 'dark'
            },
            chains: [1],
            metadata: {
              name: 'Bumblebee Wallet',
              description: 'Next-generation Web3 Wallet',
              url: window.location.origin,
              icons: ['https://avatars.githubusercontent.com/u/37784886']
            }
          });
          
          await wcProvider.connect();
          const accounts = await wcProvider.request({ method: 'eth_accounts' });
          
          if (accounts.length === 0) {
            throw new Error('No accounts received');
          }
          
          address = accounts[0];
          walletProvider = wcProvider;
          setWalletType('walletconnect');
          
          // Setup WalletConnect event listeners
          wcProvider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
              disconnectWallet();
            } else {
              setAddress(accounts[0]);
            }
          });
          
          wcProvider.on('disconnect', () => {
            disconnectWallet();
          });
          
        } else {
          // MetaMask or Trust Wallet
          if (!window.ethereum) {
            throw new Error('No Ethereum wallet found');
          }
          
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          if (accounts.length === 0) {
            throw new Error('No accounts received');
          }
          
          address = accounts[0];
          walletProvider = window.ethereum;
          setWalletType(walletInfo.provider);
          
          // Setup MetaMask/Trust event listeners
          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
              disconnectWallet();
            } else {
              setAddress(accounts[0]);
              localStorage.setItem('bumblebee_address', accounts[0]);
            }
          });
          
          window.ethereum.on('disconnect', () => {
            disconnectWallet();
          });
        }
      } else {
        // Solana Phantom
        const solProvider = window.phantom?.solana;
        if (!solProvider) {
          throw new Error('Phantom wallet not found');
        }
        
        try {
          const response = await solProvider.connect();
          address = response.publicKey.toString();
          walletProvider = solProvider;
          setWalletType('phantom');
          
          // Setup Phantom event listeners
          solProvider.on('connect', () => {
            console.log('Phantom connected');
          });
          
          solProvider.on('disconnect', () => {
            disconnectWallet();
          });
          
        } catch (solError) {
          throw new Error(`Phantom connection failed: ${solError.message}`);
        }
      }
      
      if (!address) {
        throw new Error('Could not get wallet address');
      }
      
      setAddress(address);
      setProvider(walletProvider);
      setIsConnected(true);
      setShowConnectModal(false);
      
      // Save to localStorage
      localStorage.setItem('bumblebee_connected', 'true');
      localStorage.setItem('bumblebee_address', address);
      localStorage.setItem('bumblebee_wallet_type', walletInfo.provider);
      
      addAdminLog(`${walletInfo.name} connected: ${address.slice(0, 8)}...`, 'success');
      
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Connection failed');
      addAdminLog(`Connection failed: ${err.message}`, 'error');
      
      // Clean up on error
      disconnectWallet();
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    try {
      if (provider) {
        if (walletType === 'walletconnect' && provider.disconnect) {
          provider.disconnect();
        } else if (walletType === 'phantom' && provider.disconnect) {
          provider.disconnect();
        }
      }
    } catch (err) {
      console.log('Disconnect error:', err);
    }
    
    setAddress('');
    setIsConnected(false);
    setProvider(null);
    setWalletType('');
    
    localStorage.removeItem('bumblebee_connected');
    localStorage.removeItem('bumblebee_address');
    localStorage.removeItem('bumblebee_wallet_type');
    
    addAdminLog('Wallet disconnected', 'info');
  };

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
              height: `${p.size}px`
            }}
          />
        ))}
        
        {/* 3D Honeycomb Grid */}
        <div className="honeycomb-grid" />
        
        {/* 3D Bumblebee Mascot */}
        <div className="bee-container" ref={beeRef}>
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
      </div>

      {/* Connection Badge */}
      {isConnected && (
        <div className="connection-badge">
          <div className="connection-dot" />
          <span className="connection-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button onClick={disconnectWallet} className="disconnect-btn">
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
            A next-generation Web3 wallet.
            <br />
            <span className="hero-highlight">Fast. Secure. Multi-Chain.</span>
          </p>
          
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">2M+</div>
              <div className="stat-label">Users</div>
            </div>
            <div className="stat">
              <div className="stat-number">$4.2B+</div>
              <div className="stat-label">Assets</div>
            </div>
            <div className="stat">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features">
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
      </section>

      {/* CTA Section */}
      <section className="cta">
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
      </section>

      {/* Footer */}
      <footer className="footer">
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
          </div>
        </div>
      </footer>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Connect Wallet</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowConnectModal(false);
                  setError('');
                }}
                disabled={isLoading}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="wallet-options">
                {detectWallets().map(wallet => (
                  <button
                    key={`${wallet.type}-${wallet.provider}`}
                    className="wallet-option"
                    onClick={() => connectWallet(wallet)}
                    disabled={isLoading}
                    style={{ '--wallet-color': wallet.color }}
                  >
                    <div className="wallet-option-icon">{wallet.icon}</div>
                    <div className="wallet-option-info">
                      <div className="wallet-option-name">{wallet.name}</div>
                      <div className="wallet-option-type">
                        {wallet.type === 'evm' ? 'EVM Chains' : 'Solana'}
                      </div>
                    </div>
                    <div className="wallet-option-arrow">→</div>
                  </button>
                ))}
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
          --shadow-glow: 0 0 20px var(--accent-glow);
          --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        .homepage {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
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
        }
        
        .particle {
          position: absolute;
          background: var(--accent-yellow);
          border-radius: 50%;
          opacity: 0.3;
          filter: blur(1px);
          animation: float 20s infinite linear;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        .honeycomb-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(245, 196, 0, 0.1) 1px, transparent 0),
            radial-gradient(circle at 1px 1px, rgba(245, 196, 0, 0.05) 2px, transparent 0);
          background-size: 60px 60px, 120px 120px;
          opacity: 0.3;
          transform: perspective(1000px) rotateX(60deg);
          transform-origin: center;
        }
        
        /* 3D Bumblebee */
        .bee-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
          transition: transform 0.3s ease-out;
        }
        
        .bee {
          position: relative;
          width: 120px;
          height: 120px;
          transform-style: preserve-3d;
          animation: beeFloat 6s ease-in-out infinite;
        }
        
        @keyframes beeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        .bee-body {
          position: absolute;
          width: 100px;
          height: 60px;
          background: linear-gradient(45deg, #F5C400, #FFD700);
          border-radius: 50%;
          top: 30px;
          left: 10px;
          box-shadow: 
            0 0 30px rgba(245, 196, 0, 0.5),
            inset 0 0 20px rgba(255, 255, 255, 0.3);
        }
        
        .bee-stripe {
          position: absolute;
          width: 100%;
          height: 15px;
          background: #0A0A0A;
          border-radius: 50%;
        }
        
        .bee-stripe:nth-child(1) { top: 15px; }
        .bee-stripe:nth-child(2) { top: 30px; }
        .bee-stripe:nth-child(3) { top: 45px; }
        
        .bee-wing {
          position: absolute;
          width: 50px;
          height: 80px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          filter: blur(2px);
          animation: wingFlap 0.5s ease-in-out infinite;
        }
        
        .bee-wing-left {
          top: 10px;
          left: 0;
          transform: rotate(-20deg);
        }
        
        .bee-wing-right {
          top: 10px;
          right: 0;
          transform: rotate(20deg);
          animation-delay: 0.25s;
        }
        
        @keyframes wingFlap {
          0%, 100% { transform: rotate(-20deg) scale(1); }
          50% { transform: rotate(-25deg) scale(1.1); }
        }
        
        .bee-eye {
          position: absolute;
          width: 15px;
          height: 15px;
          background: #0A0A0A;
          border-radius: 50%;
          top: 25px;
        }
        
        .bee-eye-left { left: 30px; }
        .bee-eye-right { right: 30px; }
        
        /* Connection Badge */
        .connection-badge {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 10px 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1000;
          animation: slideIn 0.3s;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .connection-dot {
          width: 10px;
          height: 10px;
          background: var(--accent-yellow);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .connection-address {
          font-family: 'Monaco', monospace;
          font-size: 14px;
          color: var(--text-primary);
        }
        
        .disconnect-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 16px;
          padding: 0 5px;
        }
        
        .disconnect-btn:hover {
          color: var(--accent-yellow);
        }
        
        /* Hero Section */
        .hero {
          padding: 150px 40px 100px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        
        .hero-badge {
          display: inline-block;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 10px 20px;
          margin-bottom: 40px;
          animation: fadeInUp 0.8s;
        }
        
        .hero-badge-text {
          color: var(--accent-yellow);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1px;
        }
        
        .hero-title {
          font-size: 5rem;
          font-weight: 800;
          margin-bottom: 20px;
          animation: fadeInUp 0.8s 0.2s both;
          line-height: 1;
        }
        
        .hero-title-text {
          background: linear-gradient(45deg, var(--accent-yellow), #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-title-sub {
          color: var(--text-primary);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          color: var(--text-secondary);
          margin-bottom: 50px;
          animation: fadeInUp 0.8s 0.4s both;
          line-height: 1.5;
        }
        
        .hero-highlight {
          color: var(--accent-yellow);
          font-weight: 600;
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-top: 60px;
          animation: fadeInUp 0.8s 0.6s both;
        }
        
        .stat {
          text-align: center;
        }
        
        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 5px;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Features Section */
        .features {
          padding: 100px 40px;
          position: relative;
          z-index: 2;
        }
        
        .features-title {
          text-align: center;
          font-size: 3rem;
          margin-bottom: 20px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .features-subtitle {
          text-align: center;
          color: var(--text-secondary);
          font-size: 1.2rem;
          margin-bottom: 60px;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .feature-card {
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 40px 30px;
          position: relative;
          transition: all 0.3s ease;
          overflow: hidden;
          cursor: pointer;
        }
        
        .feature-card:hover {
          border-color: var(--accent-yellow);
          transform: translateY(-10px) scale(1.02);
        }
        
        .feature-card.hovered {
          border-color: var(--card-color);
        }
        
        .feature-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }
        
        .feature-title {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: var(--text-primary);
        }
        
        .feature-description {
          color: var(--text-secondary);
          line-height: 1.6;
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
        }
        
        .feature-card:hover .feature-glow {
          opacity: 0.3;
        }
        
        /* CTA Section */
        .cta {
          padding: 100px 40px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        
        .cta-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .cta-title {
          font-size: 3rem;
          margin-bottom: 20px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .cta-subtitle {
          color: var(--text-secondary);
          font-size: 1.2rem;
          margin-bottom: 50px;
        }
        
        .connect-button {
          position: relative;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 2px solid var(--accent-yellow);
          border-radius: 16px;
          padding: 20px 60px;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--accent-yellow);
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 40px;
          overflow: hidden;
          min-width: 200px;
        }
        
        .connect-button:hover:not(:disabled) {
          background: var(--accent-yellow);
          color: var(--bg-primary);
          transform: translateY(-3px);
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
          transition: opacity 0.3s;
        }
        
        .connect-button:hover:not(:disabled) .connect-button-glow {
          opacity: 0.3;
        }
        
        .cta-stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-top: 40px;
        }
        
        .cta-stat {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .cta-stat-icon {
          font-size: 1.5rem;
        }
        
        .cta-stat-text {
          color: var(--text-secondary);
          font-weight: 500;
        }
        
        /* Footer */
        .footer {
          padding: 40px;
          text-align: center;
          position: relative;
          z-index: 2;
          border-top: 1px solid var(--glass-border);
          margin-top: 100px;
        }
        
        .footer-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .footer-logo-icon {
          font-size: 1.5rem;
        }
        
        .footer-logo-text {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--accent-yellow);
        }
        
        .footer-copyright {
          color: var(--text-tertiary);
          margin-bottom: 20px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 30px;
        }
        
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s;
          cursor: pointer;
        }
        
        .footer-link:hover {
          color: var(--accent-yellow);
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
          animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal {
          background: var(--bg-secondary);
          border-radius: 24px;
          width: 90%;
          max-width: 500px;
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-glow);
          animation: modalSlide 0.3s;
        }
        
        @keyframes modalSlide {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 25px 30px;
          border-bottom: 1px solid var(--glass-border);
        }
        
        .modal-title {
          font-size: 1.5rem;
          color: var(--accent-yellow);
        }
        
        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
        }
        
        .modal-close:hover:not(:disabled) {
          color: var(--accent-yellow);
        }
        
        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .modal-content {
          padding: 30px;
        }
        
        .wallet-options {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .wallet-option {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
        }
        
        .wallet-option:hover:not(:disabled) {
          border-color: var(--wallet-color, var(--accent-yellow));
          transform: translateX(5px);
        }
        
        .wallet-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wallet-option-icon {
          font-size: 1.8rem;
        }
        
        .wallet-option-info {
          flex: 1;
          text-align: left;
        }
        
        .wallet-option-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .wallet-option-type {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        
        .wallet-option-arrow {
          color: var(--text-tertiary);
          font-size: 1.2rem;
        }
        
        .modal-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .modal-error-icon {
          font-size: 1.2rem;
        }
        
        .modal-error-text {
          color: #EF4444;
          font-size: 0.9rem;
          flex: 1;
        }
        
        .modal-disclaimer {
          color: var(--text-tertiary);
          font-size: 0.8rem;
          text-align: center;
          line-height: 1.5;
        }
        
        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 3.5rem;
          }
          
          .hero-subtitle {
            font-size: 1.2rem;
          }
          
          .features-title,
          .cta-title {
            font-size: 2.5rem;
          }
          
          .hero-stats,
          .cta-stats {
            flex-direction: column;
            gap: 20px;
          }
          
          .stat-number {
            font-size: 2rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
          }
          
          .hero,
          .features,
          .cta {
            padding: 80px 20px;
          }
          
          .footer-links {
            flex-wrap: wrap;
            gap: 15px;
          }
          
          .connect-button {
            padding: 15px 30px;
            font-size: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .features-title,
          .cta-title {
            font-size: 2rem;
          }
          
          .feature-card {
            padding: 30px 20px;
          }
          
          .connect-button {
            padding: 12px 24px;
            font-size: 0.9rem;
          }
          
          .connection-badge {
            top: 10px;
            right: 10px;
            padding: 8px 12px;
          }
          
          .connection-address {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
