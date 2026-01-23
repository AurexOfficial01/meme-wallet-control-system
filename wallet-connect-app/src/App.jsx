// wallet-connect-app/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { WalletProvider } from "./context/WalletContext.js";

import Home from "./pages/Home.jsx";
import BuyUsdt from "./pages/BuyUsdt.jsx";

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buy-usdt" element={<BuyUsdt />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
