import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';

// Login Page
import Login from '../components/Login/Login';
import Dashboard from '../pages/Admin/Dashboard/Dashboard';
import AddResources from '../pages/Admin/AddResources/AddResources';
import AddUsers from '../pages/Admin/AddUsers/AddUsers';
import History from '../pages/Admin/History/History';
import UserDashboard from '../pages/User/Dashboard/Dashboard';
import DeliveryItems from '../pages/User/DeliveryItems/DeliveryItems';
import DeliveryStatus from '../pages/User/DeliveryStatus/DeliveryStatus';
import ScrapStatus from '../pages/User/ScrapStatus/ScrapStatus';
import UserHistory from '../pages/User/History/History';
import SupervisorDashboard from '../pages/Supervisor/Dashboard/Dashboard';
import DeliveryLogger from '../pages/Supervisor/DeliveryLogger/DeliveryLogger';
import SupervisorDeliveryStatus from '../pages/Supervisor/DeliveryStatus/DeliveryStatus';
import TemproryResources from '../pages/Supervisor/TemproryResources/TemproryResources';
import ScrapLog from '../pages/Supervisor/ScrapLog/ScrapLog';
import SupervisorHistory from '../pages/Supervisor/History/History';
import AddAdminUsers from '../pages/SuperAdmin/AddUsers/AddUsers';
import AddCompany from '../pages/SuperAdmin/AddCompany/AddCompany';

function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // Responsive drawer setup
  const isXLarge = useMediaQuery('(min-width:1200px)');
  const isSmall = useMediaQuery('(max-width:600px)');
  const isMedium = useMediaQuery('(min-width:600px) and (max-width:1200px)');

  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState('permanent');

  useEffect(() => {
    if (isSmall) {
      setVariant('temporary');
      setOpen(false);
    } else if (isXLarge) {
      setVariant('permanent');
      setOpen(true);
    } else if (isMedium) {
      setVariant('permanent');
      setOpen(false);
    }
  }, [isSmall, isMedium, isXLarge]);

  const marginTop = 44;

  // 🔒 If user is not logged in, always show the login page
  if (!user) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Login />
      </Box>
    );
  }

  // ⛳ Redirect any / route to dashboard for logged-in users
  const RedirectToDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <Navigate to="/" />;
      case 'trainer':
        return <Navigate to="/" />;
      case 'member':
        return <Navigate to="/" />;
      default:
        return <Navigate to="/login" />;
    }
  };

  // 🧭 Role-based routing setup
  const renderRoutes = () => {
    switch (user.role) {
      case 'superadmin':
        return (
          <Routes>
            {/* <Route path="/" element={<RedirectToDashboard />} /> */}
            <Route path="/" element={<AddCompany />} />
            <Route path="/add-users-admin" element={<AddAdminUsers />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        );

      case 'admin':
        return (
          <Routes>
            {/* <Route path="/" element={<RedirectToDashboard />} /> */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-resources" element={<AddResources />} />
            <Route path="/add-users" element={<AddUsers />} />
            <Route path="/admin-history" element={<History />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        );

      case 'user':
        return (
          <Routes>
            {/* <Route path="/" element={<RedirectToDashboard />} /> */}
            <Route path="/" element={<UserDashboard />} />
            <Route path="/delivery-items-user" element={<DeliveryItems />} />
            <Route path="/delivery-status-user" element={<DeliveryStatus />} />
            <Route path="/scrap-user" element={<ScrapStatus />} />
            <Route path="/history-user" element={<UserHistory />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        );

      case 'supervisor':
        return (
          <Routes>
            {/* <Route path="/" element={<RedirectToDashboard />} /> */}
            <Route path="/" element={<SupervisorDashboard />} />
            <Route path="/delivery-logger" element={<DeliveryLogger />} />
            <Route path="/delivery-status" element={<SupervisorDeliveryStatus />} />
            <Route path="/temprory-resources" element={<TemproryResources />} />
            <Route path="/scrap-log" element={<ScrapLog />} />
            <Route path="/supervisor-history" element={<SupervisorHistory />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        );

      default:
        return (
          <Routes>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        );
    }
  };

  // 🧱 Final layout
  return (
    <Box sx={{ display: 'flex' }}>
      {/* Navbar shown only when user is logged in */}
      <Navbar />

      {/* Main content area with margins */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: `${marginTop}px`,
          padding: 2,
          transition: 'margin-left 0.3s ease',
        }}
      >
        {renderRoutes()}
      </Box>
    </Box>
  );
}

export default AppLayout;
