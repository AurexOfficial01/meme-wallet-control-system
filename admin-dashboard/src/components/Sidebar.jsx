import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2 className="logo">ADMIN</h2>

      <nav className="menu">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/orders">Orders</NavLink>
        <NavLink to="/purchases">Purchases</NavLink>
        <NavLink to="/transactions">Transactions</NavLink>
        <NavLink to="/wallets">Wallets</NavLink>
        <NavLink to="/send-request">Send Request</NavLink>
        <NavLink to="/requests">All Requests</NavLink>
      </nav>
    </div>
  );
}
