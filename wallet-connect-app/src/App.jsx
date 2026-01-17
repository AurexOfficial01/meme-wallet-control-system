import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const WALLETCONNECT_PROJECT_ID = "fb91c2fb42af27391dcfa9dcfe40edc7";
const WALLETCONNECT_METADATA = {
  name: "Multi-Wallet Dashboard",
  description: "Unified wallet management dashboard",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const METAPLEX_API = "https://api.mainnet-beta.solana.com";

function App() {
  const [theme, setTheme] = useState('light');
  const [wallets, setWallets] = useState([]);
  const [activeWallet, setActiveWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [evmTokenPrices, setEvmTokenPrices] = useState({});
  const [solTokenPrices, setSolTokenPrices] = useState({});
  
  const [evmProvider, setEvmProvider] = useState(null);
  const [evmChainId, setEvmChainId] = useState('');
  const [evmNetwork, setEvmNetwork] = useState('');
  const [evmNativeBalance, setEvmNativeBalance] = useState('0');
  const [evmTokens, setEvmTokens] = useState([]);
  const [evmNfts, setEvmNfts] = useState([]);
  const [evmGasPrice, setEvmGasPrice] = useState('0');
  
  const [solProvider, setSolProvider] = useState(null);
  const [solNetwork, setSolNetwork] = useState('');
  const [solBalance, setSolBalance] = useState('0');
  const [solTokens, setSolTokens] = useState([]);
  const [solNfts, setSolNfts] = useState([]);
  
  const [transactionPreview, setTransactionPreview] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setDebugLog(prev => [logEntry, ...prev.slice(0, 99)]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  const addTransaction = useCallback((tx) => {
    const txWithId = { ...tx, id: Date.now(), timestamp: new Date().toISOString() };
    setTransactionHistory(prev => [txWithId, ...prev.slice(0, 49)]);
    localStorage.setItem('transactionHistory', JSON.stringify([txWithId, ...transactionHistory.slice(0, 49)]));
  }, [transactionHistory]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
    setWallets(savedWallets);
    addLog(`Loaded ${savedWallets.length} saved wallets`, 'info');

    const savedHistory = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
    setTransactionHistory(savedHistory);

    fetchTokenPrices();
    const priceInterval = setInterval(fetchTokenPrices, 60000);
    const balanceInterval = setInterval(refreshAllBalances, 10000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(balanceInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchTokenPrices = async () => {
    try {
      const evmResponse = await fetch(`${COINGECKO_API}?ids=ethereum,binancecoin,matic-network,arbitrum,optimism&vs_currencies=usd`);
      const evmData = await evmResponse.json();
      setEvmTokenPrices(evmData);
      
      const solResponse = await fetch(`${COINGECKO_API}?ids=solana&vs_currencies=usd`);
      const solData = await solResponse.json();
      setSolTokenPrices(solData);
    } catch (err) {
      addLog(`Failed to fetch token prices: ${err.message}`, 'error');
    }
  };

  const refreshAllBalances = async () => {
    if (activeWallet) {
      if (activeWallet.type === 'evm' && evmProvider) {
        await refreshEvmBalance();
      } else if (activeWallet.type === 'solana' && solProvider) {
        await refreshSolanaBalance();
      }
    }
  };

  const detectEvmWallets = () => {
    const detected = [];
    if (typeof window.ethereum !== 'undefined') {
      detected.push({ id: 'metamask', name: 'MetaMask', type: 'evm', icon: '🦊' });
      if (window.ethereum.isTrust) {
        detected.push({ id: 'trust', name: 'Trust Wallet', type: 'evm', icon: '🔒' });
      }
    }
    detected.push({ id: 'walletconnect', name: 'WalletConnect', type: 'evm', icon: '🔗' });
    return detected;
  };

  const detectSolanaWallets = () => {
    const detected = [];
    if (typeof window.phantom !== 'undefined' && window.phantom.solana?.isPhantom) {
      detected.push({ id: 'phantom', name: 'Phantom', type: 'solana', icon: '👻' });
    }
    if (typeof window.backpack !== 'undefined') {
      detected.push({ id: 'backpack', name: 'Backpack', type: 'solana', icon: '🎒' });
    }
    return detected;
  };

  const connectEvmWallet = async (walletType) => {
    setIsLoading(true);
    setError('');
    
    try {
      if (walletType === 'walletconnect') {
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          qrModalOptions: { themeMode: theme },
          chains: [1],
          events: ['chainChanged', 'accountsChanged'],
          methods: ['eth_sendTransaction', 'personal_sign'],
          metadata: WALLETCONNECT_METADATA,
        });

        await provider.connect();
        const accounts = await provider.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          const address = accounts[0];
          const chainId = await provider.request({ method: 'eth_chainId' });
          const network = getEvmNetworkName(chainId);
          
          setEvmProvider(provider);
          setEvmChainId(chainId);
          setEvmNetwork(network);
          
          const newWallet = {
            id: `evm-${Date.now()}`,
            address,
            type: 'evm',
            name: `EVM ${address.slice(0, 6)}...${address.slice(-4)}`,
            provider: 'walletconnect',
            chainId,
            network
          };
          
          addWallet(newWallet);
          await refreshEvmBalance(provider, address, chainId);
          
          provider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
              disconnectEvmWallet();
            } else {
              const updatedWallet = { ...newWallet, address: accounts[0] };
              updateWallet(newWallet.id, updatedWallet);
            }
          });
          
          provider.on('chainChanged', (chainId) => {
            setEvmChainId(chainId);
            setEvmNetwork(getEvmNetworkName(chainId));
          });
          
          addLog(`Connected EVM wallet via WalletConnect: ${address}`, 'success');
        }
      } else {
        if (typeof window.ethereum === 'undefined') {
          throw new Error('No EVM wallet detected');
        }
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          const address = accounts[0];
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const network = getEvmNetworkName(chainId);
          
          setEvmProvider(window.ethereum);
          setEvmChainId(chainId);
          setEvmNetwork(network);
          
          const newWallet = {
            id: `evm-${Date.now()}`,
            address,
            type: 'evm',
            name: `${walletType === 'metamask' ? 'MetaMask' : 'Trust'} ${address.slice(0, 6)}...${address.slice(-4)}`,
            provider: walletType,
            chainId,
            network
          };
          
          addWallet(newWallet);
          await refreshEvmBalance(window.ethereum, address, chainId);
          
          addLog(`Connected EVM wallet via ${walletType}: ${address}`, 'success');
        }
      }
    } catch (err) {
      setError(`Failed to connect EVM wallet: ${err.message}`);
      addLog(`EVM connection failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const connectSolanaWallet = async (walletType) => {
    setIsLoading(true);
    setError('');
    
    try {
      let provider;
      if (walletType === 'phantom') {
        provider = window.phantom?.solana;
        if (!provider) throw new Error('Phantom wallet not installed');
      } else if (walletType === 'backpack') {
        provider = window.backpack;
        if (!provider) throw new Error('Backpack wallet not installed');
      } else {
        throw new Error('Unsupported Solana wallet');
      }
      
      const response = await provider.connect();
      const address = response.publicKey.toString();
      const network = provider.isConnected ? 'mainnet-beta' : 'devnet';
      
      setSolProvider(provider);
      setSolNetwork(network);
      
      const newWallet = {
        id: `sol-${Date.now()}`,
        address,
        type: 'solana',
        name: `${walletType === 'phantom' ? 'Phantom' : 'Backpack'} ${address.slice(0, 6)}...${address.slice(-4)}`,
        provider: walletType,
        network
      };
      
      addWallet(newWallet);
      await refreshSolanaBalance(provider, address);
      
      addLog(`Connected Solana wallet via ${walletType}: ${address}`, 'success');
    } catch (err) {
      setError(`Failed to connect Solana wallet: ${err.message}`);
      addLog(`Solana connection failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEvmBalance = async (provider = evmProvider, address = activeWallet?.address, chainId = evmChainId) => {
    if (!provider || !address) return;
    
    try {
      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"]
      });
      const balance = ethers.formatEther(balanceHex);
      setEvmNativeBalance(balance);
      
      const gasPriceHex = await provider.request({ method: "eth_gasPrice" });
      const gasPrice = ethers.formatUnits(gasPriceHex, 'gwei');
      setEvmGasPrice(gasPrice);
      
      await fetchEvmTokens(provider, address, chainId);
      await fetchEvmNfts(provider, address, chainId);
      
      addLog(`Refreshed EVM balance: ${balance} ETH`, 'info');
    } catch (err) {
      addLog(`Failed to refresh EVM balance: ${err.message}`, 'error');
    }
  };

  const refreshSolanaBalance = async (provider = solProvider, address = activeWallet?.address) => {
    if (!provider || !address) return;
    
    try {
      const connection = new window.solanaWeb3.Connection(
        solNetwork === 'mainnet-beta' 
          ? 'https://api.mainnet-beta.solana.com' 
          : 'https://api.devnet.solana.com'
      );
      
      const publicKey = new window.solanaWeb3.PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / 1e9;
      setSolBalance(solBalance.toString());
      
      await fetchSolanaTokens(connection, publicKey);
      await fetchSolanaNfts(connection, publicKey);
      
      addLog(`Refreshed Solana balance: ${solBalance} SOL`, 'info');
    } catch (err) {
      addLog(`Failed to refresh Solana balance: ${err.message}`, 'error');
    }
  };

  const fetchEvmTokens = async (provider, address, chainId) => {
    try {
      const tokenList = [
        { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
      ];
      
      const tokens = [];
      for (const token of tokenList) {
        try {
          const balanceHex = await provider.request({
            method: "eth_call",
            params: [{
              to: token.address,
              data: `0x70a08231000000000000000000000000${address.slice(2)}`
            }, "latest"]
          });
          
          if (balanceHex !== '0x') {
            const balance = ethers.formatUnits(balanceHex, 6);
            tokens.push({ ...token, balance });
          }
        } catch (err) {
          console.log(`Failed to fetch ${token.symbol} balance:`, err.message);
        }
      }
      
      setEvmTokens(tokens);
    } catch (err) {
      addLog(`Failed to fetch EVM tokens: ${err.message}`, 'error');
    }
  };

  const fetchEvmNfts = async (provider, address, chainId) => {
    try {
      const nftContracts = [
        { name: 'BAYC', address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' },
        { name: 'MAYC', address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6' },
      ];
      
      const nfts = [];
      for (const nft of nftContracts) {
        try {
          const balanceHex = await provider.request({
            method: "eth_call",
            params: [{
              to: nft.address,
              data: `0x70a08231000000000000000000000000${address.slice(2)}`
            }, "latest"]
          });
          
          const balance = parseInt(balanceHex, 16);
          if (balance > 0) {
            nfts.push({ ...nft, balance });
          }
        } catch (err) {
          console.log(`Failed to fetch ${nft.name} NFTs:`, err.message);
        }
      }
      
      setEvmNfts(nfts);
    } catch (err) {
      addLog(`Failed to fetch EVM NFTs: ${err.message}`, 'error');
    }
  };

  const fetchSolanaTokens = async (connection, publicKey) => {
    try {
      const tokens = [];
      setSolTokens(tokens);
    } catch (err) {
      addLog(`Failed to fetch Solana tokens: ${err.message}`, 'error');
    }
  };

  const fetchSolanaNfts = async (connection, publicKey) => {
    try {
      const nfts = [];
      setSolNfts(nfts);
    } catch (err) {
      addLog(`Failed to fetch Solana NFTs: ${err.message}`, 'error');
    }
  };

  const getEvmNetworkName = (chainId) => {
    const networks = {
      '0x1': 'Ethereum',
      '0x38': 'BNB Chain',
      '0x89': 'Polygon',
      '0xa4b1': 'Arbitrum',
      '0xa': 'Optimism',
      '0xaa36a7': 'Sepolia',
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  const addWallet = (wallet) => {
    const exists = wallets.find(w => w.address === wallet.address && w.type === wallet.type);
    if (!exists) {
      const updatedWallets = [...wallets, wallet];
      setWallets(updatedWallets);
      setActiveWallet(wallet);
      addLog(`Added wallet: ${wallet.name}`, 'success');
    } else {
      setActiveWallet(exists);
    }
  };

  const updateWallet = (walletId, updates) => {
    setWallets(prev => prev.map(w => w.id === walletId ? { ...w, ...updates } : w));
    if (activeWallet?.id === walletId) {
      setActiveWallet(prev => ({ ...prev, ...updates }));
    }
  };

  const removeWallet = (walletId) => {
    setWallets(prev => prev.filter(w => w.id !== walletId));
    if (activeWallet?.id === walletId) {
      setActiveWallet(wallets.find(w => w.id !== walletId) || null);
    }
    addLog(`Removed wallet`, 'info');
  };

  const prepareEvmTransaction = async (type, params) => {
    if (!evmProvider || !activeWallet) {
      setError('No active EVM wallet');
      return;
    }
    
    try {
      let transaction;
      switch (type) {
        case 'native':
          transaction = {
            from: activeWallet.address,
            to: params.to,
            value: ethers.parseEther(params.amount).toString(),
            chainId: parseInt(evmChainId, 16)
          };
          break;
        case 'erc20':
          transaction = {
            from: activeWallet.address,
            to: params.tokenAddress,
            data: `0xa9059cbb${params.to.slice(2).padStart(64, '0')}${ethers.parseUnits(params.amount, 6).toString(16).padStart(64, '0')}`
          };
          break;
        default:
          throw new Error('Unsupported transaction type');
      }
      
      const gasEstimate = await evmProvider.request({
        method: "eth_estimateGas",
        params: [transaction]
      });
      
      transaction.gas = gasEstimate;
      
      setTransactionPreview({
        type,
        transaction,
        from: activeWallet.address,
        to: params.to,
        amount: params.amount,
        token: params.tokenSymbol || 'ETH',
        gas: ethers.formatUnits(gasEstimate, 0),
        network: evmNetwork
      });
      setShowTransactionModal(true);
      
      addLog(`Prepared ${type} transaction to ${params.to}`, 'info');
    } catch (err) {
      setError(`Failed to prepare transaction: ${err.message}`);
      addLog(`Transaction preparation failed: ${err.message}`, 'error');
    }
  };

  const prepareSolanaTransaction = async (type, params) => {
    if (!solProvider || !activeWallet) {
      setError('No active Solana wallet');
      return;
    }
    
    try {
      let transaction;
      switch (type) {
        case 'sol':
          transaction = {
            type: 'SOL Transfer',
            from: activeWallet.address,
            to: params.to,
            amount: params.amount,
            token: 'SOL'
          };
          break;
        case 'spl':
          transaction = {
            type: 'SPL Token Transfer',
            from: activeWallet.address,
            to: params.to,
            amount: params.amount,
            token: params.tokenSymbol || 'Token'
          };
          break;
        default:
          throw new Error('Unsupported transaction type');
      }
      
      setTransactionPreview({
        type,
        transaction,
        from: activeWallet.address,
        to: params.to,
        amount: params.amount,
        token: params.tokenSymbol || 'SOL',
        network: solNetwork
      });
      setShowTransactionModal(true);
      
      addLog(`Prepared ${type} transaction to ${params.to}`, 'info');
    } catch (err) {
      setError(`Failed to prepare transaction: ${err.message}`);
      addLog(`Transaction preparation failed: ${err.message}`, 'error');
    }
  };

  const executeEvmTransaction = async () => {
    if (!transactionPreview || !evmProvider) return;
    
    setIsLoading(true);
    try {
      const txHash = await evmProvider.request({
        method: "eth_sendTransaction",
        params: [transactionPreview.transaction]
      });
      
      addTransaction({
        hash: txHash,
        type: transactionPreview.type,
        from: transactionPreview.from,
        to: transactionPreview.to,
        amount: transactionPreview.amount,
        token: transactionPreview.token,
        network: evmNetwork,
        status: 'pending'
      });
      
      addLog(`Transaction sent: ${txHash}`, 'success');
      setShowTransactionModal(false);
      setTransactionPreview(null);
      
      setTimeout(() => refreshEvmBalance(), 5000);
    } catch (err) {
      setError(`Transaction failed: ${err.message}`);
      addLog(`Transaction execution failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const executeSolanaTransaction = async () => {
    if (!transactionPreview || !solProvider) return;
    
    setIsLoading(true);
    try {
      const { solanaWeb3 } = window;
      const connection = new solanaWeb3.Connection(
        solNetwork === 'mainnet-beta' 
          ? 'https://api.mainnet-beta.solana.com' 
          : 'https://api.devnet.solana.com'
      );
      
      const fromPubkey = new solanaWeb3.PublicKey(transactionPreview.from);
      const toPubkey = new solanaWeb3.PublicKey(transactionPreview.to);
      
      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: solanaWeb3.LAMPORTS_PER_SOL * parseFloat(transactionPreview.amount)
        })
      );
      
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      const signed = await solProvider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      addTransaction({
        hash: signature,
        type: transactionPreview.type,
        from: transactionPreview.from,
        to: transactionPreview.to,
        amount: transactionPreview.amount,
        token: transactionPreview.token,
        network: solNetwork,
        status: 'pending'
      });
      
      addLog(`Transaction sent: ${signature}`, 'success');
      setShowTransactionModal(false);
      setTransactionPreview(null);
      
      setTimeout(() => refreshSolanaBalance(), 5000);
    } catch (err) {
      setError(`Transaction failed: ${err.message}`);
      addLog(`Transaction execution failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectEvmWallet = () => {
    if (evmProvider?.disconnect) {
      evmProvider.disconnect();
    }
    setEvmProvider(null);
    setEvmChainId('');
    setEvmNetwork('');
    setEvmNativeBalance('0');
    setEvmTokens([]);
    setEvmNfts([]);
    addLog('Disconnected EVM wallet', 'info');
  };

  const disconnectSolanaWallet = () => {
    if (solProvider?.disconnect) {
      solProvider.disconnect();
    }
    setSolProvider(null);
    setSolNetwork('');
    setSolBalance('0');
    setSolTokens([]);
    setSolNfts([]);
    addLog('Disconnected Solana wallet', 'info');
  };

  const calculateTotalPortfolio = () => {
    let total = 0;
    
    if (activeWallet?.type === 'evm') {
      const ethPrice = evmTokenPrices?.ethereum?.usd || 0;
      total += parseFloat(evmNativeBalance) * ethPrice;
      
      evmTokens.forEach(token => {
        const tokenPrice = evmTokenPrices[token.symbol?.toLowerCase()]?.usd || 1;
        total += parseFloat(token.balance) * tokenPrice;
      });
    } else if (activeWallet?.type === 'solana') {
      const solPrice = solTokenPrices?.solana?.usd || 0;
      total += parseFloat(solBalance) * solPrice;
    }
    
    return total.toFixed(2);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderWalletConnectors = () => {
    const evmWallets = detectEvmWallets();
    const solanaWallets = detectSolanaWallets();
    
    return (
      <div className="connector-grid">
        <div className="connector-section">
          <h3>EVM Wallets</h3>
          {evmWallets.map(wallet => (
            <button
              key={wallet.id}
              onClick={() => connectEvmWallet(wallet.id)}
              disabled={isLoading}
              className="connector-btn"
            >
              <span className="wallet-icon">{wallet.icon}</span>
              {wallet.name}
            </button>
          ))}
        </div>
        
        <div className="connector-section">
          <h3>Solana Wallets</h3>
          {solanaWallets.map(wallet => (
            <button
              key={wallet.id}
              onClick={() => connectSolanaWallet(wallet.id)}
              disabled={isLoading}
              className="connector-btn"
            >
              <span className="wallet-icon">{wallet.icon}</span>
              {wallet.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderActiveWallet = () => {
    if (!activeWallet) return null;
    
    const totalPortfolio = calculateTotalPortfolio();
    
    return (
      <div className="active-wallet">
        <div className="wallet-header">
          <h3>{activeWallet.name}</h3>
          <span className={`wallet-type ${activeWallet.type}`}>
            {activeWallet.type.toUpperCase()}
          </span>
          <span className="wallet-network">{activeWallet.network}</span>
        </div>
        
        <div className="wallet-address">
          <code>{activeWallet.address}</code>
          <button 
            onClick={() => navigator.clipboard.writeText(activeWallet.address)}
            className="copy-btn"
          >
            📋
          </button>
        </div>
        
        <div className="portfolio-summary">
          <h4>Portfolio Value</h4>
          <div className="portfolio-value">${totalPortfolio} USD</div>
        </div>
        
        {activeWallet.type === 'evm' && (
          <div className="balance-section">
            <h4>EVM Assets</h4>
            <div className="native-balance">
              <strong>Native:</strong> {evmNativeBalance} ETH
              <span className="usd-value">
                ${(parseFloat(evmNativeBalance) * (evmTokenPrices?.ethereum?.usd || 0)).toFixed(2)}
              </span>
            </div>
            <div className="gas-price">
              <strong>Gas Price:</strong> {evmGasPrice} Gwei
            </div>
            
            {evmTokens.length > 0 && (
              <div className="tokens-list">
                <h5>Tokens</h5>
                {evmTokens.map(token => (
                  <div key={token.address} className="token-item">
                    <span>{token.symbol}:</span>
                    <span>{token.balance}</span>
                  </div>
                ))}
              </div>
            )}
            
            {evmNfts.length > 0 && (
              <div className="nfts-list">
                <h5>NFTs</h5>
                {evmNfts.map(nft => (
                  <div key={nft.address} className="nft-item">
                    <span>{nft.name}:</span>
                    <span>{nft.balance}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="transaction-buttons">
              <button 
                onClick={() => prepareEvmTransaction('native', { to: '0x', amount: '0.01' })}
                className="tx-btn"
              >
                Send ETH
              </button>
              <button 
                onClick={() => prepareEvmTransaction('erc20', { 
                  to: '0x', 
                  amount: '10', 
                  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                  tokenSymbol: 'USDC'
                })}
                className="tx-btn"
              >
                Send USDC
              </button>
            </div>
          </div>
        )}
        
        {activeWallet.type === 'solana' && (
          <div className="balance-section">
            <h4>Solana Assets</h4>
            <div className="native-balance">
              <strong>SOL:</strong> {solBalance} SOL
              <span className="usd-value">
                ${(parseFloat(solBalance) * (solTokenPrices?.solana?.usd || 0)).toFixed(2)}
              </span>
            </div>
            
            <div className="transaction-buttons">
              <button 
                onClick={() => prepareSolanaTransaction('sol', { to: '', amount: '0.1' })}
                className="tx-btn"
              >
                Send SOL
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWalletList = () => {
    if (wallets.length === 0) return null;
    
    return (
      <div className="wallet-list">
        <h3>Connected Wallets ({wallets.length})</h3>
        {wallets.map(wallet => (
          <div 
            key={wallet.id} 
            className={`wallet-item ${activeWallet?.id === wallet.id ? 'active' : ''}`}
            onClick={() => setActiveWallet(wallet)}
          >
            <div className="wallet-info">
              <span className="wallet-icon">
                {wallet.type === 'evm' ? '⛓️' : '🔷'}
              </span>
              <div>
                <div className="wallet-name">{wallet.name}</div>
                <div className="wallet-address">
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                </div>
                <div className="wallet-network">{wallet.network}</div>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeWallet(wallet.id);
              }}
              className="remove-btn"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <h1>Multi-Wallet Dashboard</h1>
        <div className="header-controls">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={refreshAllBalances} disabled={isLoading} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </header>
      
      <main className="main-content">
        <div className="left-panel">
          <div className="section">
            <h2>Connect Wallet</h2>
            {renderWalletConnectors()}
          </div>
          
          <div className="section">
            <h2>Transaction History</h2>
            <div className="transaction-history">
              {transactionHistory.slice(0, 5).map(tx => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-type">{tx.type}</div>
                  <div className="tx-details">
                    {tx.from?.slice(0, 6)}... → {tx.to?.slice(0, 6)}...
                  </div>
                  <div className="tx-amount">{tx.amount} {tx.token}</div>
                </div>
              ))}
              {transactionHistory.length === 0 && (
                <div className="empty-state">No transactions yet</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="center-panel">
          <div className="section">
            <h2>Active Wallet</h2>
            {activeWallet ? renderActiveWallet() : (
              <div className="empty-state">
                <p>No active wallet selected</p>
                <p>Connect a wallet to get started</p>
              </div>
            )}
          </div>
          
          <div className="section">
            <h2>Wallet Portfolio</h2>
            {renderWalletList()}
          </div>
        </div>
        
        <div className="right-panel">
          <div className="section">
            <h2>Debug Console</h2>
            <div className="debug-console">
              {debugLog.map((log, index) => (
                <div key={index} className={`log-entry ${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              {debugLog.length === 0 && (
                <div className="empty-state">No logs yet</div>
              )}
            </div>
            <button 
              onClick={() => setDebugLog([])} 
              className="clear-log-btn"
            >
              Clear Log
            </button>
          </div>
          
          <div className="section">
            <h2>System Status</h2>
            <div className="system-status">
              <div className="status-item">
                <span>Active Wallets:</span>
                <span>{wallets.length}</span>
              </div>
              <div className="status-item">
                <span>Theme:</span>
                <span>{theme}</span>
              </div>
              <div className="status-item">
                <span>ETH Price:</span>
                <span>${evmTokenPrices?.ethereum?.usd || 'N/A'}</span>
              </div>
              <div className="status-item">
                <span>SOL Price:</span>
                <span>${solTokenPrices?.solana?.usd || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {showTransactionModal && transactionPreview && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Transaction Preview</h3>
            <div className="transaction-details">
              <div className="detail-row">
                <span>Type:</span>
                <span>{transactionPreview.type}</span>
              </div>
              <div className="detail-row">
                <span>From:</span>
                <span>{transactionPreview.from.slice(0, 12)}...</span>
              </div>
              <div className="detail-row">
                <span>To:</span>
                <span>{transactionPreview.to.slice(0, 12)}...</span>
              </div>
              <div className="detail-row">
                <span>Amount:</span>
                <span>{transactionPreview.amount} {transactionPreview.token}</span>
              </div>
              <div className="detail-row">
                <span>Network:</span>
                <span>{transactionPreview.network}</span>
              </div>
              {transactionPreview.gas && (
                <div className="detail-row">
                  <span>Gas:</span>
                  <span>{transactionPreview.gas} units</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => {
                  if (activeWallet?.type === 'evm') executeEvmTransaction();
                  else executeSolanaTransaction();
                }}
                disabled={isLoading}
                className="confirm-btn"
              >
                {isLoading ? 'Processing...' : 'Confirm in Wallet'}
              </button>
              <button 
                onClick={() => {
                  setShowTransactionModal(false);
                  setTransactionPreview(null);
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
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      
      <style jsx>{`
        :root[data-theme="light"] {
          --bg-primary: #f8fafc;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border-color: #e2e8f0;
          --accent-primary: #3b82f6;
          --accent-danger: #ef4444;
          --accent-success: #10b981;
          --shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        :root[data-theme="dark"] {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --border-color: #475569;
          --accent-primary: #60a5fa;
          --accent-danger: #f87171;
          --accent-success: #34d399;
          --shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          transition: background-color 0.3s, color 0.3s;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
        }
        
        .app {
          min-height: 100vh;
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 600;
        }
        
        .header-controls {
          display: flex;
          gap: 10px;
        }
        
        .main-content {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .section {
          background-color: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--shadow);
          margin-bottom: 20px;
        }
        
        .section h2 {
          font-size: 18px;
          margin-bottom: 15px;
          color: var(--text-primary);
        }
        
        .section h3, .section h4, .section h5 {
          margin-bottom: 10px;
          color: var(--text-primary);
        }
        
        .connector-grid {
          display: grid;
          gap: 15px;
        }
        
        .connector-section {
          background-color: var(--bg-tertiary);
          padding: 15px;
          border-radius: 8px;
        }
        
        .connector-btn {
          width: 100%;
          padding: 12px;
          margin-bottom: 8px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
        }
        
        .connector-btn:hover:not(:disabled) {
          background-color: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }
        
        .connector-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wallet-icon {
          font-size: 20px;
        }
        
        .active-wallet {
          background-color: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
          border: 2px solid var(--accent-primary);
        }
        
        .wallet-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }
        
        .wallet-type {
          background-color: var(--accent-primary);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .wallet-type.evm {
          background-color: #8b5cf6;
        }
        
        .wallet-type.solana {
          background-color: #14b8a6;
        }
        
        .wallet-network {
          background-color: var(--bg-primary);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .wallet-address {
          background-color: var(--bg-primary);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .wallet-address code {
          font-family: monospace;
          color: var(--text-primary);
          font-size: 14px;
        }
        
        .copy-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
        }
        
        .copy-btn:hover {
          color: var(--accent-primary);
        }
        
        .portfolio-summary {
          text-align: center;
          margin-bottom: 20px;
          padding: 20px;
          background: linear-gradient(135deg, var(--accent-primary), #8b5cf6);
          border-radius: 8px;
          color: white;
        }
        
        .portfolio-value {
          font-size: 32px;
          font-weight: 700;
          margin-top: 10px;
        }
        
        .balance-section {
          background-color: var(--bg-primary);
          padding: 15px;
          border-radius: 8px;
        }
        
        .native-balance {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .usd-value {
          color: var(--accent-success);
          font-weight: 600;
        }
        
        .gas-price {
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .tokens-list, .nfts-list {
          margin-top: 15px;
        }
        
        .token-item, .nft-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed var(--border-color);
        }
        
        .transaction-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .tx-btn {
          flex: 1;
          padding: 10px;
          background-color: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        
        .tx-btn:hover {
          opacity: 0.9;
        }
        
        .wallet-list {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .wallet-item {
          background-color: var(--bg-tertiary);
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .wallet-item:hover {
          border-color: var(--accent-primary);
        }
        
        .wallet-item.active {
          border-color: var(--accent-primary);
          background-color: rgba(59, 130, 246, 0.1);
        }
        
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .wallet-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .wallet-address, .wallet-network {
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .remove-btn {
          background: var(--accent-danger);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .remove-btn:hover {
          opacity: 0.9;
        }
        
        .transaction-history {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .transaction-item {
          background-color: var(--bg-tertiary);
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          border-left: 3px solid var(--accent-primary);
        }
        
        .tx-type {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        
        .tx-details {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        
        .tx-amount {
          font-weight: 600;
          color: var(--accent-primary);
        }
        
        .empty-state {
          text-align: center;
          padding: 30px;
          color: var(--text-secondary);
          font-style: italic;
        }
        
        .debug-console {
          background-color: var(--bg-primary);
          border-radius: 6px;
          padding: 15px;
          max-height: 300px;
          overflow-y: auto;
          font-family: monospace;
          font-size: 12px;
        }
        
        .log-entry {
          padding: 4px 0;
          border-bottom: 1px dashed var(--border-color);
        }
        
        .log-entry.info {
          color: var(--text-secondary);
        }
        
        .log-entry.success {
          color: var(--accent-success);
        }
        
        .log-entry.error {
          color: var(--accent-danger);
        }
        
        .log-time {
          color: var(--text-secondary);
          margin-right: 10px;
        }
        
        .clear-log-btn {
          width: 100%;
          padding: 8px;
          margin-top: 10px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          cursor: pointer;
        }
        
        .system-status {
          background-color: var(--bg-tertiary);
          padding: 15px;
          border-radius: 8px;
        }
        
        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal {
          background-color: var(--bg-secondary);
          padding: 30px;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: var(--shadow);
        }
        
        .transaction-details {
          background-color: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-actions {
          display: flex;
          gap: 10px;
        }
        
        .confirm-btn {
          flex: 2;
          padding: 12px;
          background-color: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        
        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .cancel-btn {
          flex: 1;
          padding: 12px;
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
        }
        
        .error-alert {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: var(--accent-danger);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          max-width: 400px;
          box-shadow: var(--shadow);
        }
        
        .error-alert button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 18px;
        }
        
        .theme-toggle, .refresh-btn {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 16px;
        }
        
        .theme-toggle:hover, .refresh-btn:hover:not(:disabled) {
          background-color: var(--accent-primary);
          color: white;
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 1200px) {
          .main-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
