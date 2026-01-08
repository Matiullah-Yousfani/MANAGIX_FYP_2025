import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { authService } from '../../api/authService';

const Signup = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<{ RoleId: string; RoleName: string }[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '' // will store the selected RoleId
  });

  useEffect(() => {
    // fetch roles from backend
    api.get('/roles').then(res => {
      setRoles(res.data);
      if (res.data[0]) setFormData(prev => ({ ...prev, roleId: res.data[0].RoleId }));
    }).catch(err => console.error("Failed to fetch roles:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.register(formData);
      alert("Registration successful! You can now log in.");
      navigate('/login');
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
        <h1 className="text-4xl font-extrabold text-center mb-2 text-black">MANAGIX</h1>
        <p className="text-gray-500 text-center mb-8">Create your professional account</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="Full Name" required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
          />
          <input 
            type="email" placeholder="Email Address" required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />
          
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1 ml-1">Select Role</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-black"
              value={formData.roleId}
              onChange={e => setFormData({ ...formData, roleId: e.target.value })}
            >
              {roles.map(r => (
                <option key={r.RoleId} value={r.RoleId}>{r.RoleName}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="w-full bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg">
            Create Account
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-black font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
