// index.js or main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import BillChop from './pages/billchop'; // Import the page/component you want to navigate to
import FullBillBreakdown from './pages/fullBillBreakdown'; // Import the page/component you want to navigate to

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/pages/billchop" element={<BillChop />} /> {/* Define the route for the bill page */}
      <Route path="/pages/fullBillBreakdown" element={<FullBillBreakdown />} /> {/* Define the route for the bill page */}
    </Routes>
  </Router>
);
