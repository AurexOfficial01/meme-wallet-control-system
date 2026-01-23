import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">⚡</span>
        <span className="logo-text">Admin Panel</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/wallets"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          👛 Wallets
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          📝 Orders
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          🔗 Transactions
        </NavLink>
      </nav>
    </div>
  );
}
