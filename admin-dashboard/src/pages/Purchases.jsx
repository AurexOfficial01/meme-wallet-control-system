import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [approvingPurchase, setApprovingPurchase] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [showModal, setShowModal] = useState(false);

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

  const handleApproveClick = (purchase) => {
    setApprovingPurchase(purchase);
    setTransactionHash(purchase.transactionHash || '');
    setShowModal(true);
  };

  const handleApproveSubmit = async () => {
    if (!transactionHash.trim()) {
      setError('Transaction hash is required');
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/mark-purchase-completed`, {
        purchaseId: approvingPurchase.purchaseId,
        transactionHash: transactionHash.trim()
      });

      if (response.data.success) {
        setPurchases(prev => prev.map(p => 
          p.purchaseId === approvingPurchase.purchaseId 
            ? { ...p, status: 'completed', transactionHash }
            : p
        ));
        setShowModal(false);
        setApprovingPurchase(null);
        setTransactionHash('');
        setError(null);
      }
    } catch (err) {
      setError('Failed to approve purchase');
      console.error('Error approving purchase:', err);
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

  const filteredPurchases = purchases.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'pending') return p.status === 'pending';
    if (filter === 'completed') return p.status === 'completed';
    return true;
  });

  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'pending').length,
    completed: purchases.filter(p => p.status === 'completed').length,
    totalUSD: purchases.reduce((sum, p) => sum + parseFloat(p.usdAmount || 0), 0),
    totalUSDT: purchases.reduce((sum, p) => sum + parseFloat(p.usdtAmount || 0), 0),
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
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      gap: '20px',
    },
    filterSelect: {
      backgroundColor: '#1e293b',
      color: '#ffffff',
      border: '1px solid #475569',
      borderRadius: '6px',
      padding: '8px 16px',
      fontSize: '14px',
      minWidth: '150px',
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
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
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
    approveButton: {
      backgroundColor: '#f5c400',
      color: '#0f172a',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '12px',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '30px',
      width: '90%',
      maxWidth: '500px',
      border: '1px solid #475569',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '20px',
    },
    modalInput: {
      width: '100%',
      backgroundColor: '#0f172a',
      border: '1px solid #475569',
      borderRadius: '6px',
      padding: '12px',
      color: '#ffffff',
      fontSize: '14px',
      marginBottom: '20px',
      fontFamily: 'monospace',
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    modalButton: {
      padding: '10px 20px',
      borderRadius: '6px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      border: 'none',
    },
    modalCancel: {
      backgroundColor: '#334155',
      color: '#ffffff',
    },
    modalSubmit: {
      backgroundColor: '#f5c400',
      color: '#0f172a',
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>USDT Purchases</h1>
        <p style={styles.subtitle}>Monitor and approve all USDT purchase requests</p>
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

      <div style={styles.controls}>
        <select 
          style={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Purchases</option>
          <option value="pending">Pending Only</option>
          <option value="completed">Completed Only</option>
        </select>
        
        <button
          style={styles.refreshButton}
          onClick={fetchPurchases}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Loading purchase requests...</div>
        ) : filteredPurchases.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💰</div>
            <h3 style={{ color: '#cbd5e1', marginBottom: '10px' }}>
              No Purchase Requests
            </h3>
            <p style={{ color: '#94a3b8' }}>
              {filter !== 'all' 
                ? `No ${filter} purchase requests found` 
                : 'Purchase requests will appear here when users buy USDT'}
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>ID</th>
                <th style={styles.tableHeader}>Wallet</th>
                <th style={styles.tableHeader}>Chain</th>
                <th style={styles.tableHeader}>USD</th>
                <th style={styles.tableHeader}>USDT</th>
                <th style={styles.tableHeader}>Rate</th>
                <th style={styles.tableHeader}>Payment</th>
                <th style={styles.tableHeader}>Tx Hash</th>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase) => (
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
                  <td style={styles.tableCell}>
                    {purchase.status === 'pending' && (
                      <button
                        style={styles.approveButton}
                        onClick={() => handleApproveClick(purchase)}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Approve Purchase</h3>
            <p style={{ color: '#cbd5e1', marginBottom: '20px' }}>
              Enter transaction hash to mark purchase as completed
            </p>
            <input
              style={styles.modalInput}
              type="text"
              placeholder="Transaction hash (0x...)"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              autoFocus
            />
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.modalButton, ...styles.modalCancel }}
                onClick={() => {
                  setShowModal(false);
                  setApprovingPurchase(null);
                  setTransactionHash('');
                }}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.modalButton, ...styles.modalSubmit }}
                onClick={handleApproveSubmit}
              >
                Submit Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
