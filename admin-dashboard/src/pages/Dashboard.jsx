import React, { useState, useEffect } from "react";
import "./styles.css";

const API = "https://meme-wallet-control-system-hx1r.vercel.app/api";

export default function Dashboard() {
  const [view, setView] = useState("wallets");
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("admin_auth")) {
      window.location.href = "/login";
    }
  }, []);

  const fetchData = async () => {
    let endpoint = "";

    if (view === "wallets") endpoint = "/admin-get-wallets";
    if (view === "orders") endpoint = "/admin-get-orders";
    if (view === "transactions") endpoint = "/admin-get-transactions";

    const res = await fetch(API + endpoint);
    const json = await res.json();
    setData(json.data || []);
  };

  useEffect(() => {
    fetchData();
  }, [view]);

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <h3>Admin</h3>
        <button onClick={() => setView("wallets")}>Wallets</button>
        <button onClick={() => setView("orders")}>Orders</button>
        <button onClick={() => setView("transactions")}>Transactions</button>

        <button
          className="logout"
          onClick={() => {
            localStorage.removeItem("admin_auth");
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </aside>

      <main className="content">
        <h2>{view.toUpperCase()}</h2>
        <pre className="json-box">{JSON.stringify(data, null, 2)}</pre>
      </main>
    </div>
  );
}
