import React, { createContext, useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await api.get('/auth/profile')
          setUser(response.data.data);
        } catch (error) {
          localStorage.removeItem('token')
        }
      }
      setLoading(false)
    }
    loadUser()
  }, [])


  const login = async (email, password) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    const userData = response.data.data;

    localStorage.setItem("token", userData.token);
    setUser(userData.user);

    toast.success("Login successful!");
    navigate("/");

    return { success: true };
  } catch (error) {
    const message = error.response?.data?.message || "Login failed";

    if (error.response?.status === 403 && /verify your email/i.test(message)) {
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    toast.error(message);
    return { success: false, message };
  }
};

const verifyEmail = async (email, otp) => {
  try {
    const response = await api.post("/auth/verify-otp", { email, otp });
    const userData = response.data.data;

    localStorage.setItem("token", userData.token);
    setUser(userData.user);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "OTP verification failed",
    };
  }
};

verifyEmail.resend = async (email) => {
  try {
    await api.post("/auth/resend-otp", { email });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to resend OTP",
    };
  }
};

  const register = async (firstName, lastName, email, password) => {
    try {
      const response = await api.post("/auth/register", {
        firstName,
        lastName,
        email,
        password,
      });

      toast.success(response.data.message);

      return {
        success: true,
        email,
        requiresVerification: response.data.data.requiresVerification,
      };
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");

      return { success: false };
    }
  };


  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Logged out')
    navigate('/login')
  }

  const updateUser = (data) => {
    setUser(prev => ({ ...prev, ...data }))
  }

  return (
    <AuthContext.Provider value={{ user, login, register,verifyEmail, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}