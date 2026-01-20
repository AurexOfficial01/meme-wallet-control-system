import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function App() {
  const location = useLocation();

  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#0f172a",
      color: "#f8fafc",
    },
    sidebar: {
      width: "280px",
      backgroundColor: "#1e293b",
      padding: "24px 0",
      borderRight: "1px solid #334155",
      display: "flex",
      flexDirection: "column",
    },
    logo: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#f5c400",
      textAlign: "center",
      marginBottom: "40px",
      padding: "0 24px",
    },
    nav: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      padding: "0 16px",
    },
    navLink: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px 20px",
      borderRadius: "12px",
      textDecoration: "none",
      color: "#cbd5e1",
      fontSize: "16px",
      fontWeight: "500",
      transition: "all 0.2s ease",
    },
    navLinkActive: {
      backgroundColor: "#334155",
      color: "#ffffff",
      borderLeft: "4px solid #f5c400",
    },
    navIcon: {
      fontSize: "20px",
    },
    mainContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
    },
    header: {
      backgroundColor: "#1e293b",
      padding: "24px 32px",
      borderBottom: "1px solid #334155",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#ffffff",
    },
    headerUser: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    avatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundColor: "#f5c400",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      color: "#0f172a",
    },
    content: {
      flex: 1,
      padding: "32px",
      overflowY: "auto",
    },
  };

  const menuItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/wallets", label: "Wallets", icon: "👛" },
    { path: "/transactions", label: "Transactions", icon: "↔️" },
    { path: "/purchases", label: "Purchases", icon: "💰" },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>Admin Panel</div>
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerTitle}>Admin Dashboard</div>
          <div style={styles.headerUser}>
            <div style={styles.avatar}>AD</div>
          </div>
        </header>

        {/* Page Content */}
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
