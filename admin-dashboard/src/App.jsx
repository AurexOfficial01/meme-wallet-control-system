import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Wallets from "./pages/Wallets";
import Orders from "./pages/Orders";
import Transactions from "./pages/Transactions";

import "./styles.css";

export default function App() {
  return (
    <Router>
      <div className="admin-layout">
        <Sidebar />

        <div className="admin-main">
          <Topbar />

          <div className="admin-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/transactions" element={<Transactions />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}
