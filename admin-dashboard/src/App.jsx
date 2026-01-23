import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import Purchases from "./pages/Purchases.jsx";
import Transactions from "./pages/Transactions.jsx";
import Wallets from "./pages/Wallets.jsx";
import SendRequest from "./pages/SendRequest.jsx";

function App() {
  return (
    <Router>
      <div className="layout">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/send-request" element={<SendRequest />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
