import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import App from "./pages/App.jsx";
import Wallets from "./pages/Wallets.jsx";
import Transactions from "./pages/Transactions.jsx";
import Purchases from "./pages/Purchases.jsx";

axios.defaults.headers.common['x-admin-key'] = import.meta.env.VITE_ADMIN_KEY;

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route path="wallets" element={<Wallets />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="purchases" element={<Purchases />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
