// src/pages/Signup.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { authService } from '../../api/authService';

const Signup = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<{ RoleId: string; RoleName: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '' 
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.get('/roles')
      .then(res => {
        const availableRoles = res.data.filter(
          (role: { RoleName: string }) => role.RoleName.toLowerCase() !== 'admin'
        );
        setRoles(availableRoles);
        if (availableRoles.length > 0) {
          setFormData(prev => ({ ...prev, roleId: availableRoles[0].RoleId }));
        }
      })
      .catch(err => console.error("Failed to fetch roles:", err));
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

  const selectedRoleName = roles.find(r => r.RoleId === formData.roleId)?.RoleName || "Select Role";

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6] p-4 font-sans text-black">
      <div className="w-full max-w-xl p-10 bg-white shadow-2xl rounded-3xl border border-[#E5E7EB]">
        
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-black tracking-tight mb-2 uppercase italic">MANAGIX</h1>
          <p className="text-[#9CA3AF] font-bold uppercase tracking-[0.3em] text-[10px]">Create Your Account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-bold text-black ml-1">Name</label>
            <input 
              type="text" 
              placeholder="Your full name" 
              required
              className="w-full p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium placeholder:text-[#9CA3AF]"
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-black ml-1">Email</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              required
              className="w-full p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium placeholder:text-[#9CA3AF]"
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-black ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required
              className="w-full p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium placeholder:text-[#9CA3AF]"
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-sm font-bold text-black ml-1">Select Role</label>
            
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full p-4 bg-[#FFFFFF] border ${isOpen ? 'border-black ring-1 ring-black' : 'border-[#E5E7EB]'} rounded-2xl flex justify-between items-center transition-all text-left shadow-sm`}
            >
              <span className={`font-semibold ${formData.roleId ? 'text-black' : 'text-[#9CA3AF]'}`}>
                {selectedRoleName}
              </span>
              <svg 
                className={`h-5 w-5 text-black transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* SCROLLABLE DROPDOWN MENU */}
            {isOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-[#E5E7EB] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="max-h-52 overflow-y-auto custom-scrollbar">
                  {roles.map((r) => (
                    <div
                      key={r.RoleId}
                      onClick={() => {
                        setFormData({ ...formData, roleId: r.RoleId });
                        setIsOpen(false);
                      }}
                      className={`px-5 py-4 flex items-center justify-between cursor-pointer transition-colors
                        ${formData.roleId === r.RoleId ? 'bg-black text-white' : 'text-black hover:bg-[#F3F4F6]'}
                      `}
                    >
                      <span className="font-bold text-sm tracking-tight">{r.RoleName}</span>
                      {formData.roleId === r.RoleId && (
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-[#9CA3AF] mt-1 ml-1 font-bold uppercase tracking-[0.2em] italic">
              * Employee requires admin approval
            </p>
          </div>

          <button 
            type="submit" 
            className="w-full bg-black text-white p-4 rounded-2xl font-black text-lg hover:bg-[#1A1A1A] transition transform active:scale-[0.98] shadow-lg mt-2 uppercase tracking-widest"
          >
            Sign Up
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-center">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-[0.2em]">
            Already have an account? 
            <Link to="/login" className="ml-2 text-black font-black hover:underline underline-offset-4">
              Login
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #FFFFFF;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #000000;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Signup;