import { useEffect, useState } from "react";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = "https://meme-wallet-control-system-hx1r.vercel.app";

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/orders`);
      const json = await res.json();

      if (json.success) {
        setOrders(json.data);
      } else {
        setOrders([]);
      }
    } catch (e) {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000); // Auto-refresh 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Orders</h2>
        <p className="page-subtitle">All USDT purchase orders created from frontend</p>
      </div>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <div className="table">
          <div className="table-header">
            <span>Order ID</span>
            <span>Address</span>
            <span>Chain</span>
            <span>Amount ($)</span>
            <span>USDT</span>
            <span>Status</span>
            <span>Time</span>
          </div>

          {orders.length === 0 ? (
            <div className="empty">No orders found</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="table-row">
                <span>{o.id}</span>
                <span>{o.address}</span>
                <span>{o.chain}</span>
                <span>{o.amount}</span>
                <span>{o.usdt}</span>
                <span>{o.status}</span>
                <span>{new Date(o.time).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
