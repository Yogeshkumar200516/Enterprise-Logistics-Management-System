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
  Fade,
  alpha,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../ToggleTheme/ThemeContext'; // Add this import
import logo from '../../assets/images/logistics_logo.png';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';

function Login() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mode, toggleTheme } = useThemeMode(); // Add theme context hook

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isDarkMode = mode === 'dark';

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

        if (user.role === 'superadmin') navigate('/superadmin/dashboard');
        else if (user.role === 'admin') navigate('/admin/dashboard');
        else if (user.role === 'supervisor') navigate('/supervisor/dashboard');
        else if (user.role === 'user') navigate('/driver/dashboard');
        else navigate('/');

      } else {
        setError(res.data.message || 'Login failed');
      }
    } catch (err) {
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
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)'
          : 'linear-gradient(135deg, #e3f2fd, #f5f7fa, #e8f4fd)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        position: 'relative',
        transition: 'background 0.3s ease-in-out',
      }}
    >
      {/* Theme Toggle Button */}
      <Fade in={true} timeout={600}>
        <IconButton
          onClick={toggleTheme}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: isDarkMode ? '#ffffff' : '#1e88e5',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(30,136,229,0.1)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(30,136,229,0.2)',
              transform: 'scale(1.1)',
            },
            zIndex: 1000,
          }}
          size="large"
        >
          {isDarkMode ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>
      </Fade>

      <Paper
        elevation={isDarkMode ? 10 : 6}
        sx={{
          backdropFilter: 'blur(16px)',
          background: isDarkMode
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.85)',
          border: isDarkMode 
            ? '1px solid rgba(255,255,255,0.1)' 
            : '1px solid rgba(30,136,229,0.2)',
          boxShadow: isDarkMode
            ? '0 8px 32px rgba(31, 38, 135, 0.3)'
            : '0 8px 32px rgba(30, 136, 229, 0.15)',
          padding: isMobile ? 3 : 5,
          width: isMobile ? '95%' : 580,
          borderRadius: 4,
          color: isDarkMode ? '#ffffff' : '#1e1e1e',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {/* Logo */}
        <Box display="flex" justifyContent="center" mb={3}>
          <img
            src={logo}
            alt="Logo"
            style={{
              width: isMobile ? '90px' : '110px',
              filter: isDarkMode 
                ? 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
                : 'drop-shadow(0 0 10px rgba(30,136,229,0.3))',
              transition: 'filter 0.3s ease-in-out',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          textAlign="center"
          fontWeight="bold"
          mb={3}
          color="inherit"
          sx={{
            textShadow: isDarkMode ? '0 2px 4px rgba(0,0,0,0.3)' : 'none', fontFamily: "'Diphylleia', serif",
          }}
        >
          Smart Logista
        </Typography>

        {/* USERNAME TITLE */}
        <Typography
          variant="body1"
          sx={{ 
            mb: 0.5, 
            fontWeight: 500,
            color: isDarkMode ? '#e0e0e0' : '#424242',
          }}
        >
          Username <span style={{ color: '#ff4444' }}>*</span>
        </Typography>

        {/* USERNAME FIELD */}
        <TextField
          fullWidth
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              color: isDarkMode ? '#fff' : '#1e1e1e',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              '& fieldset': {
                borderColor: isDarkMode ? '#444' : '#d1d5db',
              },
              '&:hover fieldset': {
                borderColor: isDarkMode ? '#888' : '#9ca3af',
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
          }}
          InputProps={{
            style: { color: isDarkMode ? '#fff' : '#1e1e1e' },
          }}
          InputLabelProps={{
            style: { color: isDarkMode ? '#e0e0e0' : '#424242' },
          }}
        />

        {/* PASSWORD TITLE */}
        <Typography
          variant="body1"
          sx={{ 
            mb: 0.5, 
            fontWeight: 500,
            color: isDarkMode ? '#e0e0e0' : '#424242',
          }}
        >
          Password <span style={{ color: '#ff4444' }}>*</span>
        </Typography>

        {/* PASSWORD FIELD */}
        <TextField
          fullWidth
          placeholder="Enter your password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              color: isDarkMode ? '#fff' : '#1e1e1e',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              '& fieldset': {
                borderColor: isDarkMode ? '#444' : '#d1d5db',
              },
              '&:hover fieldset': {
                borderColor: isDarkMode ? '#888' : '#9ca3af',
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ 
                    color: isDarkMode ? '#fff' : '#666',
                    '&:hover': { color: theme.palette.primary.main }
                  }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          InputLabelProps={{
            style: { color: isDarkMode ? '#e0e0e0' : '#424242' },
          }}
        />

        {/* ERROR */}
        {error && (
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2, 
              color: '#ff6b6b !important',
              backgroundColor: 'rgba(255,107,107,0.1)',
              padding: 1.5,
              borderRadius: 1,
              borderLeft: '3px solid #ff4444',
            }}
          >
            {error}
          </Typography>
        )}

        {/* LOGIN BUTTON */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleLogin}
          sx={{
            mt: 1,
            py: 1.4,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            fontWeight: 'bold',
            fontSize: '1rem',
            borderRadius: '10px',
            textTransform: 'none',
            color: '#fff',
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': {
              background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
              transform: 'scale(1.03)',
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.6)}`,
            },
            '&:active': {
              transform: 'scale(1.01)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Sign In
        </Button>
      </Paper>
    </Box>
  );
}

export default Login;
