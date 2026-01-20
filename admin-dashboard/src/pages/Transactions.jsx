import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/transactions`);
      setTransactions(response.data.transactions || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
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

  const getStatusBadge = (status, txHash) => {
    const isCompleted = status === 'completed';
    const hasHash = !!txHash;
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <span style={{
          backgroundColor: isCompleted ? '#10b981' : '#f59e0b',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'inline-block',
          width: 'fit-content',
        }}>
          {isCompleted ? 'Completed' : 'Pending'}
        </span>
        {hasHash && (
          <span style={{
            fontSize: '11px',
            color: '#94a3b8',
            fontFamily: 'monospace',
          }}>
            Hash: {txHash.slice(0, 10)}...
          </span>
        )}
      </div>
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
      minWidth: '200px',
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
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderLeft: '3px solid #f59e0b',
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
    amountCell: {
      fontWeight: '600',
      color: '#ffffff',
    },
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Transaction Monitor</h1>
        <p style={styles.subtitle}>
          Real-time monitoring of all admin-initiated transactions across connected wallets
        </p>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Transactions</div>
          <div style={styles.statValue}>{transactions.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending</div>
          <div style={styles.statValue}>{pendingCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Completed</div>
          <div style={styles.statValue}>{completedCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Amount</div>
          <div style={styles.statValue}>{totalAmount.toFixed(6)}</div>
        </div>
      </div>

      <button
        style={styles.refreshButton}
        onClick={fetchTransactions}
        disabled={loading}
      >
        🔄 Refresh Transactions
      </button>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📊</div>
            <h3 style={{ color: '#cbd5e1', marginBottom: '10px' }}>
              No Transactions Yet
            </h3>
            <p style={{ color: '#94a3b8' }}>
              Transactions will appear here once prepared by admin
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>ID</th>
                <th style={styles.tableHeader}>From</th>
                <th style={styles.tableHeader}>To</th>
                <th style={styles.tableHeader}>Chain</th>
                <th style={styles.tableHeader}>Asset</th>
                <th style={styles.tableHeader}>Amount</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Created</th>
                <th style={styles.tableHeader}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.transactionId}
                  style={{
                    ...styles.tableRow,
                    ...(tx.status === 'pending' ? styles.tableRowPending : {})
                  }}
                >
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {tx.transactionId?.slice(0, 8)}...
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {formatAddress(tx.fromAddress)}
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.addressCell }}>
                    {formatAddress(tx.toAddress)}
                  </td>
                  <td style={styles.tableCell}>
                    {getChainBadge(tx.chain)}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      backgroundColor: tx.asset === 'USDT' ? '#26a17b' : '#3b82f6',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}>
                      {tx.asset}
                    </span>
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.amountCell }}>
                    {parseFloat(tx.amount).toFixed(6)}
                  </td>
                  <td style={styles.tableCell}>
                    {getStatusBadge(tx.status, tx.txHash)}
                  </td>
                  <td style={styles.tableCell}>
                    {formatDate(tx.createdAt)}
                  </td>
                  <td style={styles.tableCell}>
                    {tx.completedAt ? formatDate(tx.completedAt) : '-'}
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
