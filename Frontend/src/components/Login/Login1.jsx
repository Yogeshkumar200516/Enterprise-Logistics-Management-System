import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logistics_logo.png'; // make sure this path is correct

function Login() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
  setError('');

  try {
    const res = await axios.post(
      'http://localhost:5000/api/auth/login',
      { username, password }
    );

    if (res.data.success) {
      const { token, user } = res.data;

      login(user, token);

      // Role-based navigation
      if (user.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'supervisor') {
        navigate('/supervisor/dashboard');
      } else if (user.role === 'user') {
        navigate('/driver/dashboard');
      } else {
        navigate('/');
      }

    } else {
      setError(res.data.message || 'Login failed');
    }

  } catch (err) {
    console.error('Login error:', err);
    setError(
      err.response?.data?.message ||
      'Something went wrong. Please try again.'
    );
  }
};


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0, // Remove margin
        padding: 0, // Remove padding
        width: '100vw', // Ensure full width
      }}
    >
      <Paper
        elevation={10}
        sx={{
          backdropFilter: 'blur(16px)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
          padding: isMobile ? 3 : 5,
          width: isMobile ? '80%' : 400,
          borderRadius: 4,
          color: '#ffffff',
        }}
      >
        {/* Logo Section */}
        <Box display="flex" justifyContent="center" mb={3}>
          <img
            src={logo}
            alt="Logo"
            style={{
              width: isMobile ? '90px' : '110px',
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          textAlign="center"
          fontWeight="bold"
          mb={3}
          sx={{ letterSpacing: 1, color: '#ffffff' }}
        >
          Welcome Back
        </Typography>

        {/* Username Field */}
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{
            mb: 2,
            '& label': {
              color: '#fff',
              fontWeight: 500,
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
            },
            '& label.Mui-focused': {
              color: '#42a5f5',
            },
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': {
                borderColor: '#444',
                transition: 'all 0.3s ease',
              },
              '&:hover fieldset': {
                borderColor: '#888',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#42a5f5',
                boxShadow: '0 0 0 1px #42a5f5',
              },
            },
          }}
        />

        {/* Password Field */}
        <TextField
          label="Password"
          variant="outlined"
          fullWidth
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{
            mb: 2,
            '& label': {
              color: '#fff',
              fontWeight: 500,
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
            },
            '& label.Mui-focused': {
              color: '#42a5f5',
            },
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': {
                borderColor: '#444',
              },
              '&:hover fieldset': {
                borderColor: '#888',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#42a5f5',
                boxShadow: '0 0 0 1px #42a5f5',
              },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ color: 'white' }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Error Message */}
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Login Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          sx={{
            mt: 1,
            py: 1.4,
            background: 'linear-gradient(90deg, #1e88e5, #42a5f5)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1rem',
            borderRadius: '10px',
            textTransform: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(90deg, #42a5f5, #1e88e5)',
              transform: 'scale(1.03)',
              boxShadow: '0 0 12px rgba(66, 165, 245, 0.4)',
            },
          }}
        >
          Sign In
        </Button>
      </Paper>
    </Box>
  );
}

export default Login;
