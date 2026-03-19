// src/pages/Supervisor/TemporaryResources.jsx
import React, { useState } from "react";
import { Box, Typography, useTheme, alpha } from "@mui/material";
import { Groups, DirectionsCar } from "@mui/icons-material";
import AddTemporaryUsers    from "./AddTempUsers";
import AddTemporaryVehicles from "./AddTempVehicles";

const TABS = [
  { key: "users",    label: "External Drivers", Icon: Groups,        accentKey: "warning" },
  { key: "vehicles", label: "Temp Vehicles",    Icon: DirectionsCar, accentKey: "info"    },
];

const TemporaryResources = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [activeTab, setActiveTab] = useState("users");

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@500;600;700&display=swap');
      `}</style>

      {/* ── Page title ── */}
      <Box mb={3.5}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.025em", color: "text.primary" }}
        >
          Temporary Resources
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'DM Sans', sans-serif" }}>
          Manage short-term external drivers and fleet vehicles
        </Typography>
      </Box>

      {/* ── Tab switcher ── */}
      <Box
        sx={{
          display: "inline-flex",
          gap: 0.5,
          p: 0.5,
          mb: 3,
          borderRadius: 2.5,
          bgcolor: isDark
            ? alpha(theme.palette.background.paper, 0.55)
            : alpha(theme.palette.text.primary, 0.05),
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {TABS.map(({ key, label, Icon, accentKey }) => {
          const accent = theme.palette[accentKey]?.main;
          const active = activeTab === key;
          return (
            <Box
              key={key}
              onClick={() => setActiveTab(key)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1.1,
                borderRadius: 2,
                cursor: "pointer",
                transition: "all .2s ease",
                bgcolor: active
                  ? isDark ? alpha(accent, 0.14) : "background.paper"
                  : "transparent",
                border: active
                  ? `1px solid ${alpha(accent, 0.28)}`
                  : "1px solid transparent",
                boxShadow: active ? `0 2px 8px ${alpha(accent, 0.15)}` : "none",
                "&:hover": {
                  bgcolor: active ? undefined : alpha(accent, 0.06),
                },
              }}
            >
              <Icon
                sx={{
                  fontSize: 17,
                  color: active ? accent : "text.disabled",
                  transition: "color .2s",
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: active ? 700 : 500,
                  color: active ? accent : "text.secondary",
                  transition: "color .2s",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── Tab content ── */}
      {activeTab === "users"    && <AddTemporaryUsers />}
      {activeTab === "vehicles" && <AddTemporaryVehicles />}
    </Box>
  );
};

export default TemporaryResources;