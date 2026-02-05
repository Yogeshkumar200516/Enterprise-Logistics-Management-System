import React, {useState, useEffect} from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../../ToggleTheme/ThemeContext'; // Update path to your ThemeContext file
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness6Icon from '@mui/icons-material/Brightness6';
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ManageHistoryRoundedIcon from '@mui/icons-material/ManageHistoryRounded';
import AdsClickRoundedIcon from '@mui/icons-material/AdsClickRounded';
import SevereColdRoundedIcon from '@mui/icons-material/SevereColdRounded';
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DeliveryDiningRoundedIcon from '@mui/icons-material/DeliveryDiningRounded';
import VideoSettingsRoundedIcon from '@mui/icons-material/VideoSettingsRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import FitnessCenterRoundedIcon from "@mui/icons-material/FitnessCenterRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import ReceiptRoundedIcon from "@mui/icons-material/ReceiptRounded";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import useMediaQuery from "@mui/material/useMediaQuery";
import logo from "../../assets/images/logistics_logo.png";
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';

const drawerWidth = 250;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  background:
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #0f2027, #203a43, #2c5364)"
      : "linear-gradient(135deg, #c8eff4, #b4f4f9, #b9eef2)",
  boxShadow: "none",

  /* ✅ ADD THIS LINE */
  borderBottom: `1px solid ${
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.12)"
  }`,

  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),

  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));


const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open
    ? {
        ...openedMixin(theme),
        "& .MuiDrawer-paper": {
          ...openedMixin(theme),
          background: theme.palette.mode === "dark" ? 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' : 'linear-gradient(135deg, #e2f2f4, #b4f4f9, #b9eef2)',
          color: theme.palette.mode === "dark" ? '#fff' : '#000',
        },
      }
    : {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": {
          ...closedMixin(theme),
          background: theme.palette.mode === "dark" ? 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' : 'linear-gradient(135deg, #e2f2f4, #b4f4f9, #b9eef2)',
          color: theme.palette.mode === "dark" ? '#fff' : '#000',
        },
      }),
}));

const navItemsByRole = {
  superadmin: [
    { text: "Add Company", icon: <AddBusinessOutlinedIcon />, path: "/" },
    { text: "Add User", icon: <GroupAddIcon />, path: "/add-users-admin" },
  ],
  admin: [
    { text: "Dashboard", icon: <DashboardRoundedIcon />, path: "/" },
    { text: "Add Resources", icon: <AdsClickRoundedIcon />, path: "/add-resources" },
    { text: "Add Users", icon: <GroupAddIcon />, path: "/add-users" },
    { text: "History", icon: <ManageHistoryRoundedIcon />, path: "/admin-history" },
  ],
  supervisor: [
    { text: "Dashboard", icon: <DashboardRoundedIcon />, path: "/" },
    { text: "Delivery Logger", icon: <VideoSettingsRoundedIcon />, path: "/delivery-logger" },
    { text: "Delivery Status", icon: <DeliveryDiningRoundedIcon />, path: "/delivery-status" },
    { text: "Temprory Resources", icon: <ManageAccountsRoundedIcon />, path: "/temprory-resources" },
    { text: "Scrap Log Status", icon: <SevereColdRoundedIcon />, path: "/scrap-log" },
    { text: "Histroy", icon: <ManageHistoryRoundedIcon />, path: "/supervisor-history" },
  ],
  user: [
    { text: "Dashboard", icon: <DashboardRoundedIcon />, path: "/" },
    { text: "Delivery Items", icon: <DeliveryDiningRoundedIcon />, path: "/delivery-items-user" },
    { text: "Delivery Status", icon: <DeliveryDiningRoundedIcon />, path: "/delivery-status-user" },
    { text: "Scrap Status", icon: <SevereColdRoundedIcon />, path: "/scrap-user" },
    { text: "History", icon: <ManageHistoryRoundedIcon />, path: "/history-user" },
  ],
};

function Navbar({ onLoginClick }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode(); // ✅ Theme context hook
  const isXLarge = useMediaQuery("(min-width:1200px)");
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:600px) and (max-width:1200px)");
  const isDark = theme.palette.mode === "dark";

const primaryColor = theme.palette.primary.main;
const secondaryColor = theme.palette.secondary?.main;

  const [open, setOpen] = React.useState(false);
  const [variant, setVariant] = React.useState("permanent");
  const [user, setUser] = useState(null);
  const userRole = user?.role || null;
  const pages = navItemsByRole[userRole] || [];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    console.log('✅ Logged in user:', userData);
    localStorage.setItem('music_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  React.useEffect(() => {
    if (isSmall) {
      setVariant("temporary");
      setOpen(false);
    } else if (isXLarge) {
      setVariant("permanent");
      setOpen(true);
    } else if (isMedium) {
      setVariant("permanent");
      setOpen(false);
    }
  }, [isXLarge, isMedium, isSmall]);

  const handleDrawerToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open && variant === 'permanent'}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!open && (
              <>
                <IconButton
                  onClick={handleDrawerToggle}
                  edge="start"
                  sx={{ mr: 2 }}
                >
                  <MenuOpenRoundedIcon
                    sx={{
                      fontSize: '30px',
                      color: isDark ? '#fff' : '#1989d9',
                      '&:hover': { color: primaryColor },
                    }}
                  />
                </IconButton>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  sx={{
                    color: isDark ? '#fff' : primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontFamily: "'Diphylleia', serif",
                    fontWeight: 900,
                    fontSize: '1.25rem',
                  }}
                >
                  <img
                    src={logo}
                    alt="Smart Logista Logo"
                    style={{
                      width: '34px',
                      height: '34px',
                      objectFit: 'contain',
                    }}
                  />
                  Smart Logista
                </Typography>
              </>
            )}
          </Box>

          {/* Right side - Icons + User Info (hidden on small screens) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notification Icon - Always visible */}
            <Tooltip title="Notifications">
              <IconButton
                sx={{
                  color: isDark ? '#ffffff' : primaryColor,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <NotificationsIcon />
              </IconButton>
            </Tooltip>

            {/* Theme toggle button */}
      <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} mode`} arrow>
  <IconButton
    onClick={toggleTheme}
    sx={{
      color: isDark ? '#ffffff' : primaryColor,
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    }}
  >
    {mode === 'dark' ? (
      <LightModeOutlinedIcon />
    ) : (
      <DarkModeOutlinedIcon />
    )}
  </IconButton>
</Tooltip>

            {/* User greeting and Logout - Hidden on small screens */}

            {!isMedium && (
              <>
              <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    marginRight: '10px',
                    pl: 2,
                    fontSize: '1.2rem',
                    color: isDark ? '#fff' : '#7490ab',
                    display: { xs: 'none', sm: 'flex' },
                    letterSpacing: '0.8px',
                  }}
                >
                  {user ? `Hi, ${user.username}` : 'Hi, Guest'}
                </Typography>
              </>
            )}
            

            {!isSmall && (
              <>

                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  startIcon={<LogoutIcon />}
                  sx={{
                    color: primaryColor,
                    borderColor: primaryColor,
                    borderRadius: '30px',
                    textTransform: 'none',
                    px: {xs: 2, sm: 3},
                    fontWeight: 'bold',
                    fontSize: {xs: '0.7rem', sm: '0.9rem'},
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: isDark ? '#2c3938' : '#bae4f1',
                      borderColor: isDark ? '#22ffe5' : '#22cbff',
                      color: isDark ? '#22ffe5' : '#22cbff',
                    },
                  }}
                >
                  Logout
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {variant === "temporary" ? (
        <MuiDrawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            zIndex: theme.zIndex.drawer + 2,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              background: isDark ? 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' : 'linear-gradient(135deg, #c9e7eb, #b4f4f9, #b9eef2)',
              color: "#ffffff",
            },
          }}
        >
          <DrawerHeader>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                color: isDark ? "#ffffff" : primaryColor,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Diphylleia', serif",
                fontWeight: 900,
                fontSize: "1.25rem",
              }}
            >
              <img
                src={logo}
                alt="Smart Logista Logo"
                style={{
                  width: "34px",
                  height: "34px",
                  objectFit: "contain",
                }}
              />
              Smart Logista
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <MenuOpenRoundedIcon sx={{ fontSize: "30px", color: isDark ? '#fff' : '#495f62' }} />
            </IconButton>
          </DrawerHeader>

          <List>
            {pages.map(({ text, icon, path }) => {
              const isActive = location.pathname === path;
              return (
                <ListItem
  key={text}
  disablePadding
  sx={{ display: "block" }}
>
  <ListItemButton
    component={Link}
    to={path}
    onClick={() => setOpen(false)}
    sx={{
      justifyContent: "initial",
      px: 1,
      margin: "10px",
      borderRadius: "10px",

      backgroundColor: isDark
        ? isActive
          ? "#fff"
          : "transparent"
        : isActive
        ? "#9ee1fa"
        : "transparent",

      color: isDark
        ? isActive
          ? "#FF7622"
          : "#fff"
        : isActive
        ? primaryColor
        : "#535353",

      "&:hover": {
        backgroundColor: "#2c5364",
      },
    }}
  >
    <ListItemIcon
      sx={{
        justifyContent: "center",
        minWidth: 0,
        mr: 2,
        color: isDark
          ? isActive
            ? "#FF7622"
            : "#fff"
          : isActive
          ? primaryColor
          : "#535353",
      }}
    >
      {icon}
    </ListItemIcon>

    {/* ✅ THIS IS WHERE FONT WEIGHT MUST GO */}
    <ListItemText
      primary={text}
      primaryTypographyProps={{
        fontWeight: isActive ? 700 : 400,
        fontSize: "15px",
        transition: "font-weight 0.2s ease",
      }}
    />
  </ListItemButton>
</ListItem>

              );
            })}
            {/* Logout button in drawer for small screens */}
            {user && isSmall && (
              <ListItem disablePadding sx={{ display: "block", mt: 2 }}>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    justifyContent: "initial",
                    px: 1.5,
                    margin: '10px',
                    borderRadius: '10px',
                    backgroundColor: isDark ? secondaryColor : primaryColor,
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: isDark ? secondaryColor : primaryColor,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      justifyContent: "center",
                      minWidth: 0,
                      mr: 3,
                      color: "#fff",
                    }}
                  >
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </MuiDrawer>
      ) : (
        <Drawer variant="permanent" open={open}>
          <DrawerHeader>
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: isDark ? "#fff" : primaryColor,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Diphylleia', serif",
                fontWeight: 900,
                fontSize: "1.25rem",
              }}
            >
              <img
                src={logo}
                alt="Smart Logista Logo"
                style={{
                  width: "34px",
                  height: "34px",
                  objectFit: "contain",
                }}
              />
              Smart Logista
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon sx={{ color: "#aaa" }} />
            </IconButton>
          </DrawerHeader>
          <List>
            {pages.map(({ text, icon, path }) => {
              const isActive = location.pathname === path;
              return (
                <ListItem key={text} disablePadding sx={{ display: "block" }}>
  <ListItemButton
    component={Link}
    to={path}
    sx={{
      justifyContent: open ? "initial" : "center",
      px: 2,
      margin: "5px",
      borderRadius: "10px",
      backgroundColor: isDark
        ? isActive
          ? "#fff"
          : "transparent"
        : isActive
        ? "#9ee1fa"
        : "transparent",

      color: isDark
        ? isActive
          ? "#FF7622"
          : "#fff"
        : isActive
        ? primaryColor
        : "#535353",

      "&:hover": {
        backgroundColor: isDark ? "#2c5364" : "#abd8ee",
      },
    }}
  >
    <ListItemIcon
      sx={{
        justifyContent: "center",
        minWidth: 0,
        mr: open ? 2 : "auto",
        color: isDark
          ? isActive
            ? "#FF7622"
            : "#fff"
          : isActive
          ? primaryColor
          : "#535353",
      }}
    >
      {icon}
    </ListItemIcon>

    <ListItemText
      primary={text}
      primaryTypographyProps={{
        fontWeight: isActive ? 700 : 500,
      }}
      sx={{
        opacity: open ? 1 : 0,
      }}
    />
  </ListItemButton>
</ListItem>

              );
            })}
            <Button
                  onClick={handleLogout}
                  variant="outlined"
                  startIcon={<LogoutIcon />}
                  sx={{
                    color: secondaryColor,
                    borderColor: secondaryColor,
                    borderRadius: '30px',
                    textTransform: 'none',
                    display: {xs: 'flex', sm: 'none'},
                    px: {xs: 2, sm: 3},
                    fontWeight: 'bold',
                    fontSize: {xs: '0.7rem', sm: '0.9rem'},
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: isDark ? '#fff3e0' : primaryColor,
                      borderColor: secondaryColor,
                      color: secondaryColor,
                    },
                  }}
                >
                  Logout
                </Button>
          </List>
        </Drawer>
      )}
    </Box>
  );
}

export default Navbar;
