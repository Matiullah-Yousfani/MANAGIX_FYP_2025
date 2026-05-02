// src/pages/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import api from '../../api/axiosInstance';
import { normalizeEmail, validateLoginInput } from '../../utils/formValidation';

const Login = () => {

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const clientErr = validateLoginInput(email, password);
    if (clientErr) {
      setError(clientErr);
      setLoading(false);
      return;
    }

    try {

      const loginResponse = await authService.login({
        email: normalizeEmail(email),
        password,
      });

      // if backend did not send token
      if (!loginResponse.token) {
        setError("Login failed.");
        setLoading(false);
        return;
      }

      const token = loginResponse.token;

      localStorage.setItem('token', token);

      // get logged in user details
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const userDetails = response.data;

      const rawRoleName = userDetails.roleName || userDetails.RoleName;
      const rawRoleId = userDetails.roleId || userDetails.RoleId;

      const EMPLOYEE_GUID = "A08BB9EB-B222-4B4E-965F-980F88540E97";

      let role = "Member";

      if (rawRoleName && rawRoleName.trim() !== "") {
        role = rawRoleName;
      }
      else if (rawRoleId?.toUpperCase() === EMPLOYEE_GUID.toUpperCase()) {
        role = "Employee";
      }

      localStorage.setItem('userRole', role);
      localStorage.setItem('roleName', role);
      localStorage.setItem('userName', userDetails.fullName || (userDetails as any).FullName || 'User');
      localStorage.setItem('userEmail', userDetails.email || (userDetails as any).Email || '');
      localStorage.setItem('userId', userDetails.userId || (userDetails as any).UserId || '');

      navigate('/dashboard');

    }
    catch (error: any) {

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        "Login failed";

      setError(errorMessage);

    }
    finally {
      setLoading(false);
    }
  };

  return (

    <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6]">

      <div className="w-full max-w-md p-10 bg-white shadow-2xl rounded-3xl border border-gray-200">

        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-black tracking-tight mb-2">
            MANAGIX
          </h1>
          <p className="text-gray-500 font-medium">
            Welcome back
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">

          <div className="space-y-2">

            <label className="text-sm font-bold text-gray-700 ml-1">
              Email
            </label>

            <input
              type="email"
              required
              placeholder="name@company.com"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none"
              onChange={(e) => setEmail(e.target.value)}
            />

          </div>

          <div className="space-y-2">

            <div className="flex justify-between items-center">

              <label className="text-sm font-bold text-gray-700 ml-1">
                Password
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-gray-400 hover:text-black"
              >
                Forgot Password?
              </Link>

            </div>

            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none"
              onChange={(e) => setPassword(e.target.value)}
            />

          </div>

          {error && (
            <div className="text-red-500 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition disabled:bg-gray-400 mt-4 shadow-lg"
          >

            {loading ? (

              <span className="flex items-center justify-center gap-2">

                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">

                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 
                    0 0 5.373 0 12h4zm2 5.291A7.962 
                    7.962 0 014 12H0c0 3.042 1.135 
                    5.824 3 7.938l3-2.647z"
                  />

                </svg>

                Verifying...

              </span>

            ) : "Login"}

          </button>

        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">

          <p className="text-sm font-medium text-gray-500">

            Don't have an account?

            <Link
              to="/signup"
              className="ml-1 text-black font-bold hover:underline"
            >
              Signup
            </Link>

          </p>

        </div>

      </div>

    </div>

  );

};

export default Login;