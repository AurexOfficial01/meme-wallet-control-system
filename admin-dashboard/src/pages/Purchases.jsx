import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPurchases();
    const interval = setInterval(fetchPurchases, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/purchases`);
      setPurchases(response.data.purchases || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch purchase requests');
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '-';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatTxHash = (hash) => {
    if (!hash) return '-';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  const getChainBadge = (chain) => {
    const chainStyles = {
      evm: { backgroundColor: '#627eea', label: 'EVM' },
      solana: { backgroundColor: '#9945FF', label: 'Solana' },
      tron: { backgroundColor: '#FF0000', label: 'Tron' }
    };
    const style = chainStyles[chain] || { backgroundColor: '#475569', label: chain };
    
    return (
      <span style={{
        backgroundColor: style.backgroundColor,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        display: 'inline-block',
      }}>
        {style.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const isCompleted = status === 'completed';
    
    return (
      <span style={{
        backgroundColor: isCompleted ? '#10b981' : '#f59e0b',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        display: 'inline-block',
      }}>
        {isCompleted ? 'Completed' : 'Pending'}
      </span>
    );
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
    statsContainer: {
      display: 'flex',
      gap: '20px',
      marginBottom: '30px',
      flexWrap: 'wrap',
    },
    statCard: {
      backgroundColor: '#1e293b',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #334155',
      flex: '1',
      minWidth: '180px',
    },
    statLabel: {
      fontSize: '14px',
      color: '#94a3b8',
      marginBottom: '8px',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#f5c400',
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
    refreshButton: {
      backgroundColor: '#334155',
      color: '#ffffff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      fontWeight: '500',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    tableContainer: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #334155',
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
    tableRow: {
      borderBottom: '1px solid #334155',
      transition: 'background-color 0.2s',
    },
    tableRowPending: {
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
    },
    tableCell: {
      padding: '16px',
      color: '#cbd5e1',
      fontSize: '14px',
    },
    addressCell: {
      fontFamily: 'monospace',
      fontSize: '13px',
    },
    amountCell: {
      fontWeight: '600',
      color: '#ffffff',
    },
    rateCell: {
      color: '#10b981',
      fontWeight: '500',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#94a3b8',
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '20px',
      opacity: '0.5',
    },
  };

  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'pending').length,
    completed: purchases.filter(p => p.status === 'completed').length,
    totalUSD: purchases.reduce((sum, p) => sum + parseFloat(p.usdAmount || 0), 0),
    totalUSDT: purchases.reduce((sum, p) => sum + parseFloat(p.usdtAmount || 0), 0),
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>USDT Purchases</h1>
        <p style={styles.subtitle}>Monitor all USDT purchase requests from users</p>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Purchases</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending</div>
          <div style={styles.statValue}>{stats.pending}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Completed</div>
          <div style={styles.statValue}>{stats.completed}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total USD</div>
          <div style={styles.statValue}>${stats.totalUSD.toFixed(2)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total USDT</div>
          <div style={styles.statValue}>{stats.totalUSDT.toFixed(2)}</div>
        </div>
      </div>

      <button
        style={styles.refreshButton}
        onClick={fetchPurchases}
        disabled={loading}
      >
        🔄 Refresh Purchases
      </button>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Loading purchase requests...</div>
        ) : purchases.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💰</div>
            <h3 style={{ color: '#cbd5e1', marginBottom: '10px' }}>
              No Purchase Requests
            </h3>
            <p style={{ color: '#94a3b8' }}>
              Purchase requests will appear here when users buy USDT
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>ID</th>
                <th style={styles.tableHeader}>Wallet</th>
                <th style={styles.tableHeader}>Chain</th>
                <th style={styles.tableHeader}>USD Amount</th>
                <th style={styles.tableHeader}>USDT</th>
                <th style={styles.tableHeader}>Rate</th>
                <th style={styles.tableHeader}>Payment</th>
                <th style={styles.tableHeader}>Tx Hash</th>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr
                  key={purchase.purchaseId}
                  style={{
                    ...styles.tableRow,
                    ...(purchase.status === 'pending' ? styles.tableRowPending : {})
                  }}
                >
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {purchase.purchaseId?.slice(0, 8)}...
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {formatAddress(purchase.walletAddress)}
                  </td>
                  <td style={styles.tableCell}>
                    {getChainBadge(purchase.chain)}
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.amountCell }}>
                    ${parseFloat(purchase.usdAmount).toFixed(2)}
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.amountCell }}>
                    {parseFloat(purchase.usdtAmount).toFixed(2)}
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.rateCell }}>
                    {parseFloat(purchase.rate).toFixed(2)}
                  </td>
                  <td style={styles.tableCell}>
                    {purchase.paymentMethod || 'N/A'}
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {formatTxHash(purchase.transactionHash)}
                  </td>
                  <td style={styles.tableCell}>
                    {formatDate(purchase.timestamp)}
                  </td>
                  <td style={styles.tableCell}>
                    {getStatusBadge(purchase.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
