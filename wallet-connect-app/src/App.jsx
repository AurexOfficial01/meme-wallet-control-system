import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const WALLETCONNECT_PROJECT_ID = "fb91c2fb42af27391dcfa9dcfe40edc7";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

function App() {
  // Admin Mode Toggle
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  // User Wallet State
  const [userWallets, setUserWallets] = useState([]);
  const [activeWallet, setActiveWallet] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [nativeBalance, setNativeBalance] = useState('0');
  const [tokens, setTokens] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [gasPrice, setGasPrice] = useState('0');
  const [tokenPrices, setTokenPrices] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState(null);
  const [walletType, setWalletType] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendToken, setSendToken] = useState('native');
  const [transactionLogs, setTransactionLogs] = useState([]);

  // Admin State
  const [allWallets, setAllWallets] = useState([]);
  const [frozenWallets, setFrozenWallets] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminView, setAdminView] = useState('dashboard');
  const [selectedAdminWallet, setSelectedAdminWallet] = useState(null);
  const [adminStats, setAdminStats] = useState({
    totalWallets: 0,
    totalValue: 0,
    activeWallets: 0,
    frozenWallets: 0,
    totalTransactions: 0
  });

  const logsEndRef = useRef(null);

  // Initialize
  useEffect(() => {
    loadSavedData();
    fetchTokenPrices();
    
    const priceInterval = setInterval(fetchTokenPrices, 30000);
    const balanceInterval = setInterval(refreshBalances, 15000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(balanceInterval);
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [adminLogs]);

  const loadSavedData = () => {
    const savedWallets = JSON.parse(localStorage.getItem('userWallets') || '[]');
    const savedAdminWallets = JSON.parse(localStorage.getItem('allWallets') || '[]');
    const savedFrozen = JSON.parse(localStorage.getItem('frozenWallets') || '[]');
    const savedLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
    const savedTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    
    setUserWallets(savedWallets);
    setAllWallets(savedAdminWallets);
    setFrozenWallets(savedFrozen);
    setAdminLogs(savedLogs);
    setTransactions(savedTransactions);
    
    addAdminLog('System initialized', 'info');
  };

  const addAdminLog = (message, type = 'info') => {
    const log = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
      wallet: activeWallet?.address || 'system'
    };
    setAdminLogs(prev => [...prev, log]);
    localStorage.setItem('adminLogs', JSON.stringify([...adminLogs, log]));
  };

  const addTransaction = (tx) => {
    const newTx = {
      ...tx,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      confirmed: false
    };
    setTransactions(prev => [newTx, ...prev]);
    localStorage.setItem('transactions', JSON.stringify([newTx, ...transactions]));
    
    if (isAdminMode && adminAuthenticated) {
      addAdminLog(`Transaction initiated: ${tx.hash || 'pending'}`, 'tx');
    }
  };

  const fetchTokenPrices = async () => {
    try {
      const response = await fetch(`${COINGECKO_API}?ids=ethereum,solana,usd-coin,tether&vs_currencies=usd`);
      const data = await response.json();
      setTokenPrices(data);
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  };

  const getNetworkName = (chainId) => {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon',
      '0xa4b1': 'Arbitrum',
      '0xa': 'Optimism',
      '0x38': 'BNB Chain',
      '0xaa36a7': 'Sepolia',
      'solana-mainnet': 'Solana Mainnet',
      'solana-devnet': 'Solana Devnet'
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  const detectWallets = () => {
    const wallets = [];
    
    // EVM Wallets
    if (typeof window.ethereum !== 'undefined') {
      wallets.push({ type: 'evm', name: 'MetaMask', icon: '🦊', provider: 'metamask' });
      if (window.ethereum.isTrust) {
        wallets.push({ type: 'evm', name: 'Trust Wallet', icon: '🔒', provider: 'trust' });
      }
    }
    
    // WalletConnect
    wallets.push({ type: 'evm', name: 'WalletConnect', icon: '🔗', provider: 'walletconnect' });
    
    // Solana Wallets
    if (typeof window.phantom !== 'undefined' && window.phantom.solana?.isPhantom) {
      wallets.push({ type: 'solana', name: 'Phantom', icon: '👻', provider: 'phantom' });
    }
    if (typeof window.backpack !== 'undefined') {
      wallets.push({ type: 'solana', name: 'Backpack', icon: '🎒', provider: 'backpack' });
    }
    
    return wallets;
  };

  const connectWallet = async (walletInfo) => {
    setIsLoading(true);
    setError('');
    
    try {
      let address, chain, providerInstance;
      
      if (walletInfo.type === 'evm') {
        if (walletInfo.provider === 'walletconnect') {
          const wcProvider = await EthereumProvider.init({
            projectId: WALLETCONNECT_PROJECT_ID,
            showQrModal: true,
            qrModalOptions: {
              themeMode: 'dark',
              themeVariables: {
                '--wcm-z-index': '9999'
              }
            },
            chains: [1, 137, 42161, 10],
            events: ['chainChanged', 'accountsChanged'],
            methods: ['eth_sendTransaction', 'personal_sign'],
            metadata: {
              name: 'Bumblebee Wallet',
              description: 'Premium Crypto Wallet System',
              url: window.location.origin,
              icons: ['https://i.ibb.co/1L8kRZ7/bumblebee-icon.png']
            }
          });
          
          await wcProvider.connect();
          const accounts = await wcProvider.request({ method: 'eth_accounts' });
          address = accounts[0];
          chain = await wcProvider.request({ method: 'eth_chainId' });
          providerInstance = wcProvider;
          
          wcProvider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) disconnectWallet();
            else setConnectedAddress(accounts[0]);
          });
          
          wcProvider.on('chainChanged', (newChainId) => {
            setChainId(newChainId);
            setNetworkName(getNetworkName(newChainId));
          });
        } else {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          address = accounts[0];
          chain = await window.ethereum.request({ method: 'eth_chainId' });
          providerInstance = window.ethereum;
          
          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) disconnectWallet();
            else setConnectedAddress(accounts[0]);
          });
          
          window.ethereum.on('chainChanged', (newChainId) => {
            setChainId(newChainId);
            setNetworkName(getNetworkName(newChainId));
            window.location.reload();
          });
        }
        
        setWalletType('evm');
      } else {
        // Solana
        let solProvider;
        if (walletInfo.provider === 'phantom') {
          solProvider = window.phantom?.solana;
        } else {
          solProvider = window.backpack;
        }
        
        const response = await solProvider.connect();
        address = response.publicKey.toString();
        chain = 'solana-mainnet';
        providerInstance = solProvider;
        setWalletType('solana');
      }
      
      setConnectedAddress(address);
      setChainId(chain);
      setNetworkName(getNetworkName(chain));
      setProvider(providerInstance);
      
      const walletData = {
        id: `${walletInfo.type}-${Date.now()}`,
        address,
        type: walletInfo.type,
        provider: walletInfo.provider,
        name: walletInfo.name,
        icon: walletInfo.icon,
        connectedAt: new Date().toISOString(),
        chain,
        balance: '0',
        tokens: [],
        nfts: []
      };
      
      const updatedWallets = [...userWallets.filter(w => w.address !== address), walletData];
      setUserWallets(updatedWallets);
      localStorage.setItem('userWallets', JSON.stringify(updatedWallets));
      
      const adminWalletList = [...allWallets];
      if (!adminWalletList.some(w => w.address === address)) {
        adminWalletList.push({
          ...walletData,
          status: 'active',
          frozen: false,
          lastActive: new Date().toISOString()
        });
        setAllWallets(adminWalletList);
        localStorage.setItem('allWallets', JSON.stringify(adminWalletList));
      }
      
      setActiveWallet(walletData);
      
      addAdminLog(`${walletInfo.name} connected: ${address.slice(0, 8)}...`, 'connect');
      
      await refreshWalletData(providerInstance, address, chain, walletInfo.type);
      
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
      addAdminLog(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWalletData = async (providerInstance, address, chain, walletType) => {
    try {
      if (walletType === 'evm') {
        const balanceHex = await providerInstance.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        const balance = ethers.formatEther(balanceHex);
        setNativeBalance(parseFloat(balance).toFixed(4));
        
        const gasPriceHex = await providerInstance.request({ method: 'eth_gasPrice' });
        setGasPrice(ethers.formatUnits(gasPriceHex, 'gwei').split('.')[0]);
        
        await fetchEVMTokens(providerInstance, address);
        await fetchEVMNFTs(providerInstance, address);
      } else {
        const connection = new window.solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
        const publicKey = new window.solanaWeb3.PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        setNativeBalance((balance / 1e9).toFixed(4));
        
        await fetchSolanaTokens(connection, publicKey);
        await fetchSolanaNFTs(connection, publicKey);
      }
      
      updateWalletBalance(address, parseFloat(nativeBalance));
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  const refreshBalances = () => {
    if (provider && connectedAddress) {
      refreshWalletData(provider, connectedAddress, chainId, walletType);
    }
  };

  const updateWalletBalance = (address, balance) => {
    setUserWallets(prev => prev.map(w => 
      w.address === address ? { ...w, balance } : w
    ));
    
    setAllWallets(prev => prev.map(w => 
      w.address === address ? { ...w, balance, lastActive: new Date().toISOString() } : w
    ));
  };

  const fetchEVMTokens = async (provider, address) => {
    const commonTokens = [
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 }
    ];
    
    const tokenBalances = [];
    
    for (const token of commonTokens) {
      try {
        const balanceHex = await provider.request({
          method: 'eth_call',
          params: [{
            to: token.address,
            data: `0x70a08231000000000000000000000000${address.slice(2)}`
          }, 'latest']
        });
        
        if (balanceHex !== '0x') {
          const balance = ethers.formatUnits(balanceHex, token.decimals);
          if (parseFloat(balance) > 0.01) {
            tokenBalances.push({
              ...token,
              balance: parseFloat(balance).toFixed(2),
              usdValue: parseFloat(balance) * (tokenPrices?.['usd-coin']?.usd || 1)
            });
          }
        }
      } catch (err) {
        continue;
      }
    }
    
    setTokens(tokenBalances);
  };

  const fetchEVMNFTs = async (provider, address) => {
    const nfts = [];
    setNfts(nfts);
  };

  const fetchSolanaTokens = async (connection, publicKey) => {
    const tokens = [];
    setTokens(tokens);
  };

  const fetchSolanaNFTs = async (connection, publicKey) => {
    const nfts = [];
    setNfts(nfts);
  };

  const disconnectWallet = () => {
    if (provider?.disconnect) {
      provider.disconnect();
    }
    setConnectedAddress('');
    setNativeBalance('0');
    setTokens([]);
    setNfts([]);
    setProvider(null);
    setActiveWallet(null);
    
    addAdminLog('Wallet disconnected', 'info');
  };

  const handleSendTransaction = async () => {
    if (!provider || !connectedAddress) {
      setError('Wallet not connected');
      return;
    }
    
    if (frozenWallets.includes(connectedAddress)) {
      setError('Wallet is frozen by admin');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      let txHash;
      
      if (walletType === 'evm') {
        if (sendToken === 'native') {
          txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: connectedAddress,
              to: sendTo,
              value: ethers.parseEther(sendAmount).toString(),
              gas: '0x5208'
            }]
          });
        } else {
          const token = tokens.find(t => t.symbol === sendToken);
          if (token) {
            const amount = ethers.parseUnits(sendAmount, token.decimals).toString();
            const data = `0xa9059cbb${sendTo.slice(2).padStart(64, '0')}${amount.padStart(64, '0')}`;
            
            txHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{
                from: connectedAddress,
                to: token.address,
                data: data
              }]
            });
          }
        }
      } else {
        const { solanaWeb3 } = window;
        const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
        const fromPubkey = new solanaWeb3.PublicKey(connectedAddress);
        const toPubkey = new solanaWeb3.PublicKey(sendTo);
        
        const transaction = new solanaWeb3.Transaction().add(
          solanaWeb3.SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: solanaWeb3.LAMPORTS_PER_SOL * parseFloat(sendAmount)
          })
        );
        
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        const signed = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        txHash = signature;
      }
      
      addTransaction({
        hash: txHash,
        from: connectedAddress,
        to: sendTo,
        amount: sendAmount,
        token: sendToken === 'native' ? (walletType === 'evm' ? 'ETH' : 'SOL') : sendToken,
        type: 'send',
        network: networkName
      });
      
      setShowSendModal(false);
      setSendAmount('');
      setSendTo('');
      
      addAdminLog(`Transaction sent: ${txHash.slice(0, 16)}...`, 'tx');
      
      setTimeout(refreshBalances, 3000);
    } catch (err) {
      setError(`Send failed: ${err.message}`);
      addAdminLog(`Send failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = () => {
    if (adminPassword === 'BUMBLEBEE_ADMIN_2024') {
      setAdminAuthenticated(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      addAdminLog('Admin authenticated successfully', 'security');
    } else {
      setError('Invalid admin password');
      addAdminLog('Failed admin login attempt', 'security');
    }
  };

  const freezeWallet = (address) => {
    if (!frozenWallets.includes(address)) {
      setFrozenWallets(prev => [...prev, address]);
      localStorage.setItem('frozenWallets', JSON.stringify([...frozenWallets, address]));
      addAdminLog(`Wallet frozen: ${address.slice(0, 8)}...`, 'admin');
    }
  };

  const unfreezeWallet = (address) => {
    setFrozenWallets(prev => prev.filter(addr => addr !== address));
    localStorage.setItem('frozenWallets', JSON.stringify(frozenWallets.filter(addr => addr !== address)));
    addAdminLog(`Wallet unfrozen: ${address.slice(0, 8)}...`, 'admin');
  };

  const adminSendTransaction = async (walletAddress) => {
    if (!provider) {
      setError('Admin must connect a wallet first');
      return;
    }
    
    setSelectedAdminWallet(walletAddress);
    setShowSendModal(true);
  };

  const WalletPanel = () => (
    <div className="wallet-panel">
      <div className="header">
        <div className="logo">
          <div className="logo-icon">🐝</div>
          <h1>Bumblebee Wallet</h1>
        </div>
        <div className="header-actions">
          <button 
            className="admin-btn"
            onClick={() => setShowAdminLogin(true)}
          >
            🔧 Admin
          </button>
          <button 
            className="theme-toggle"
            onClick={() => document.documentElement.classList.toggle('light')}
          >
            🌙
          </button>
        </div>
      </div>
      
      <div className="wallet-content">
        {!connectedAddress ? (
          <div className="connect-section">
            <div className="connect-header">
              <h2>Connect Your Wallet</h2>
              <p>Choose your preferred wallet to get started</p>
            </div>
            <div className="wallet-grid">
              {detectWallets().map(wallet => (
                <button
                  key={`${wallet.type}-${wallet.provider}`}
                  className="wallet-card"
                  onClick={() => connectWallet(wallet)}
                  disabled={isLoading}
                >
                  <div className="wallet-icon">{wallet.icon}</div>
                  <h3>{wallet.name}</h3>
                  <p>{wallet.type === 'evm' ? 'EVM Chain' : 'Solana'}</p>
                  <div className="wallet-glow"></div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="wallet-overview">
              <div className="wallet-header">
                <div className="wallet-info">
                  <div className="wallet-icon-large">{activeWallet?.icon}</div>
                  <div>
                    <h2>{activeWallet?.name}</h2>
                    <div className="wallet-address">
                      <code>{connectedAddress}</code>
                      <button 
                        className="copy-btn"
                        onClick={() => navigator.clipboard.writeText(connectedAddress)}
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
                <div className="network-badge">
                  <div className="network-dot"></div>
                  {networkName}
                </div>
              </div>
              
              <div className="balance-card">
                <div className="balance-label">Total Balance</div>
                <div className="balance-amount">
                  {nativeBalance} {walletType === 'evm' ? 'ETH' : 'SOL'}
                </div>
                <div className="balance-usd">
                  ${(parseFloat(nativeBalance) * (tokenPrices?.ethereum?.usd || tokenPrices?.solana?.usd || 0)).toFixed(2)} USD
                </div>
                {frozenWallets.includes(connectedAddress) && (
                  <div className="frozen-warning">❄️ Wallet Frozen by Admin</div>
                )}
              </div>
              
              <div className="action-buttons">
                <button 
                  className="action-btn send"
                  onClick={() => setShowSendModal(true)}
                  disabled={frozenWallets.includes(connectedAddress)}
                >
                  <div className="action-icon">↑</div>
                  Send
                </button>
                <button 
                  className="action-btn receive"
                  onClick={() => setShowReceiveModal(true)}
                >
                  <div className="action-icon">↓</div>
                  Receive
                </button>
                <button 
                  className="action-btn swap"
                  onClick={refreshBalances}
                >
                  <div className="action-icon">↻</div>
                  Refresh
                </button>
                <button 
                  className="action-btn disconnect"
                  onClick={disconnectWallet}
                >
                  <div className="action-icon">×</div>
                  Disconnect
                </button>
              </div>
            </div>
            
            <div className="wallet-details">
              <div className="detail-section">
                <h3>Tokens</h3>
                <div className="tokens-list">
                  {tokens.length > 0 ? (
                    tokens.map(token => (
                      <div key={token.address} className="token-item">
                        <div className="token-info">
                          <div className="token-symbol">{token.symbol}</div>
                          <div className="token-balance">{token.balance}</div>
                        </div>
                        <div className="token-value">
                          ${token.usdValue?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No tokens found</div>
                  )}
                </div>
              </div>
              
              <div className="detail-section">
                <h3>Network Info</h3>
                <div className="network-info">
                  <div className="info-row">
                    <span>Chain</span>
                    <span>{networkName}</span>
                  </div>
                  <div className="info-row">
                    <span>Address</span>
                    <span className="mono">{connectedAddress.slice(0, 16)}...</span>
                  </div>
                  {walletType === 'evm' && (
                    <div className="info-row">
                      <span>Gas Price</span>
                      <span>{gasPrice} Gwei</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span>Wallet Type</span>
                    <span>{activeWallet?.name}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="transactions-section">
              <h3>Recent Transactions</h3>
              <div className="transactions-list">
                {transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="transaction-item">
                    <div className="tx-type">{tx.type}</div>
                    <div className="tx-details">
                      <div className="tx-addresses">
                        {tx.from?.slice(0, 8)}... → {tx.to?.slice(0, 8)}...
                      </div>
                      <div className="tx-amount">
                        {tx.amount} {tx.token}
                      </div>
                    </div>
                    <div className="tx-status">
                      {tx.hash ? '✅' : '⏳'}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="empty-state">No transactions yet</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {showSendModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Send {sendToken === 'native' ? (walletType === 'evm' ? 'ETH' : 'SOL') : sendToken}</h3>
            <div className="modal-content">
              <input
                type="text"
                placeholder="Recipient Address"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="modal-input"
              />
              <div className="amount-row">
                <input
                  type="number"
                  placeholder="Amount"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="modal-input"
                />
                <select 
                  value={sendToken} 
                  onChange={(e) => setSendToken(e.target.value)}
                  className="token-select"
                >
                  <option value="native">{walletType === 'evm' ? 'ETH' : 'SOL'}</option>
                  {tokens.map(token => (
                    <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                  ))}
                </select>
              </div>
              {walletType === 'evm' && (
                <div className="gas-info">
                  Estimated Gas: ~$0.50 - $2.00
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleSendTransaction}
                disabled={isLoading || !sendAmount || !sendTo}
                className="confirm-btn"
              >
                {isLoading ? 'Confirming...' : 'Send'}
              </button>
              <button 
                onClick={() => {
                  setShowSendModal(false);
                  setSendAmount('');
                  setSendTo('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showReceiveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Receive Funds</h3>
            <div className="qr-container">
              <div className="qr-placeholder">
                <div className="qr-icon">📱</div>
                <p>Wallet Address QR Code</p>
              </div>
            </div>
            <div className="address-display">
              <code>{connectedAddress}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(connectedAddress)}
                className="copy-btn-large"
              >
                Copy Address
              </button>
            </div>
            <button 
              onClick={() => setShowReceiveModal(false)}
              className="cancel-btn"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {showAdminLogin && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Admin Login</h3>
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="modal-input"
              onKeyPress={(e) => e.key === 'Enter' && adminLogin()}
            />
            <div className="modal-actions">
              <button onClick={adminLogin} className="confirm-btn">
                Login
              </button>
              <button 
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
    </div>
  );

  const AdminPanel = () => (
    <div className="admin-panel">
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <div className="admin-logo">
            <div className="admin-icon">👑</div>
            <h2>Admin Panel</h2>
          </div>
        </div>
        
        <div className="sidebar-menu">
          <button 
            className={`menu-item ${adminView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setAdminView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`menu-item ${adminView === 'wallets' ? 'active' : ''}`}
            onClick={() => setAdminView('wallets')}
          >
            👛 Wallets
          </button>
          <button 
            className={`menu-item ${adminView === 'transactions' ? 'active' : ''}`}
            onClick={() => setAdminView('transactions')}
          >
            🔄 Transactions
          </button>
          <button 
            className={`menu-item ${adminView === 'logs' ? 'active' : ''}`}
            onClick={() => setAdminView('logs')}
          >
            📋 Logs
          </button>
          <button 
            className={`menu-item ${adminView === 'controls' ? 'active' : ''}`}
            onClick={() => setAdminView('controls')}
          >
            ⚙️ Controls
          </button>
        </div>
        
        <div className="sidebar-footer">
          <button 
            className="logout-btn"
            onClick={() => {
              setAdminAuthenticated(false);
              setIsAdminMode(false);
            }}
          >
            ← Back to Wallet
          </button>
        </div>
      </div>
      
      <div className="admin-content">
        {adminView === 'dashboard' && (
          <div className="dashboard-view">
            <h1>Admin Dashboard</h1>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{allWallets.length}</div>
                <div className="stat-label">Total Wallets</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{frozenWallets.length}</div>
                <div className="stat-label">Frozen Wallets</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{transactions.length}</div>
                <div className="stat-label">Transactions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">24/7</div>
                <div className="stat-label">System Status</div>
              </div>
            </div>
            
            <div className="recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {adminLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="activity-item">
                    <span className="activity-time">[{log.timestamp}]</span>
                    <span className={`activity-type ${log.type}`}>{log.type}</span>
                    <span className="activity-message">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {adminView === 'wallets' && (
          <div className="wallets-view">
            <h1>Wallet Management</h1>
            <div className="table-container">
              <table className="wallets-table">
                <thead>
                  <tr>
                    <th>Wallet</th>
                    <th>Address</th>
                    <th>Chain</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allWallets.map(wallet => (
                    <tr key={wallet.id}>
                      <td>
                        <div className="wallet-cell">
                          <span className="wallet-icon-cell">{wallet.icon}</span>
                          {wallet.name}
                        </div>
                      </td>
                      <td className="mono">{wallet.address.slice(0, 16)}...</td>
                      <td>{getNetworkName(wallet.chain)}</td>
                      <td>{wallet.balance} {wallet.type === 'evm' ? 'ETH' : 'SOL'}</td>
                      <td>
                        <span className={`status-badge ${frozenWallets.includes(wallet.address) ? 'frozen' : 'active'}`}>
                          {frozenWallets.includes(wallet.address) ? '❄️ Frozen' : '✅ Active'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {frozenWallets.includes(wallet.address) ? (
                            <button 
                              className="action-btn-small unfreeze"
                              onClick={() => unfreezeWallet(wallet.address)}
                            >
                              Unfreeze
                            </button>
                          ) : (
                            <button 
                              className="action-btn-small freeze"
                              onClick={() => freezeWallet(wallet.address)}
                            >
                              Freeze
                            </button>
                          )}
                          <button 
                            className="action-btn-small send"
                            onClick={() => adminSendTransaction(wallet.address)}
                          >
                            Send
                          </button>
                          <button 
                            className="action-btn-small refresh"
                            onClick={() => refreshBalances()}
                          >
                            Refresh
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {adminView === 'logs' && (
          <div className="logs-view">
            <h1>System Logs</h1>
            <div className="logs-controls">
              <button 
                className="clear-logs-btn"
                onClick={() => {
                  setAdminLogs([]);
                  localStorage.setItem('adminLogs', '[]');
                }}
              >
                Clear Logs
              </button>
            </div>
            <div className="logs-container">
              {adminLogs.map(log => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-wallet">[{log.wallet.slice(0, 8)}...]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
        
        {adminView === 'transactions' && (
          <div className="transactions-view">
            <h1>Transaction History</h1>
            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                    <th>Token</th>
                    <th>Network</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                      <td className="mono">{tx.from?.slice(0, 12)}...</td>
                      <td className="mono">{tx.to?.slice(0, 12)}...</td>
                      <td>{tx.amount}</td>
                      <td>{tx.token}</td>
                      <td>{tx.network}</td>
                      <td>
                        <span className="status-badge confirmed">
                          {tx.hash ? '✅ Confirmed' : '⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {adminView === 'controls' && (
          <div className="controls-view">
            <h1>System Controls</h1>
            <div className="controls-grid">
              <div className="control-card">
                <h3>💰 Force Refresh All Balances</h3>
                <p>Update balances for all tracked wallets</p>
                <button 
                  className="control-btn"
                  onClick={refreshBalances}
                >
                  Refresh Now
                </button>
              </div>
              
              <div className="control-card">
                <h3>📊 Update Token Prices</h3>
                <p>Fetch latest prices from CoinGecko</p>
                <button 
                  className="control-btn"
                  onClick={fetchTokenPrices}
                >
                  Update Prices
                </button>
              </div>
              
              <div className="control-card">
                <h3>🧹 Clear All Data</h3>
                <p>Reset all wallets and transactions</p>
                <button 
                  className="control-btn danger"
                  onClick={() => {
                    if (window.confirm('This will delete all data. Continue?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  Clear Data
                </button>
              </div>
              
              <div className="control-card">
                <h3>🔐 Security Log</h3>
                <p>View security events and access logs</p>
                <button 
                  className="control-btn"
                  onClick={() => setAdminView('logs')}
                >
                  View Logs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {adminAuthenticated ? <AdminPanel /> : <WalletPanel />}
      
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
          --border-color: #333333;
          --success: #10B981;
          --danger: #EF4444;
          --warning: #F59E0B;
          --info: #3B82F6;
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
        
        .wallet-panel, .admin-panel {
          min-height: 100vh;
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo-icon {
          font-size: 32px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        h1 {
          background: linear-gradient(45deg, var(--accent-yellow), #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        
        .header-actions {
          display: flex;
          gap: 15px;
        }
        
        .admin-btn, .theme-toggle {
          padding: 10px 20px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        }
        
        .admin-btn:hover, .theme-toggle:hover {
          background: var(--accent-yellow);
          color: var(--bg-primary);
          border-color: var(--accent-yellow);
          box-shadow: var(--shadow-glow);
        }
        
        .wallet-content {
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .connect-section {
          text-align: center;
          padding: 60px 20px;
        }
        
        .connect-header h2 {
          font-size: 36px;
          margin-bottom: 15px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .connect-header p {
          color: var(--text-secondary);
          font-size: 18px;
          margin-bottom: 50px;
        }
        
        .wallet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 25px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .wallet-card {
          background: var(--glass-bg);
          border: 2px solid var(--glass-border);
          border-radius: 20px;
          padding: 30px 20px;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        
        .wallet-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-yellow);
          box-shadow: var(--shadow-glow);
        }
        
        .wallet-card:hover .wallet-glow {
          opacity: 1;
        }
        
        .wallet-icon {
          font-size: 40px;
          margin-bottom: 15px;
        }
        
        .wallet-card h3 {
          font-size: 20px;
          margin-bottom: 8px;
        }
        
        .wallet-card p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .wallet-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--accent-glow), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        
        .wallet-overview {
          background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 30px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-card);
        }
        
        .wallet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .wallet-icon-large {
          font-size: 48px;
          background: var(--glass-bg);
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--glass-border);
        }
        
        .wallet-address {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-primary);
          padding: 10px 15px;
          border-radius: 12px;
          margin-top: 8px;
        }
        
        .wallet-address code {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .copy-btn {
          background: none;
          border: none;
          color: var(--accent-yellow);
          cursor: pointer;
          font-size: 16px;
          padding: 5px;
        }
        
        .network-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-primary);
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid var(--glass-border);
        }
        
        .network-dot {
          width: 10px;
          height: 10px;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .balance-card {
          text-align: center;
          padding: 40px;
          background: linear-gradient(135deg, rgba(245, 196, 0, 0.1), transparent);
          border-radius: 20px;
          border: 2px solid var(--glass-border);
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
        }
        
        .balance-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background: conic-gradient(from 0deg, transparent, var(--accent-yellow), transparent);
          animation: rotate 4s linear infinite;
          z-index: 1;
        }
        
        .balance-card > * {
          position: relative;
          z-index: 2;
        }
        
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        
        .balance-label {
          color: var(--text-secondary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }
        
        .balance-amount {
          font-size: 56px;
          font-weight: 700;
          margin-bottom: 10px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .balance-usd {
          color: var(--text-secondary);
          font-size: 18px;
        }
        
        .frozen-warning {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 10px;
          border-radius: 10px;
          margin-top: 15px;
          font-size: 14px;
        }
        
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 20px;
        }
        
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 10px;
          background: var(--glass-bg);
          border: 2px solid var(--glass-border);
          border-radius: 16px;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          gap: 10px;
          backdrop-filter: blur(10px);
        }
        
        .action-btn:hover:not(:disabled) {
          background: var(--accent-yellow);
          color: var(--bg-primary);
          border-color: var(--accent-yellow);
          transform: translateY(-3px);
          box-shadow: var(--shadow-glow);
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .action-icon {
          font-size: 24px;
          margin-bottom: 5px;
        }
        
        .action-btn.send {
          border-color: var(--success);
        }
        
        .action-btn.receive {
          border-color: var(--info);
        }
        
        .action-btn.swap {
          border-color: var(--warning);
        }
        
        .action-btn.disconnect {
          border-color: var(--danger);
        }
        
        .wallet-details {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        @media (max-width: 768px) {
          .wallet-details {
            grid-template-columns: 1fr;
          }
        }
        
        .detail-section {
          background: var(--bg-secondary);
          border-radius: 20px;
          padding: 25px;
          border: 1px solid var(--border-color);
        }
        
        .detail-section h3 {
          margin-bottom: 20px;
          font-size: 20px;
          color: var(--accent-yellow);
        }
        
        .tokens-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .token-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: var(--glass-bg);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          transition: all 0.3s;
        }
        
        .token-item:hover {
          border-color: var(--accent-yellow);
          transform: translateX(5px);
        }
        
        .token-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .token-symbol {
          font-weight: 600;
          font-size: 16px;
        }
        
        .token-balance {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .token-value {
          font-weight: 600;
          color: var(--accent-yellow);
        }
        
        .network-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--glass-border);
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .mono {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
        }
        
        .transactions-section {
          background: var(--bg-secondary);
          border-radius: 20px;
          padding: 25px;
          border: 1px solid var(--border-color);
        }
        
        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }
        
        .transaction-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          background: var(--glass-bg);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          transition: all 0.3s;
        }
        
        .transaction-item:hover {
          border-color: var(--accent-yellow);
          transform: translateX(5px);
        }
        
        .tx-type {
          background: var(--bg-primary);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .tx-details {
          flex: 1;
          margin: 0 20px;
        }
        
        .tx-addresses {
          color: var(--text-secondary);
          font-size: 13px;
          margin-bottom: 4px;
        }
        
        .tx-amount {
          font-weight: 600;
          color: var(--accent-yellow);
        }
        
        .tx-status {
          font-size: 20px;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
          font-style: italic;
        }
        
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
        
        .modal {
          background: var(--bg-secondary);
          border-radius: 24px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          border: 2px solid var(--glass-border);
          box-shadow: var(--shadow-glow);
          animation: modalSlide 0.3s;
        }
        
        @keyframes modalSlide {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .modal h3 {
          margin-bottom: 20px;
          color: var(--accent-yellow);
        }
        
        .modal-content {
          margin: 20px 0;
        }
        
        .modal-input {
          width: 100%;
          padding: 15px;
          background: var(--bg-primary);
          border: 2px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          margin-bottom: 15px;
          transition: all 0.3s;
        }
        
        .modal-input:focus {
          outline: none;
          border-color: var(--accent-yellow);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        
        .amount-row {
          display: flex;
          gap: 15px;
        }
        
        .token-select {
          flex: 1;
          padding: 15px;
          background: var(--bg-primary);
          border: 2px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          min-width: 120px;
        }
        
        .gas-info {
          background: var(--bg-primary);
          padding: 12px;
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 14px;
          text-align: center;
          margin-top: 15px;
        }
        
        .modal-actions {
          display: flex;
          gap: 15px;
          margin-top: 25px;
        }
        
        .confirm-btn {
          flex: 2;
          padding: 15px;
          background: var(--accent-yellow);
          border: none;
          border-radius: 12px;
          color: var(--bg-primary);
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .confirm-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }
        
        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .cancel-btn {
          flex: 1;
          padding: 15px;
          background: var(--glass-bg);
          border: 2px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .cancel-btn:hover {
          border-color: var(--danger);
          color: var(--danger);
        }
        
        .qr-container {
          display: flex;
          justify-content: center;
          margin: 30px 0;
        }
        
        .qr-placeholder {
          width: 200px;
          height: 200px;
          background: var(--bg-primary);
          border: 2px dashed var(--glass-border);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        
        .qr-icon {
          font-size: 60px;
          margin-bottom: 15px;
        }
        
        .address-display {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
          text-align: center;
        }
        
        .address-display code {
          display: block;
          font-family: 'Monaco', monospace;
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 15px;
          word-break: break-all;
        }
        
        .copy-btn-large {
          width: 100%;
          padding: 15px;
          background: var(--glass-bg);
          border: 2px solid var(--accent-yellow);
          border-radius: 12px;
          color: var(--accent-yellow);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .copy-btn-large:hover {
          background: var(--accent-yellow);
          color: var(--bg-primary);
        }
        
        .error-toast {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: var(--danger);
          color: white;
          padding: 15px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          max-width: 400px;
          z-index: 1000;
          animation: slideIn 0.3s;
          border-left: 5px solid #DC2626;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .error-toast button {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
        }
        
        /* Admin Panel Styles */
        .admin-panel {
          display: flex;
          min-height: 100vh;
        }
        
        .admin-sidebar {
          width: 280px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }
        
        .sidebar-header {
          padding: 30px 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .admin-logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .admin-icon {
          font-size: 32px;
          background: linear-gradient(45deg, gold, var(--accent-yellow));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .admin-logo h2 {
          font-size: 20px;
          background: linear-gradient(45deg, gold, var(--accent-yellow));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .sidebar-menu {
          flex: 1;
          padding: 20px 0;
        }
        
        .menu-item {
          width: 100%;
          padding: 18px 25px;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 12px;
          border-left: 4px solid transparent;
        }
        
        .menu-item:hover {
          background: rgba(245, 196, 0, 0.1);
          color: var(--accent-yellow);
          border-left-color: var(--accent-yellow);
        }
        
        .menu-item.active {
          background: rgba(245, 196, 0, 0.2);
          color: var(--accent-yellow);
          border-left-color: var(--accent-yellow);
          font-weight: 600;
        }
        
        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid var(--border-color);
        }
        
        .logout-btn {
          width: 100%;
          padding: 15px;
          background: var(--glass-bg);
          border: 2px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .logout-btn:hover {
          background: var(--accent-yellow);
          color: var(--bg-primary);
          border-color: var(--accent-yellow);
        }
        
        .admin-content {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
          background: var(--bg-primary);
        }
        
        .admin-content h1 {
          margin-bottom: 30px;
          font-size: 32px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 25px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
          border-radius: 20px;
          padding: 30px;
          text-align: center;
          border: 1px solid var(--glass-border);
          transition: all 0.3s;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-yellow);
          box-shadow: var(--shadow-glow);
        }
        
        .stat-value {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 10px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .recent-activity, .wallets-view, .logs-view, .transactions-view, .controls-view, .dashboard-view {
          background: var(--bg-secondary);
          border-radius: 24px;
          padding: 30px;
          border: 1px solid var(--border-color);
          margin-bottom: 30px;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: var(--glass-bg);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          font-size: 14px;
        }
        
        .activity-time {
          color: var(--text-tertiary);
          font-family: 'Monaco', monospace;
          min-width: 80px;
        }
        
        .activity-type {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .activity-type.connect { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .activity-type.disconnect { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .activity-type.tx { background: rgba(59, 130, 246, 0.2); color: var(--info); }
        .activity-type.admin { background: rgba(245, 196, 0, 0.2); color: var(--accent-yellow); }
        .activity-type.security { background: rgba(139, 92, 246, 0.2); color: #8B5CF6; }
        .activity-type.error { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .activity-type.info { background: rgba(156, 163, 175, 0.2); color: #9CA3AF; }
        
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
        }
        
        .wallets-table, .transactions-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        
        .wallets-table th, .transactions-table th {
          background: var(--bg-tertiary);
          padding: 18px 20px;
          text-align: left;
          color: var(--text-secondary);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
          border-bottom: 1px solid var(--glass-border);
        }
        
        .wallets-table td, .transactions-table td {
          padding: 18px 20px;
          border-bottom: 1px solid var(--glass-border);
          background: var(--bg-secondary);
        }
        
        .wallets-table tr:hover td {
          background: rgba(245, 196, 0, 0.05);
        }
        
        .wallet-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .wallet-icon-cell {
          font-size: 20px;
        }
        
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }
        
        .status-badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: var(--success);
        }
        
        .status-badge.frozen {
          background: rgba(59, 130, 246, 0.2);
          color: var(--info);
        }
        
        .status-badge.confirmed {
          background: rgba(16, 185, 129, 0.2);
          color: var(--success);
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-btn-small {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.3s;
        }
        
        .action-btn-small.freeze {
          background: rgba(59, 130, 246, 0.2);
          color: var(--info);
          border: 1px solid var(--info);
        }
        
        .action-btn-small.freeze:hover {
          background: var(--info);
          color: white;
        }
        
        .action-btn-small.unfreeze {
          background: rgba(16, 185, 129, 0.2);
          color: var(--success);
          border: 1px solid var(--success);
        }
        
        .action-btn-small.unfreeze:hover {
          background: var(--success);
          color: white;
        }
        
        .action-btn-small.send {
          background: rgba(245, 196, 0, 0.2);
          color: var(--accent-yellow);
          border: 1px solid var(--accent-yellow);
        }
        
        .action-btn-small.send:hover {
          background: var(--accent-yellow);
          color: var(--bg-primary);
        }
        
        .action-btn-small.refresh {
          background: rgba(156, 163, 175, 0.2);
          color: #9CA3AF;
          border: 1px solid #9CA3AF;
        }
        
        .action-btn-small.refresh:hover {
          background: #9CA3AF;
          color: white;
        }
        
        .logs-controls {
          margin-bottom: 20px;
        }
        
        .clear-logs-btn {
          padding: 10px 20px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid var(--danger);
          border-radius: 12px;
          color: var(--danger);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .clear-logs-btn:hover {
          background: var(--danger);
          color: white;
        }
        
        .logs-container {
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 20px;
          max-height: 500px;
          overflow-y: auto;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
        }
        
        .log-entry {
          padding: 12px;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          gap: 15px;
          align-items: center;
        }
        
        .log-entry:last-child {
          border-bottom: none;
        }
        
        .log-time {
          color: var(--text-tertiary);
          min-width: 80px;
        }
        
        .log-wallet {
          color: var(--accent-yellow);
          min-width: 100px;
        }
        
        .log-message {
          color: var(--text-primary);
          flex: 1;
        }
        
        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }
        
        .control-card {
          background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
          border-radius: 20px;
          padding: 30px;
          border: 1px solid var(--glass-border);
          transition: all 0.3s;
        }
        
        .control-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-yellow);
          box-shadow: var(--shadow-glow);
        }
        
        .control-card h3 {
          margin-bottom: 15px;
          color: var(--accent-yellow);
        }
        
        .control-card p {
          color: var(--text-secondary);
          margin-bottom: 20px;
          line-height: 1.5;
        }
        
        .control-btn {
          width: 100%;
          padding: 15px;
          background: var(--glass-bg);
          border: 2px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .control-btn:hover {
          background: var(--accent-yellow);
          color: var(--bg-primary);
          border-color: var(--accent-yellow);
        }
        
        .control-btn.danger {
          border-color: var(--danger);
          color: var(--danger);
        }
        
        .control-btn.danger:hover {
          background: var(--danger);
          color: white;
        }
        
        /* Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: var(--bg-primary);
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: var(--accent-yellow);
        }
        
        /* Loading State */
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        .loading {
          background: linear-gradient(to right, var(--bg-secondary) 4%, var(--bg-tertiary) 25%, var(--bg-secondary) 36%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .header {
            padding: 20px;
            flex-direction: column;
            gap: 15px;
          }
          
          .wallet-content {
            padding: 20px;
          }
          
          .balance-amount {
            font-size: 40px;
          }
          
          .action-buttons {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .admin-panel {
            flex-direction: column;
          }
          
          .admin-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
          }
          
          .sidebar-menu {
            display: flex;
            overflow-x: auto;
            padding: 15px;
          }
          
          .menu-item {
            white-space: nowrap;
            border-left: none;
            border-bottom: 4px solid transparent;
            padding: 12px 20px;
          }
          
          .menu-item.active {
            border-left: none;
            border-bottom-color: var(--accent-yellow);
          }
          
          .menu-item:hover {
            border-left: none;
            border-bottom-color: var(--accent-yellow);
          }
          
          .admin-content {
            padding: 20px;
          }
        }
        
        /* WalletConnect Modal Override */
        wcm-modal {
          --wcm-z-index: 9999 !important;
        }
      `}</style>
    </>
  );
}

export default App;
