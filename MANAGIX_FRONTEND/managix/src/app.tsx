import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/dashboard/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect base URL to login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes (We will add a Sidebar wrapper here later) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Catch-all: Redirect unknown paths to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;