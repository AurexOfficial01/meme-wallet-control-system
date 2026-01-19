import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.jsx';
import BuyUSDT from './BuyUSDT.jsx'; // ✅ MUST MATCH FILE NAME

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/buy-usdt" element={<BuyUSDT />} />
    </Routes>
  </BrowserRouter>
);
