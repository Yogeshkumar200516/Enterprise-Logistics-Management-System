import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Skeleton,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import RecyclingRoundedIcon from "@mui/icons-material/RecyclingRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import api from "../../context/Api";

// ─── Priority config ───────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  error: {
    color: "#ff4d6d",
    bg: "rgba(255,77,109,0.10)",
    border: "rgba(255,77,109,0.28)",
    glow: "rgba(255,77,109,0.20)",
    icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Critical",
  },
  warning: {
    color: "#ffa940",
    bg: "rgba(255,169,64,0.10)",
    border: "rgba(255,169,64,0.28)",
    glow: "rgba(255,169,64,0.18)",
    icon: <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Attention",
  },
  success: {
    color: "#52c41a",
    bg: "rgba(82,196,26,0.10)",
    border: "rgba(82,196,26,0.28)",
    glow: "rgba(82,196,26,0.15)",
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Done",
  },
  info: {
    color: "#40a9ff",
    bg: "rgba(64,169,255,0.08)",
    border: "rgba(64,169,255,0.22)",
    glow: "rgba(64,169,255,0.12)",
    icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
    label: "Info",
  },
};

// ─── Notification type icon ────────────────────────────────────────────────
function TypeIcon({ type, color }) {
  const iconProps = { sx: { fontSize: 17, color } };
  if (type?.includes("scrap")) return <RecyclingRoundedIcon {...iconProps} />;
  if (type?.includes("admin")) return <AdminPanelSettingsRoundedIcon {...iconProps} />;
  if (type?.includes("driver") || type?.includes("fleet"))
    return <DirectionsCarRoundedIcon {...iconProps} />;
  return <LocalShippingRoundedIcon {...iconProps} />;
}

// ─── Time formatter ────────────────────────────────────────────────────────
function timeAgo(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Single Notification Card ──────────────────────────────────────────────
function NotificationCard({ notif, isDark, index }) {
  const cfg = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.info;

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        gap: 1.5,
        p: "12px 14px",
        mb: 1,
        borderRadius: "12px",
        border: `1px solid ${cfg.border}`,
        background: isDark
          ? `linear-gradient(135deg, ${cfg.bg}, rgba(255,255,255,0.02))`
          : `linear-gradient(135deg, ${cfg.bg}, rgba(255,255,255,0.7))`,
        backdropFilter: "blur(8px)",
        boxShadow: `0 2px 12px ${cfg.glow}`,
        cursor: "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        animationName: "slideIn",
        animationDuration: "0.35s",
        animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        animationFillMode: "both",
        animationDelay: `${index * 0.04}s`,
        "@keyframes slideIn": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: `0 6px 20px ${cfg.glow}`,
        },
        "&:last-child": { mb: 0 },
      }}
    >
      {/* Priority stripe */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: "12px",
          bottom: "12px",
          width: "3px",
          borderRadius: "0 2px 2px 0",
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.color}`,
        }}
      />

      {/* Type Icon */}
      <Box
        sx={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDark
            ? `rgba(255,255,255,0.06)`
            : `rgba(0,0,0,0.04)`,
          border: `1px solid ${cfg.border}`,
          mt: "1px",
        }}
      >
        <TypeIcon type={notif.type} color={cfg.color} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 0.3,
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "0.78rem",
              color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.82)",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {notif.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexShrink: 0 }}>
            <Chip
              label={cfg.label}
              size="small"
              icon={React.cloneElement(cfg.icon, { sx: { fontSize: "11px !important" } })}
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 700,
                color: cfg.color,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                "& .MuiChip-icon": { color: cfg.color, ml: "4px" },
                "& .MuiChip-label": { px: "5px" },
              }}
            />
            <Typography
              sx={{
                fontSize: "0.65rem",
                color: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)",
                whiteSpace: "nowrap",
              }}
            >
              {timeAgo(notif.timestamp)}
            </Typography>
          </Box>
        </Box>
        <Typography
          sx={{
            fontSize: "0.76rem",
            color: isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.58)",
            lineHeight: 1.45,
            wordBreak: "break-word",
          }}
        >
          {notif.message}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────
function NotifSkeleton({ isDark }) {
  return (
    <Box sx={{ mb: 1 }}>
      {[1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            gap: 1.5,
            p: "12px 14px",
            mb: 1,
            borderRadius: "12px",
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)",
          }}
        >
          <Skeleton
            variant="rounded"
            width={36}
            height={36}
            sx={{ borderRadius: "10px", flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={16} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="90%" height={14} />
            <Skeleton variant="text" width="75%" height={14} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ─── Filter Tabs ───────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all", label: "All" },
  { key: "error", label: "Critical" },
  { key: "warning", label: "Attention" },
  { key: "success", label: "Done" },
  { key: "info", label: "Info" },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function NotificationModal({ open, anchorEl, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const modalRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [actionRequired, setActionRequired] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch notifications ────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get("/api/notifications");
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setActionRequired(res.data.action_required || 0);
      }
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setActiveFilter("all");
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // ── Click outside to close ─────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target) &&
        anchorEl &&
        !anchorEl.contains(e.target)
      ) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, anchorEl, onClose]);

  // ── Filtered notifications ─────────────────────────────────────────────
  const filtered =
    activeFilter === "all"
      ? notifications
      : notifications.filter((n) => n.priority === activeFilter);

  // ── Position the modal relative to anchor ─────────────────────────────
  const getPosition = () => {
    if (!anchorEl) return { top: 70, right: 16 };
    const rect = anchorEl.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    };
  };

  const pos = getPosition();

  if (!open) return null;

  // ── Colors ─────────────────────────────────────────────────────────────
  const primaryColor = theme.palette.primary.main;
  const glass = isDark
    ? "rgba(15, 20, 35, 0.92)"
    : "rgba(255, 255, 255, 0.94)";
  const borderColor = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.10)";

  return (
    <>
      {/* Backdrop blur overlay (subtle) */}
      <Box
        onClick={onClose}
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1299,
        }}
      />

      {/* Modal panel */}
      <Box
        ref={modalRef}
        sx={{
          position: "fixed",
          top: pos.top,
          right: pos.right,
          width: { xs: "calc(100vw - 24px)", sm: 400 },
          maxWidth: 420,
          zIndex: 1300,
          borderRadius: "18px",
          background: glass,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: `1px solid ${borderColor}`,
          boxShadow: isDark
            ? `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`
            : `0 24px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)`,
          overflow: "hidden",
          animationName: "popIn",
          animationDuration: "0.28s",
          animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          animationFillMode: "both",
          "@keyframes popIn": {
            from: { opacity: 0, transform: "scale(0.92) translateY(-8px)" },
            to: { opacity: 1, transform: "scale(1) translateY(0)" },
          },
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${borderColor}`,
            background: isDark
              ? "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))"
              : "linear-gradient(135deg, rgba(2,73,144,0.04), rgba(255,255,255,0.6))",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${primaryColor}, ${alpha(primaryColor, 0.7)})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${alpha(primaryColor, 0.35)}`,
              }}
            >
              <NotificationsNoneRoundedIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: isDark ? "#fff" : "#1a1a2e",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Notifications
              </Typography>
              {actionRequired > 0 && (
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: "#ffa940",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {actionRequired} need{actionRequired === 1 ? "s" : ""} attention
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Refresh" arrow>
              <IconButton
                size="small"
                onClick={() => fetchNotifications(true)}
                sx={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                  "&:hover": { color: primaryColor },
                  animation: refreshing ? "spin 0.8s linear infinite" : "none",
                  "@keyframes spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              >
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close" arrow>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                  "&:hover": { color: isDark ? "#fff" : "#000" },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            gap: 0.6,
            px: 2,
            py: 1.2,
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? notifications.length
                : notifications.filter((n) => n.priority === f.key).length;
            const isActive = activeFilter === f.key;
            const cfg = PRIORITY_CONFIG[f.key];
            const activeColor = f.key === "all" ? primaryColor : cfg?.color;

            return (
              <Box
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.2,
                  py: 0.55,
                  borderRadius: "20px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontSize: "0.72rem",
                  fontWeight: isActive ? 700 : 500,
                  transition: "all 0.2s ease",
                  color: isActive
                    ? "#fff"
                    : isDark
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(0,0,0,0.5)",
                  background: isActive
                    ? `linear-gradient(135deg, ${activeColor}, ${alpha(activeColor, 0.75)})`
                    : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                  border: isActive
                    ? `1px solid ${alpha(activeColor, 0.5)}`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                  boxShadow: isActive
                    ? `0 2px 8px ${alpha(activeColor, 0.3)}`
                    : "none",
                  "&:hover": {
                    background: isActive
                      ? undefined
                      : isDark
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(0,0,0,0.07)",
                  },
                }}
              >
                {f.label}
                {count > 0 && (
                  <Box
                    sx={{
                      minWidth: 16,
                      height: 16,
                      borderRadius: "8px",
                      background: isActive
                        ? "rgba(255,255,255,0.3)"
                        : isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      px: 0.5,
                    }}
                  >
                    {count}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ── Notification list ────────────────────────────────────────────── */}
        <Box
          sx={{
            maxHeight: 420,
            overflowY: "auto",
            px: 2,
            py: 1.5,
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
              borderRadius: "4px",
            },
          }}
        >
          {loading ? (
            <NotifSkeleton isDark={isDark} />
          ) : filtered.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 5,
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${borderColor}`,
                }}
              >
                <DoneAllRoundedIcon
                  sx={{
                    fontSize: 28,
                    color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                }}
              >
                All caught up!
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.28)",
                  textAlign: "center",
                  maxWidth: 200,
                }}
              >
                {activeFilter === "all"
                  ? "No notifications right now"
                  : `No ${activeFilter} notifications`}
              </Typography>
            </Box>
          ) : (
            filtered.map((notif, index) => (
              <NotificationCard
                key={notif.id}
                notif={notif}
                isDark={isDark}
                index={index}
              />
            ))
          )}
        </Box>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {!loading && notifications.length > 0 && (
          <Box
            sx={{
              px: 2.5,
              py: 1.4,
              borderTop: `1px solid ${borderColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.015)",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.70rem",
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              }}
            >
              {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.70rem",
                color: primaryColor,
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { opacity: 0.8 },
              }}
              onClick={onClose}
            >
              Close panel
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}