import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import Purchases from "./pages/Purchases.jsx";
import Transactions from "./pages/Transactions.jsx";
import Wallets from "./pages/Wallets.jsx";
import SendRequest from "./pages/SendRequest.jsx";
import AllRequests from "./pages/AllRequests.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <div className="content">
          <Topbar />
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/send-request" element={<SendRequest />} />
              <Route path="/requests" element={<AllRequests />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
