import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <div className="sidebar">
      <h2 className="sidebar-title">Admin Panel</h2>

      <ul className="sidebar-menu">

        <li>
          <Link to="/">Dashboard</Link>
        </li>

        <li>
          <Link to="/wallets">Wallets</Link>
        </li>

        <li>
          <Link to="/orders">Orders</Link>
        </li>

        <li>
          <Link to="/purchases">Purchases</Link>
        </li>

        <li>
          <Link to="/transactions">Transactions</Link>
        </li>

        {/* ✅ NEW — All Requests Page */}
        <li>
          <Link to="/all-requests">All Requests</Link>
        </li>

        {/* ✅ NEW — Send Transaction Request Page */}
        <li>
          <Link to="/send-request">Send Request</Link>
        </li>

      </ul>
    </div>
  );
}

export default Sidebar;
