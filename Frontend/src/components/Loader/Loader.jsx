import React from 'react';
import { Box, Backdrop, CircularProgress, Typography } from '@mui/material';
import logo from '../../assets/images/logistics_logo.png'; // Update path as needed

const Loader = ({ open }) => {
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.modal + 1,
        background: 'rgba(15, 32, 39, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
      open={open}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          p: 4,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.3)',
          minWidth: 300,
        }}
      >
        {/* Logo */}
        <img
          src={logo}
          alt="Smart Logista"
          style={{
            width: 80,
            height: 80,
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
            animation: 'pulse 2s infinite',
          }}
        />
        
        {/* Spinner */}
        <CircularProgress
          size={60}
          thickness={4}
          sx={{
            color: '#42a5f5',
            animation: 'spin 1s linear infinite',
          }}
        />
        
        {/* Text */}
        <Box sx={{ textAlign: 'center', color: '#ffffff' }}>
          <Typography variant="h6" fontWeight="bold" mb={0.5}>
            Welcome to Smart Logista
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Logging you in...
          </Typography>
        </Box>
      </Box>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Backdrop>
  );
};

export default Loader;
