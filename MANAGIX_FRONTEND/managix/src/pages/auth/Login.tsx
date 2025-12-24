import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Get the token
      const loginResponse = await authService.login({ email, password });
      localStorage.setItem('token', loginResponse.token);
      
      // 2. Fetch the user details using the token
      const userResponse = await authService.getMe();
      
      // 3. Store user data from the second response
      localStorage.setItem('userRole', userResponse.role);
      localStorage.setItem('userName', userResponse.fullName);
      
      navigate('/dashboard'); 
    } catch (error: any) {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-black">MANAGIX</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="Email" required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-black text-white p-3 rounded-lg font-bold hover:bg-gray-800 transition">
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Don't have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;