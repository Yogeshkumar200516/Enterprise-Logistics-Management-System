// src/pages/SupervisorDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Paper, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Skeleton, alpha, useTheme,
  LinearProgress, Tooltip, IconButton, Alert,
} from "@mui/material";
import {
  LocalShipping, RecyclingRounded, CheckCircle,
  DirectionsCar, People, Refresh, TrendingUp,
  Assignment, Inventory,
} from "@mui/icons-material";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Line,
} from "recharts";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import api from "../../../context/Api";
import { useAuth } from "../../../context/AuthContext";

const COLORS = ["#024990","#22fbff","#ff9800","#f44336","#4caf50","#9c27b0","#0891b2","#e91e63"];

const DELIVERY_STATUS_COLORS = {
  ASSIGNED: "#22fbff",
  IN_TRANSIT: "#ff9800",
  DELIVERED: "#4caf50",
  PARTIALLY_DELIVERED: "#9c27b0",
};
const SCRAP_STATUS_COLORS = {
  ASSIGNED: "#0891b2",
  IN_TRANSIT: "#ff9800",
  COMPLETED: "#4caf50",
  APPROVED: "#22c55e",
  REJECTED: "#f44336",
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{ height: "100%" }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5, height: "100%", borderRadius: 3,
          background: isDark
            ? `linear-gradient(135deg,${alpha(color,0.15)} 0%,${alpha(color,0.04)} 100%)`
            : `linear-gradient(135deg,${alpha(color,0.09)} 0%,${alpha(color,0.03)} 100%)`,
          border: `1px solid ${alpha(color, isDark ? 0.25 : 0.15)}`,
          display: "flex", alignItems: "center", gap: 2,
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": { transform: "translateY(-3px)", boxShadow: `0 10px 28px ${alpha(color, 0.22)}` },
        }}
      >
        <Box
          sx={{
            width: 52, height: 52, borderRadius: 2.5, flexShrink: 0,
            background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 14px ${alpha(color, 0.38)}`,
          }}
        >
          {React.cloneElement(icon, { sx: { color: "#fff", fontSize: 24 } })}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}
          >
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1.1 }}>
            {value ?? <Skeleton width={40} />}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
      </Paper>
    </motion.div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Section({ title, icon, children, delay = 0 }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3, overflow: "hidden", height: "100%",
          border: `1px solid ${isDark ? alpha("#fff",0.08) : alpha("#024990",0.1)}`,
          background: isDark
            ? "linear-gradient(135deg,#1e2a32 0%,#162028 100%)"
            : "linear-gradient(135deg,#ffffff 0%,#f4f8ff 100%)",
        }}
      >
        <Box
          sx={{
            px: 2.5, py: 1.8,
            background: isDark ? alpha("#024990",0.2) : alpha("#024990",0.06),
            borderBottom: `1px solid ${isDark ? alpha("#fff",0.07) : alpha("#024990",0.1)}`,
            display: "flex", alignItems: "center", gap: 1,
          }}
        >
          {React.cloneElement(icon, { sx: { color: isDark ? "#91eff1" : "#024990", fontSize: 20 } })}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDark ? "#91eff1" : "#024990" }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>{children}</Box>
      </Paper>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ height = 260, message = "No data for this period" }) {
  return (
    <Box sx={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography color="text.secondary" variant="body2">{message}</Typography>
    </Box>
  );
}

// ── Custom Pie Label ──────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const x = cx + (outerRadius + 26) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 26) * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y} fill="#888" fontSize={10}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SupervisorDashboard() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { user } = useAuth();

  const [period,  setPeriod]  = useState("month");
  const [loading, setLoading] = useState(true);
  const [errors,  setErrors]  = useState({});
  const [data, setData] = useState({
    summary: null, trend: [], deliveryPie: [], scrapPie: [],
    driverWorkload: [], recentDeliveries: [], recentScraps: [],
  });

  const ttStyle = {
    backgroundColor: isDark ? "#1e2a32" : "#fff",
    border: `1px solid ${isDark ? alpha("#fff",0.12) : alpha("#024990",0.15)}`,
    borderRadius: 8, color: isDark ? "#fff" : "#1e1e1e", fontSize: 12,
  };

  // Safe individual fetch — never throws, always resolves
  const safeFetch = async (url, key) => {
    try {
      const res = await api.get(url);
      return { key, data: res.data.data, error: null };
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load";
      return { key, data: null, error: msg };
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const q = `?period=${period}`;

    const results = await Promise.all([
      safeFetch(`/api/supervisor-dashboard/summary${q}`,           "summary"),
      safeFetch(`/api/supervisor-dashboard/delivery-trend${q}`,    "trend"),
      safeFetch(`/api/supervisor-dashboard/delivery-status-pie${q}`,"deliveryPie"),
      safeFetch(`/api/supervisor-dashboard/scrap-status-pie${q}`,  "scrapPie"),
      safeFetch(`/api/supervisor-dashboard/driver-workload${q}`,   "driverWorkload"),
      safeFetch(`/api/supervisor-dashboard/recent-deliveries`,     "recentDeliveries"),
      safeFetch(`/api/supervisor-dashboard/recent-scraps`,         "recentScraps"),
    ]);

    const newData   = {};
    const newErrors = {};
    let   hadError  = false;

    for (const { key, data: d, error } of results) {
      if (error) {
        newErrors[key] = error;
        hadError = true;
      }
      switch (key) {
        case "summary":
          newData.summary = d ?? null;
          break;
        case "trend":
          newData.trend = Array.isArray(d) ? d : [];
          break;
        case "deliveryPie":
          newData.deliveryPie = Array.isArray(d)
            ? d.map((x) => ({ name: x.status.replace(/_/g, " "), value: Number(x.count), raw: x.status }))
            : [];
          break;
        case "scrapPie":
          newData.scrapPie = Array.isArray(d)
            ? d.map((x) => ({ name: x.status.replace(/_/g, " "), value: Number(x.count), raw: x.status }))
            : [];
          break;
        case "driverWorkload":
          newData.driverWorkload = Array.isArray(d) ? d : [];
          break;
        case "recentDeliveries":
          newData.recentDeliveries = Array.isArray(d) ? d : [];
          break;
        case "recentScraps":
          newData.recentScraps = Array.isArray(d) ? d : [];
          break;
        default:
          break;
      }
    }

    setData((prev) => ({ ...prev, ...newData }));
    setErrors(newErrors);
    if (hadError) toast.error("Some sections failed to load — check the console");
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const { summary, trend, deliveryPie, scrapPie, driverWorkload, recentDeliveries, recentScraps } = data;

  const greet = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  };

  const SectionError = ({ keyName }) =>
    errors[keyName] ? (
      <Alert severity="error" sx={{ borderRadius: 2, fontSize: 12 }}>
        {errors[keyName]}
      </Alert>
    ) : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", bgcolor: "background.default" }}>
      <Toaster position="top-right" />

      {/* ── Hero Header ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #0f4c81 0%, #024990 45%, #065f46 100%)",
            borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 3,
            position: "relative", overflow: "hidden",
            boxShadow: "0 10px 40px rgba(2,73,144,0.3)",
          }}
        >
          {[200, 130, 75].map((s, i) => (
            <Box key={i} sx={{
              position: "absolute", right: 55 * i - 15, top: -s / 3,
              width: s, height: s, borderRadius: "50%",
              bgcolor: alpha("#22fbff", 0.07 - i * 0.015), pointerEvents: "none",
            }} />
          ))}
          <Box
            sx={{
              position: "relative", display: "flex",
              justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: alpha("#fff", 0.6), mb: 0.4 }}>
                {greet()}, {user?.full_name?.split(" ")[0] || "Supervisor"} 👋
              </Typography>
              <Typography variant="h4" sx={{ color: "#fff", fontWeight: 800, lineHeight: 1.1 }}>
                Supervisor Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: "#22fbff", mt: 0.5, fontWeight: 500 }}>
                Track your deliveries, scrap runs and driver activity
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
              <ToggleButtonGroup
                value={period} exclusive size="small"
                onChange={(_, v) => v && setPeriod(v)}
                sx={{
                  bgcolor: alpha("#fff", 0.1), borderRadius: 2,
                  "& .MuiToggleButton-root": {
                    color: alpha("#fff",0.7), border: "none", px: 2, py: 0.6,
                    fontWeight: 600, fontSize: 12, borderRadius: "8px !important",
                    "&.Mui-selected": { bgcolor: "#22fbff", color: "#024990" },
                    "&:hover": { bgcolor: alpha("#fff",0.15) },
                  },
                }}
              >
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="year">Year</ToggleButton>
              </ToggleButtonGroup>

              {/* ✅ Fix: wrap disabled button in span so Tooltip events fire correctly */}
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    onClick={fetchAll}
                    disabled={loading}
                    sx={{
                      bgcolor: alpha("#fff",0.1), color: "#fff",
                      "&:hover": { bgcolor: alpha("#fff",0.2) },
                      "&.Mui-disabled": { bgcolor: alpha("#fff",0.05), color: alpha("#fff",0.3) },
                    }}
                  >
                    {loading ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { icon: <Assignment />,       label: "My Deliveries",   value: summary?.daStats?.total_assignments,   sub: `${summary?.daStats?.in_transit       || 0} in transit`,  color: "#024990", delay: 0    },
          { icon: <CheckCircle />,      label: "Completed",       value: summary?.daStats?.delivered,           sub: "delivery assignments",                                    color: "#4caf50", delay: 0.06 },
          { icon: <RecyclingRounded />, label: "Scrap Runs",      value: summary?.scrapStats?.total_scrap,      sub: `${summary?.scrapStats?.approved       || 0} approved`,    color: "#9c27b0", delay: 0.12 },
          { icon: <Inventory />,        label: "Items Delivered", value: summary?.itemStats?.items_delivered,   sub: `${summary?.itemStats?.items_damaged   || 0} damaged`,     color: "#ff9800", delay: 0.18 },
          { icon: <DirectionsCar />,    label: "Vehicles",        value: summary?.vehicleStats?.total_vehicles, sub: `${summary?.vehicleStats?.available    || 0} available`,   color: "#0891b2", delay: 0.24 },
          { icon: <People />,           label: "Drivers",         value: summary?.driverStats?.total_drivers,   sub: `${summary?.driverStats?.available     || 0} available`,   color: "#22c55e", delay: 0.30 },
        ].map((c) => (
          <Grid item xs={6} sm={4} md={2} key={c.label}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* ── Row 2: Area Chart + Delivery Pie ───────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5, width: '100%', flex: 1 }}>
        <Grid item xs={12} lg={8} sx={{width: '60%'}}>
          <Section title="Delivery Assignment Trend" icon={<TrendingUp />} delay={0.1}>
            {errors.trend ? (
              <SectionError keyName="trend" />
            ) : loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : trend.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={isDark ? "#22fbff" : "#024990"} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={isDark ? "#22fbff" : "#024990"} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4caf50" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? alpha("#fff",0.06) : alpha("#000",0.06)} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? "#aaa" : "#666" }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? "#aaa" : "#666" }} />
                  <RTooltip contentStyle={ttStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="total"     stroke={isDark ? "#22fbff" : "#024990"} strokeWidth={2.5} fill="url(#gTotal)"     name="Total" />
                  <Area type="monotone" dataKey="delivered" stroke="#4caf50" strokeWidth={2}   fill="url(#gDelivered)" name="Delivered" />
                  <Line type="monotone" dataKey="in_transit" stroke="#ff9800" strokeWidth={2}  dot={false} name="In Transit" strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>
        </Grid>

        <Grid item xs={12} sm={6} lg={4} sx={{width: '38%'}}>
          <Section title="Delivery Status Split" icon={<LocalShipping />} delay={0.15}>
            {errors.deliveryPie ? (
              <SectionError keyName="deliveryPie" />
            ) : loading ? (
              <Skeleton variant="circular" width={180} height={180} sx={{ mx: "auto" }} />
            ) : deliveryPie.length === 0 ? (
              <EmptyState height={210} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={deliveryPie} cx="50%" cy="50%" outerRadius={78} dataKey="value" label={PieLabel} labelLine={false}>
                      {deliveryPie.map((d, i) => (
                        <Cell key={i} fill={DELIVERY_STATUS_COLORS[d.raw] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 0.5 }}>
                  {deliveryPie.map((d, i) => (
                    <Chip
                      key={d.name}
                      label={`${d.name}: ${d.value}`}
                      size="small"
                      sx={{
                        bgcolor: alpha(DELIVERY_STATUS_COLORS[d.raw] || COLORS[i % COLORS.length], 0.15),
                        color: DELIVERY_STATUS_COLORS[d.raw] || COLORS[i % COLORS.length],
                        fontWeight: 600, fontSize: 10,
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Section>
        </Grid>
      </Grid>

      {/* ── Row 3: Scrap Pie + Driver Workload ─────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5, width: '100%' }}>
        <Grid item xs={12} sm={6} lg={4} sx={{width: '60%'}}>
          <Section title="Scrap Run Status" icon={<RecyclingRounded />} delay={0.2}>
            {errors.scrapPie ? (
              <SectionError keyName="scrapPie" />
            ) : loading ? (
              <Skeleton variant="circular" width={180} height={180} sx={{ mx: "auto" }} />
            ) : scrapPie.length === 0 ? (
              <EmptyState height={210} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={scrapPie} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={3}>
                      {scrapPie.map((d, i) => (
                        <Cell key={i} fill={SCRAP_STATUS_COLORS[d.raw] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 0.5 }}>
                  {scrapPie.map((d, i) => (
                    <Chip
                      key={d.name}
                      label={`${d.name}: ${d.value}`}
                      size="small"
                      sx={{
                        bgcolor: alpha(SCRAP_STATUS_COLORS[d.raw] || COLORS[i % COLORS.length], 0.15),
                        color: SCRAP_STATUS_COLORS[d.raw] || COLORS[i % COLORS.length],
                        fontWeight: 600, fontSize: 10,
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Section>
        </Grid>

        <Grid item xs={12} lg={8} sx={{width: '38%'}}>
          <Section title="Driver Workload" icon={<People />} delay={0.22}>
            {errors.driverWorkload ? (
              <SectionError keyName="driverWorkload" />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 2 }} />
                    ))
                  : driverWorkload.length === 0
                    ? <Typography color="text.secondary" variant="body2" align="center" sx={{ py: 4 }}>No drivers assigned</Typography>
                    : driverWorkload.map((d) => {
                        const pct = d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0;
                        const barColor = pct > 70 ? "#4caf50" : pct > 40 ? "#ff9800" : isDark ? "#91eff1" : "#024990";
                        const driverStatusColor =
                          d.driver_status === "AVAILABLE"   ? "#4caf50" :
                          d.driver_status === "IN_DELIVERY" ? "#ff9800" : "#888";
                        return (
                          <Box
                            key={d.user_id}
                            sx={{
                              display: "flex", alignItems: "center", gap: 1.5,
                              p: 1.5, borderRadius: 2,
                              bgcolor: isDark ? alpha("#fff",0.03) : alpha("#024990",0.02),
                              border: `1px solid ${isDark ? alpha("#fff",0.06) : alpha("#024990",0.08)}`,
                            }}
                          >
                            <Box
                              sx={{
                                width: 38, height: 38, borderRadius: 2, flexShrink: 0,
                                background: "linear-gradient(135deg, #024990, #0369c7)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontWeight: 700, fontSize: 15,
                              }}
                            >
                              {d.full_name?.[0]?.toUpperCase()}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }} noWrap>
                                  {d.full_name}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
                                  <Chip
                                    label={d.driver_status}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(driverStatusColor, 0.15),
                                      color: driverStatusColor,
                                      fontWeight: 700, fontSize: 9, height: 18,
                                    }}
                                  />
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: barColor }}>
                                    {pct}%
                                  </Typography>
                                </Box>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  height: 5, borderRadius: 3,
                                  bgcolor: isDark ? alpha("#fff",0.08) : alpha("#024990",0.1),
                                  "& .MuiLinearProgress-bar": { backgroundColor: barColor, borderRadius: 3 },
                                }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {d.delivered}/{d.total} delivered · {d.in_transit} in transit · {d.pending} pending
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })
                }
              </Box>
            )}
          </Section>
        </Grid>
      </Grid>

      {/* ── Row 4: Recent Deliveries + Recent Scraps ───────────────── */}
      <Grid container spacing={2.5} sx={{width: '100%'}}>
        <Grid item xs={12} lg={7} sx={{width: '60%'}}>
          <Section title="Recent Delivery Assignments" icon={<LocalShipping />} delay={0.3}>
            {errors.recentDeliveries ? (
              <SectionError keyName="recentDeliveries" />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["ID", "Driver", "Vehicle", "Items", "Damaged", "Status", "Date"].map((h) => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 700, fontSize: 12, color: isDark ? "#91eff1" : "#024990", py: 1.2, whiteSpace: "nowrap" }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}><Skeleton /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : recentDeliveries.length === 0
                        ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography color="text.secondary" variant="body2">No deliveries yet</Typography>
                            </TableCell>
                          </TableRow>
                        )
                        : recentDeliveries.map((r) => {
                            const pct = r.total_items > 0
                              ? Math.round((r.delivered_items / r.total_items) * 100)
                              : 0;
                            return (
                              <TableRow
                                key={r.delivery_id}
                                sx={{ "&:hover": { bgcolor: isDark ? alpha("#024990",0.1) : alpha("#024990",0.03) } }}
                              >
                                <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: 12 }}>
                                  #{r.delivery_id}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{r.driver_name}</TableCell>
                                <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{r.vehicle_number}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, minWidth: 70 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={pct}
                                      sx={{
                                        flex: 1, height: 5, borderRadius: 3,
                                        bgcolor: isDark ? alpha("#fff",0.08) : alpha("#024990",0.1),
                                        "& .MuiLinearProgress-bar": { bgcolor: "#4caf50", borderRadius: 3 },
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {r.delivered_items}/{r.total_items}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {r.damaged_items > 0 ? (
                                    <Chip
                                      label={r.damaged_items}
                                      size="small"
                                      sx={{ bgcolor: alpha("#f44336",0.15), color: "#f44336", fontWeight: 700, fontSize: 10 }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={r.status.replace(/_/g, " ")}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(DELIVERY_STATUS_COLORS[r.status] || "#888", 0.15),
                                      color: DELIVERY_STATUS_COLORS[r.status] || "#888",
                                      fontWeight: 700, fontSize: 10,
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap" }}>
                                  {new Date(r.assigned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                </TableCell>
                              </TableRow>
                            );
                          })
                    }
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Section>
        </Grid>

        <Grid item xs={12} lg={5} sx={{width: '38%'}}>
          <Section title="Recent Scrap Runs" icon={<RecyclingRounded />} delay={0.35}>
            {errors.recentScraps ? (
              <SectionError keyName="recentScraps" />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} variant="rectangular" height={68} sx={{ borderRadius: 2 }} />
                    ))
                  : recentScraps.length === 0
                    ? (
                      <Typography color="text.secondary" variant="body2" align="center" sx={{ py: 4 }}>
                        No scrap runs yet
                      </Typography>
                    )
                    : recentScraps.map((s) => {
                        const sc = SCRAP_STATUS_COLORS[s.status] || "#888";
                        return (
                          <Box
                            key={s.scrap_id}
                            sx={{
                              p: 1.5, borderRadius: 2,
                              bgcolor: isDark ? alpha("#fff",0.03) : alpha("#024990",0.02),
                              border: `1px solid ${isDark ? alpha("#fff",0.06) : alpha("#024990",0.08)}`,
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.6 }}>
                              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                                  #{s.scrap_id}
                                </Typography>
                                <Chip
                                  label={s.source}
                                  size="small"
                                  sx={{ bgcolor: alpha("#0891b2",0.15), color: "#0891b2", fontWeight: 600, fontSize: 9, height: 18 }}
                                />
                              </Box>
                              <Chip
                                label={s.status}
                                size="small"
                                sx={{ bgcolor: alpha(sc,0.15), color: sc, fontWeight: 700, fontSize: 10 }}
                              />
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  {s.scrap_type || "—"} · Driver: {s.driver_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Vehicle: {s.vehicle_number} · {s.total_items} items
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                                {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })
                }
              </Box>
            )}
          </Section>
        </Grid>
      </Grid>
    </Box>
  );
}