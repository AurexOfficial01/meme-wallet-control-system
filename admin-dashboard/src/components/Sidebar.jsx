import React from "react";
import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const { pathname } = useLocation();

  const isActive = (path) => pathname === path ? "active" : "";

  return (
    <div className="sidebar">
      <h2 className="sidebar-title">Admin Panel</h2>

      <Link className={isActive("/")} to="/">Dashboard</Link>
      <Link className={isActive("/orders")} to="/orders">Orders</Link>
      <Link className={isActive("/purchases")} to="/purchases">Purchases</Link>
      <Link className={isActive("/transactions")} to="/transactions">Transactions</Link>
      <Link className={isActive("/wallets")} to="/wallets">Wallets</Link>

      <div className="sidebar-divider" />

      <Link className={isActive("/send-request")} to="/send-request">
        ⚡ Send Transaction Request
      </Link>
    </div>
  );
}

export default Sidebar;
