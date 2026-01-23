import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Wallets from "./pages/Wallets.jsx";
import Purchases from "./pages/Purchases.jsx";
import Transactions from "./pages/Transactions.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <aside className="sidebar">
          <h2 className="sidebar-title">Admin Panel</h2>
          <Link to="/">Dashboard</Link>
          <Link to="/wallets">Wallets</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/transactions">Transactions</Link>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/orders" element={<Purchases />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
