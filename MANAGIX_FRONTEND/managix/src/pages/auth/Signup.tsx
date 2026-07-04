// src/pages/Signup.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { authService } from '../../api/authService';
import { validateSignupInput } from '../../utils/formValidation';

const Signup = () => {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<{ RoleId: string; RoleName: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: ''
  });

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch roles
  useEffect(() => {
    api.get('/roles')
      .then(res => {
        const normalized = (res.data || []).map((role: any) => ({
          RoleId: role.roleId ?? role.RoleId,
          RoleName: role.roleName ?? role.RoleName,
        }));

        const availableRoles = normalized.filter(
          (role) => role.RoleName.toLowerCase() !== 'admin'
        );

        setRoles(availableRoles);

        if (availableRoles.length > 0) {
          setFormData(prev => ({
            ...prev,
            roleId: availableRoles[0].RoleId
          }));
        }
      })
      .catch(() => {
        setError("Failed to load roles.");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const localErr = validateSignupInput({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      roleId: formData.roleId,
    });
    if (localErr) {
      setError(localErr);
      return;
    }

    try {
      const res = await authService.register({
        ...formData,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
      });

      const lower = res.message?.toLowerCase() ?? '';
      if (
        lower.includes('required') ||
        lower.includes('already registered') ||
        lower.includes('email already') ||
        lower.includes('invalid role') ||
        lower.includes('at least')
      ) {
        setError(res.message ?? 'Registration failed.');
        return;
      }

      alert("Registration request submitted. Wait for admin approval.");
      navigate('/login');

    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { message?: string; detail?: string } };
        message?: string;
      };
      setError(
        ax.response?.data?.message ??
          ax.response?.data?.detail ??
          ax.message ??
          'Registration failed.',
      );
    }
  };

  const selectedRoleName =
    roles.find(r => r.RoleId === formData.roleId)?.RoleName || "Select Role";

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg p-4 font-sans text-fg">

      <div className="w-full max-w-xl p-10 bg-surface shadow-e3 rounded-xl border border-line">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2 uppercase">
            MANAGIX
          </h1>
          <p className="text-fg-subtle font-bold uppercase tracking-[0.3em] text-[10px]">
            Create Your Account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* NAME */}
          <div className="space-y-1">
            <label className="text-sm font-bold ml-1">Name</label>

            <input
              type="text"
              required
              placeholder="Your full name"
              className="w-full p-4 bg-surface-2 border border-line rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
              onChange={e =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-1">
            <label className="text-sm font-bold ml-1">Email</label>

            <input
              type="email"
              required
              placeholder="name@company.com"
              className="w-full p-4 bg-surface-2 border border-line rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
              onChange={e =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-1">
            <label className="text-sm font-bold ml-1">Password</label>

            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full p-4 bg-surface-2 border border-line rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
              onChange={e =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          {/* ROLE DROPDOWN */}
          <div className="space-y-1 relative" ref={dropdownRef}>

            <label className="text-sm font-bold ml-1">Select Role</label>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full p-4 bg-surface-2 border rounded-lg flex justify-between items-center ${isOpen ? 'border-primary ring-1 ring-primary/25' : 'border-line'
                }`}
            >
              <span className="font-semibold">
                {selectedRoleName}
              </span>

              <svg
                className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>

            </button>

            {isOpen && (
              <div className="absolute z-50 w-full mt-2 bg-surface border border-line shadow-e2 rounded-lg overflow-hidden">

                <div className="max-h-52 overflow-y-auto">

                  {roles.map((r) => (
                    <div
                      key={r.RoleId}
                      onClick={() => {
                        setFormData({ ...formData, roleId: r.RoleId });
                        setIsOpen(false);
                      }}
                      className={`px-5 py-4 cursor-pointer ${formData.roleId === r.RoleId
                        ? 'bg-primary text-primary-fg'
                        : 'hover:bg-surface-3'
                        }`}
                    >
                      {r.RoleName}
                    </div>
                  ))}

                </div>

              </div>
            )}

            <p className="text-[10px] text-fg-subtle mt-1 ml-1 font-bold uppercase">
              * Employee requires admin approval
            </p>

          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <p className="text-danger text-sm font-semibold">{error}</p>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full bg-primary text-primary-fg p-4 rounded-lg font-bold text-lg hover:bg-primary-hover"
          >
            Sign Up
          </button>

        </form>

        <div className="mt-8 pt-6 border-t border-line text-center">

          <p className="text-xs font-bold text-fg-subtle uppercase">

            Already have an account?

            <Link
              to="/login"
              className="ml-2 text-primary font-bold hover:underline"
            >
              Login
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
};

export default Signup;