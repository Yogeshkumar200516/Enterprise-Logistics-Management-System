import React, { useState, useEffect, useRef, useCallback } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useThemeMode } from "../../ToggleTheme/ThemeContext";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Brightness6Icon from "@mui/icons-material/Brightness6";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import ManageHistoryRoundedIcon from "@mui/icons-material/ManageHistoryRounded";
import AdsClickRoundedIcon from "@mui/icons-material/AdsClickRounded";
import SevereColdRoundedIcon from "@mui/icons-material/SevereColdRounded";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DeliveryDiningRoundedIcon from "@mui/icons-material/DeliveryDiningRounded";
import VideoSettingsRoundedIcon from "@mui/icons-material/VideoSettingsRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
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
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import NotificationModal from "../Notification/NotificationModal"; // ← adjust path as needed
import api from "../../context/Api";

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
  backgroundColor: theme.palette.background.paper,
  boxShadow: "none",
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
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.mode === "dark" ? "#fff" : "#000",
        },
      }
    : {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": {
          ...closedMixin(theme),
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.mode === "dark" ? "#fff" : "#000",
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
    { text: "Add Orders", icon: <ReceiptLongOutlinedIcon />, path: "/add-orders" },
    { text: "History", icon: <ManageHistoryRoundedIcon />, path: "/admin-history" },
  ],
  supervisor: [
    { text: "Dashboard", icon: <DashboardRoundedIcon />, path: "/" },
    { text: "Delivery Logger", icon: <VideoSettingsRoundedIcon />, path: "/delivery-logger" },
    { text: "Temprory Resources", icon: <ManageAccountsRoundedIcon />, path: "/temprory-resources" },
    { text: "Scrap Log Status", icon: <SevereColdRoundedIcon />, path: "/scrap-log" },
    { text: "Add Orders", icon: <ReceiptLongOutlinedIcon />, path: "/add-orders" },
    { text: "Histroy", icon: <ManageHistoryRoundedIcon />, path: "/supervisor-history" },
  ],
  user: [
    { text: "Delivery Status", icon: <DeliveryDiningRoundedIcon />, path: "/" },
    { text: "Scrap Status", icon: <SevereColdRoundedIcon />, path: "/scrap-user" },
    { text: "History", icon: <ManageHistoryRoundedIcon />, path: "/history-user" },
  ],
};

// Roles that should see notification bell
const NOTIFICATION_ROLES = ["admin", "supervisor", "user"];

// Badge color pulse animation
const pulseBadgeStyles = {
  "@keyframes pulse": {
    "0%": { boxShadow: "0 0 0 0 rgba(255,77,109,0.5)" },
    "70%": { boxShadow: "0 0 0 6px rgba(255,77,109,0)" },
    "100%": { boxShadow: "0 0 0 0 rgba(255,77,109,0)" },
  },
};

function Navbar({ onLoginClick }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
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

  // ── Notification state ─────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifBellRef = useRef(null);
  const notifIntervalRef = useRef(null);

  const showNotifBell = NOTIFICATION_ROLES.includes(userRole);

  // Fetch badge count (lightweight)
  const fetchNotifCount = useCallback(async () => {
    if (!showNotifBell) return;
    try {
      const res = await api.get("/api/notifications/count");
      if (res.data.success) setNotifCount(res.data.count || 0);
    } catch (_) {
      // silently fail
    }
  }, [showNotifBell]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Poll notification count every 60 seconds
  useEffect(() => {
    if (!userRole || !showNotifBell) return;
    fetchNotifCount();
    notifIntervalRef.current = setInterval(fetchNotifCount, 60000);
    return () => clearInterval(notifIntervalRef.current);
  }, [userRole, fetchNotifCount, showNotifBell]);

  const handleLogin = (userData) => {
    localStorage.setItem("music_user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleNotifToggle = () => {
    setNotifOpen((prev) => !prev);
  };

  const handleNotifClose = () => {
    setNotifOpen(false);
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

  // ── Nav item renderer (shared) ─────────────────────────────────────────
  const renderNavItems = (onItemClick) =>
    pages.map(({ text, icon, path }) => {
      const isActive = location.pathname === path;
      return (
        <ListItem key={text} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            component={Link}
            to={path}
            onClick={onItemClick}
            sx={{
              justifyContent: open ? "initial" : "center",
              px: variant === "temporary" ? 1 : 2,
              margin: variant === "temporary" ? "10px" : "5px",
              borderRadius: "10px",
              backgroundColor: isDark
                ? isActive ? "#fff" : "transparent"
                : isActive ? "#9ee1fa" : "transparent",
              color: isDark
                ? isActive ? "#FF7622" : "#fff"
                : isActive ? primaryColor : "#535353",
              "&:hover": {
                backgroundColor: isDark ? "#2c5364" : "#abd8ee",
              },
            }}
          >
            <ListItemIcon
              sx={{
                justifyContent: "center",
                minWidth: 0,
                mr: variant === "temporary" ? 2 : open ? 2 : "auto",
                color: isDark
                  ? isActive ? "#FF7622" : "#fff"
                  : isActive ? primaryColor : "#535353",
              }}
            >
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={text}
              primaryTypographyProps={{
                fontWeight: isActive ? 700 : variant === "temporary" ? 400 : 500,
                fontSize: variant === "temporary" ? "15px" : undefined,
                transition: "font-weight 0.2s ease",
              }}
              sx={{
                opacity: variant === "temporary" ? 1 : open ? 1 : 0,
              }}
            />
          </ListItemButton>
        </ListItem>
      );
    });

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open && variant === "permanent"}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Left */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {!open && (
              <>
                <IconButton onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
                  <MenuOpenRoundedIcon
                    sx={{
                      fontSize: "30px",
                      color: isDark ? "#fff" : "#1989d9",
                      "&:hover": { color: primaryColor },
                    }}
                  />
                </IconButton>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
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
                    style={{ width: "34px", height: "34px", objectFit: "contain" }}
                  />
                  Smart Logista
                </Typography>
              </>
            )}
          </Box>

          {/* Right */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Notification Bell — only for eligible roles */}
            {showNotifBell && (
              <Tooltip title="Notifications" arrow>
                <IconButton
                  ref={notifBellRef}
                  onClick={handleNotifToggle}
                  sx={{
                    color: notifOpen
                      ? primaryColor
                      : isDark
                      ? "#ffffff"
                      : primaryColor,
                    position: "relative",
                    transition: "transform 0.2s ease",
                    "&:hover": {
                      transform: "scale(1.1)",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(2,73,144,0.08)",
                    },
                  }}
                >
                  <Badge
                    badgeContent={notifCount}
                    max={99}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #ff4d6d, #ff6b35)",
                        color: "#fff",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        minWidth: 17,
                        height: 17,
                        padding: "0 4px",
                        boxShadow: "0 2px 6px rgba(255,77,109,0.5)",
                        ...(notifCount > 0 && {
                          animation: "pulse 2s infinite",
                        }),
                        ...pulseBadgeStyles,
                      },
                    }}
                  >
                    <NotificationsIcon
                      sx={{
                        fontSize: "24px",
                        transform: notifOpen ? "rotate(-15deg)" : "rotate(0deg)",
                        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                      }}
                    />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            {/* Theme toggle */}
            <Tooltip
              title={`Switch to ${mode === "dark" ? "Light" : "Dark"} mode`}
              arrow
            >
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: isDark ? "#ffffff" : primaryColor,
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                {mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            </Tooltip>

            {/* User greeting */}
            {!isMedium && (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  marginRight: "10px",
                  pl: 2,
                  fontSize: "1.2rem",
                  color: isDark ? "#fff" : "#7490ab",
                  display: { xs: "none", sm: "flex" },
                  letterSpacing: "0.8px",
                }}
              >
                {user ? `Hi, ${user.username}` : "Hi, Guest"}
              </Typography>
            )}

            {/* Logout button */}
            {!isSmall && (
              <Button
                onClick={handleLogout}
                variant="outlined"
                startIcon={<LogoutIcon />}
                sx={{
                  color: primaryColor,
                  borderColor: primaryColor,
                  borderRadius: "30px",
                  textTransform: "none",
                  px: { xs: 2, sm: 3 },
                  fontWeight: "bold",
                  fontSize: { xs: "0.7rem", sm: "0.9rem" },
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: isDark ? "#22ffe5" : "#22cbff",
                    color: isDark ? "#22ffe5" : "#22cbff",
                  },
                }}
              >
                Logout
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Notification Modal ──────────────────────────────────────────── */}
      <NotificationModal
        open={notifOpen}
        anchorEl={notifBellRef.current}
        onClose={handleNotifClose}
      />

      {/* ── Drawers ─────────────────────────────────────────────────────── */}
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
              backgroundColor: theme.palette.background.paper,
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
                style={{ width: "34px", height: "34px", objectFit: "contain" }}
              />
              Smart Logista
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <MenuOpenRoundedIcon
                sx={{ fontSize: "30px", color: isDark ? "#fff" : "#495f62" }}
              />
            </IconButton>
          </DrawerHeader>
          <List>
            {renderNavItems(() => setOpen(false))}
            {/* Logout for small screens */}
            {user && isSmall && (
              <ListItem disablePadding sx={{ display: "block", mt: 2 }}>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    justifyContent: "initial",
                    px: 1.5,
                    margin: "10px",
                    borderRadius: "10px",
                    backgroundColor: isDark ? secondaryColor : primaryColor,
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: isDark ? secondaryColor : primaryColor,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{ justifyContent: "center", minWidth: 0, mr: 3, color: "#fff" }}
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
                style={{ width: "34px", height: "34px", objectFit: "contain" }}
              />
              Smart Logista
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon sx={{ color: "#aaa" }} />
            </IconButton>
          </DrawerHeader>
          <List>
            {renderNavItems(undefined)}
            <Button
              onClick={handleLogout}
              variant="outlined"
              startIcon={<LogoutIcon />}
              sx={{
                color: secondaryColor,
                borderColor: secondaryColor,
                borderRadius: "30px",
                textTransform: "none",
                display: { xs: "flex", sm: "none" },
                px: { xs: 2, sm: 3 },
                fontWeight: "bold",
                fontSize: { xs: "0.7rem", sm: "0.9rem" },
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: isDark ? "#fff3e0" : primaryColor,
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