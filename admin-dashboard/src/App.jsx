import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Wallets from "./pages/Wallets.jsx";
import Orders from "./pages/Orders.jsx";
import Purchases from "./pages/Purchases.jsx";
import Transactions from "./pages/Transactions.jsx";
import AllRequests from "./pages/AllRequests.jsx";
import SendRequest from "./pages/SendRequest.jsx";

import "./styles.css";

function App() {
  return (
    <Router>
      <div className="layout">
        <Sidebar />

        <div className="content">
          <Topbar />
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/transactions" element={<Transactions />} />

              {/* ✅ NEW PAGES */}
              <Route path="/all-requests" element={<AllRequests />} />
              <Route path="/send-request" element={<SendRequest />} />

            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
