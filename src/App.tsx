import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AttendanceProvider } from './contexts/AttendanceContext';
import PublicCheckIn from './components/PublicCheckIn';
import AdminDashboard from './components/AdminDashboard';
import Layout from './components/Layout';

function App() {
  return (
    <AttendanceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PublicCheckIn />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Router>
    </AttendanceProvider>
  );
}

export default App;