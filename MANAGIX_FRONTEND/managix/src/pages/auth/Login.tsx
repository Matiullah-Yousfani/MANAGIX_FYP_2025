// src/pages/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import api from '../../api/axiosInstance';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loginResponse = await authService.login({ email, password });
      const token = loginResponse.token;
      localStorage.setItem('token', token);

      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
const userDetails = response.data;

// 1. Get the raw values from backend (handle both Pascal and camelCase)
const rawRoleName = userDetails.roleName || userDetails.RoleName;
const rawRoleId = userDetails.roleId || userDetails.RoleId;

// 2. Define the Employee GUID from your database
const EMPLOYEE_GUID = "A08BB9EB-B222-4B4E-965F-980F88540E97";

// 3. Precise Role Mapping
let role = "Member"; // Default fallback

if (rawRoleName && rawRoleName.trim() !== "") {
    role = rawRoleName; // Use string if backend sends it
} else if (rawRoleId?.toUpperCase() === EMPLOYEE_GUID.toUpperCase()) {
    role = "Employee"; // Manually map if GUID matches and name is empty
}

// 4. Save to storage
localStorage.setItem('userRole', role);
localStorage.setItem('userName', userDetails.fullName || userDetails.FullName || 'User');
localStorage.setItem('userId', userDetails.userId || userDetails.UserId || '');
      
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Invalid credentials";
      alert("Login failed: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-black uppercase italic tracking-tighter">MANAGIX</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="Email" required
            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:border-black focus:bg-white outline-none transition-all font-bold"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:border-black focus:bg-white outline-none transition-all font-bold"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-xl font-black hover:bg-gray-800 transition active:scale-95 disabled:bg-gray-400 uppercase tracking-widest"
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
          New here? <Link to="/signup" className="text-black hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;