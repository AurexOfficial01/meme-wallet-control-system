import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.jsx';
import BuyUsdt from './pages/BuyUsdt.jsx'; // ✅ FIXED PATH & CASE

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/buy-usdt" element={<BuyUsdt />} /> {/* ✅ FIXED CASE */}
    </Routes>
  </BrowserRouter>
);
