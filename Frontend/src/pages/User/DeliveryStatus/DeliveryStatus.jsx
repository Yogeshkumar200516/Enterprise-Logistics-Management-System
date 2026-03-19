// src/pages/Driver/DeliveryStatus.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Button, Chip, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, CircularProgress, Alert, Select,
  MenuItem, FormControl, InputLabel, Menu, Badge, Stack, Avatar,
  Fade, Skeleton, useTheme, alpha, LinearProgress,
} from "@mui/material";
import {
  Search, FilterList, Refresh, LocalShipping, CheckCircle,
  Assignment, Route, SplitscreenOutlined, Schedule, Close,
  OpenInNew, DirectionsCar, CalendarToday, Inventory2,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import api from "../../../context/Api";
import { useAuth } from "../../../context/AuthContext";
import DriverDeliveryDetailsModal from "./DeliveryDetailsModal";

// ─── Status meta ─────────────────────────────────────────────────
const STATUS_META = {
  ASSIGNED:            { label: "Assigned",    colorKey: "info",      icon: <Assignment sx={{ fontSize: 13 }} /> },
  IN_TRANSIT:          { label: "In Transit",  colorKey: "warning",   icon: <Route sx={{ fontSize: 13 }} /> },
  DELIVERED:           { label: "Delivered",   colorKey: "success",   icon: <CheckCircle sx={{ fontSize: 13 }} /> },
  PARTIALLY_DELIVERED: { label: "Partial",     colorKey: "secondary", icon: <SplitscreenOutlined sx={{ fontSize: 13 }} /> },
};

// ─── Stat Card ────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, colorKey, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const color  = theme.palette[colorKey]?.main || theme.palette.primary.main;
  return (
    <Box sx={{
      flex: 1, minWidth: 130, borderRadius: 3, p: 2.5,
      background: alpha(color, isDark ? 0.1 : 0.07),
      border: `1px solid ${alpha(color, isDark ? 0.25 : 0.18)}`,
      transition: "transform .2s, box-shadow .2s",
      "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 24px ${alpha(color, 0.2)}` },
    }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", fontSize: "0.61rem" }}>
            {label}
          </Typography>
          {loading
            ? <Skeleton variant="text" width={50} height={36} />
            : <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.15, mt: 0.5, fontFamily: "'Sora',sans-serif" }}>{value ?? 0}</Typography>
          }
        </Box>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, background: alpha(color, isDark ? 0.18 : 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {React.cloneElement(icon, { sx: { color, fontSize: 20 } })}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const theme = useTheme();
  const meta  = STATUS_META[status];
  if (!meta) return <Typography variant="caption">{status}</Typography>;
  const color = theme.palette[meta.colorKey]?.main || theme.palette.text.secondary;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, px: 1.2, py: 0.35, borderRadius: "7px", background: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.25)}`, color, fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {meta.icon} {meta.label}
    </Box>
  );
};

// ─── Item Progress ────────────────────────────────────────────────
const ItemProgress = ({ delivered, damaged, total }) => {
  const theme  = useTheme();
  const done   = (delivered || 0) + (damaged || 0);
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
  const dPct   = total > 0 ? Math.round(((delivered || 0) / total) * 100) : 0;
  const dmgPct = total > 0 ? Math.round(((damaged   || 0) / total) * 100) : 0;
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
          {delivered}/{total}
          {damaged > 0 && <span style={{ color: theme.palette.error.main }}> · {damaged} dmg</span>}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{pct}%</Typography>
      </Box>
      <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: "hidden", display: "flex" }}>
        <Box sx={{ width: `${dPct}%`,   height: "100%", bgcolor: "success.main", transition: "width .5s ease" }} />
        <Box sx={{ width: `${dmgPct}%`, height: "100%", bgcolor: "error.main",   transition: "width .5s ease" }} />
      </Box>
    </Box>
  );
};

// ─── Main ─────────────────────────────────────────────────────────
const DeliveryStatus = () => {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === "dark";
  const { user } = useAuth();

  const [assignments,    setAssignments]    = useState([]);
  const [stats,          setStats]          = useState({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [successMsg,     setSuccessMsg]     = useState("");
  const [selectedId,     setSelectedId]     = useState(null);

  // Filters
  const [searchQuery,    setSearchQuery]    = useState("");
  const [filterAnchor,   setFilterAnchor]   = useState(null);
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterVehicle,  setFilterVehicle]  = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo,   setFilterDateTo]   = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [aRes, sRes] = await Promise.all([
        api.get("/api/driver-delivery/my-assignments"),
        api.get("/api/driver-delivery/my-stats"),
      ]);
      setAssignments(aRes.data.assignments || []);
      setStats(sRes.data.stats || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load delivery data");
    } finally { setLoading(false); }
  };

  const clearFilters = () => {
    setFilterStatus(""); setFilterVehicle(""); setFilterDateFrom(null); setFilterDateTo(null); setFilterAnchor(null);
  };
  const activeCnt = [filterStatus, filterVehicle, filterDateFrom, filterDateTo].filter(Boolean).length;

  // Unique vehicles from data (for filter dropdown)
  const uniqueVehicles = useMemo(() => {
    const seen = new Map();
    assignments.forEach(a => { if (!seen.has(a.vehicle_id)) seen.set(a.vehicle_id, { id: a.vehicle_id, number: a.vehicle_number, type: a.vehicle_type }); });
    return Array.from(seen.values());
  }, [assignments]);

  const rows = useMemo(() => {
    return assignments.filter(a => {
      const q  = searchQuery.toLowerCase();
      const ms = !q || [a.vehicle_number, String(a.delivery_id), a.supervisor_name].some(v => v?.toLowerCase().includes(q));
      const mv = !filterVehicle || String(a.vehicle_id) === String(filterVehicle);
      const mst= !filterStatus  || a.status === filterStatus;
      const assignedDate = dayjs(a.assigned_at);
      const mdf = !filterDateFrom || assignedDate.isAfter(dayjs(filterDateFrom).subtract(1, "day"));
      const mdt = !filterDateTo   || assignedDate.isBefore(dayjs(filterDateTo).add(1, "day"));
      return ms && mv && mst && mdf && mdt;
    });
  }, [assignments, searchQuery, filterVehicle, filterStatus, filterDateFrom, filterDateTo]);

  const fmt      = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const selectSx  = { "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" } };
  const surfaceBg = isDark ? alpha(theme.palette.background.paper, 0.75) : theme.palette.background.paper;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');`}</style>

        {/* ── Header ── */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 46, height: 46, borderRadius: 2.5, background: `linear-gradient(135deg,${theme.palette.primary.main},${theme.palette.secondary.main})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}` }}>
              <LocalShipping sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", color: "text.primary", letterSpacing: "-0.02em" }}>
                My Deliveries
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.full_name ? `Assigned to ${user.full_name}` : "Your assigned delivery runs"}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {loading ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Alerts ── */}
        {successMsg && <Fade in><Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg("")}>{successMsg}</Alert></Fade>}
        {error      && <Alert severity="error"   sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {/* ── Stats ── */}
        <Box display="flex" gap={2} mb={4} flexWrap="wrap">
          <StatCard label="Total"      value={stats.total}               icon={<Assignment />}          colorKey="primary"   loading={loading} />
          <StatCard label="Assigned"   value={stats.assigned}            icon={<Schedule />}            colorKey="info"      loading={loading} />
          <StatCard label="In Transit" value={stats.in_transit}          icon={<Route />}               colorKey="warning"   loading={loading} />
          <StatCard label="Delivered"  value={stats.delivered}           icon={<CheckCircle />}         colorKey="success"   loading={loading} />
          <StatCard label="Partial"    value={stats.partially_delivered} icon={<SplitscreenOutlined />} colorKey="secondary" loading={loading} />
        </Box>

        {/* ── Table Card ── */}
        <Paper elevation={isDark ? 0 : 1} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden", background: surfaceBg }}>
          {/* Toolbar */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <TextField
              size="small" placeholder="Search by vehicle, delivery ID, supervisor…"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
                endAdornment: searchQuery ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery("")}><Close fontSize="small" /></IconButton></InputAdornment> : null,
                sx: { borderRadius: 2 },
              }}
            />
            <Badge badgeContent={activeCnt} color="error">
              <Button variant="outlined" startIcon={<FilterList />} onClick={(e) => setFilterAnchor(e.currentTarget)}
                color={activeCnt ? "primary" : "inherit"} sx={{ borderRadius: 2, whiteSpace: "nowrap" }}>
                Filters
              </Button>
            </Badge>
            {activeCnt > 0 && <Button size="small" color="error" onClick={clearFilters}>Clear All</Button>}
            <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>{rows.length} / {assignments.length}</Typography>
          </Box>

          {/* Active filter chips */}
          {activeCnt > 0 && (
            <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap", borderBottom: `1px solid ${theme.palette.divider}` }}>
              {filterStatus  && <Chip size="small" label={`Status: ${STATUS_META[filterStatus]?.label || filterStatus}`} onDelete={() => setFilterStatus("")} color="primary" variant="outlined" />}
              {filterVehicle && <Chip size="small" label={`Vehicle: ${uniqueVehicles.find(v => String(v.id) === String(filterVehicle))?.number || filterVehicle}`} onDelete={() => setFilterVehicle("")} color="primary" variant="outlined" />}
              {filterDateFrom && <Chip size="small" label={`From: ${dayjs(filterDateFrom).format("DD MMM YYYY")}`} onDelete={() => setFilterDateFrom(null)} color="primary" variant="outlined" />}
              {filterDateTo   && <Chip size="small" label={`To: ${dayjs(filterDateTo).format("DD MMM YYYY")}`}     onDelete={() => setFilterDateTo(null)}   color="primary" variant="outlined" />}
            </Box>
          )}

          {/* Filter Menu */}
          <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}
            PaperProps={{ sx: { borderRadius: 3, minWidth: 300, p: 2, border: `1px solid ${theme.palette.divider}` } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Filter Deliveries</Typography>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status" sx={selectSx}>
                  <MenuItem value="">All Statuses</MenuItem>
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <MenuItem key={k} value={k}><Box display="flex" alignItems="center" gap={1}>{v.icon} {v.label}</Box></MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Vehicle</InputLabel>
                <Select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} label="Vehicle" sx={selectSx}>
                  <MenuItem value="">All Vehicles</MenuItem>
                  {uniqueVehicles.map(v => <MenuItem key={v.id} value={v.id}>{v.number} ({v.type})</MenuItem>)}
                </Select>
              </FormControl>
              <DatePicker
                label="Assigned From"
                value={filterDateFrom}
                onChange={setFilterDateFrom}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <DatePicker
                label="Assigned To"
                value={filterDateTo}
                onChange={setFilterDateTo}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <Button variant="contained" onClick={() => setFilterAnchor(null)} sx={{ borderRadius: 2 }}>Apply</Button>
            </Stack>
          </Menu>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {["#", "Status", "Vehicle", "Supervisor", "Orders", "Progress", "Assigned At", "Open"].map(h => (
                    <TableCell key={h} sx={{
                      bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.primary.main, 0.04),
                      color: "text.secondary", fontWeight: 700, fontSize: "0.67rem",
                      letterSpacing: "0.07em", textTransform: "uppercase",
                      borderBottom: `2px solid ${theme.palette.divider}`, whiteSpace: "nowrap",
                    }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                    ))
                  : rows.length === 0
                    ? <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                            <Inventory2 sx={{ fontSize: 44, color: "text.disabled" }} />
                            <Typography color="text.secondary">
                              {assignments.length === 0 ? "No deliveries assigned to you yet" : "No results match your filters"}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    : rows.map(a => {
                        const actionNeeded = a.status === "ASSIGNED" || (a.status === "IN_TRANSIT" && (a.pending_items ?? 0) > 0);
                        return (
                          <TableRow key={a.delivery_id} hover
                            sx={{
                              cursor: "pointer",
                              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                              transition: "background .15s",
                              // Highlight rows needing action
                              ...(actionNeeded && {
                                borderLeft: `3px solid ${theme.palette.warning.main}`,
                              }),
                            }}
                            onClick={() => setSelectedId(a.delivery_id)}
                          >
                            {/* ID */}
                            <TableCell>
                              <Typography variant="body2" fontWeight={700} color="text.disabled" sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.75rem" }}>
                                #{a.delivery_id}
                              </Typography>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Box display="flex" flexDirection="column" gap={0.5}>
                                <StatusBadge status={a.status} />
                                {actionNeeded && (
                                  <Typography variant="caption" sx={{ color: "warning.main", fontSize: "0.62rem", fontWeight: 700 }}>
                                    Action needed
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>

                            {/* Vehicle */}
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <DirectionsCar sx={{ fontSize: 14, color: "info.main" }} />
                                </Box>
                                <Box>
                                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>{a.vehicle_number}</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>{a.vehicle_type}</Typography>
                                </Box>
                              </Box>
                            </TableCell>

                            {/* Supervisor */}
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>{a.supervisor_name}</Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>{a.supervisor_phone}</Typography>
                            </TableCell>

                            {/* Orders */}
                            <TableCell>
                              <Chip label={`${a.total_orders} orders`} size="small" color="secondary" variant="outlined"
                                sx={{ fontWeight: 700, fontSize: "0.68rem", height: 22 }} />
                            </TableCell>

                            {/* Progress */}
                            <TableCell sx={{ minWidth: 140 }}>
                              <ItemProgress
                                delivered={parseInt(a.delivered_items) || 0}
                                damaged={parseInt(a.damaged_items) || 0}
                                total={parseInt(a.total_items) || 0}
                              />
                            </TableCell>

                            {/* Date */}
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <CalendarToday sx={{ fontSize: 12, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>{fmt(a.assigned_at)}</Typography>
                              </Box>
                            </TableCell>

                            {/* Open */}
                            <TableCell>
                              <Tooltip title="Open Delivery Details">
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); setSelectedId(a.delivery_id); }}
                                  sx={{
                                    border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5,
                                    color: "text.secondary", width: 30, height: 30,
                                    "&:hover": { borderColor: theme.palette.primary.main, color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.07) },
                                    transition: "all .18s",
                                    // Pulse for action needed
                                    ...(actionNeeded && {
                                      borderColor: theme.palette.warning.main,
                                      color: theme.palette.warning.main,
                                      animation: "pulse 2s infinite",
                                    }),
                                  }}
                                >
                                  <OpenInNew sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Details Modal */}
        <DriverDeliveryDetailsModal
          open={Boolean(selectedId)}
          deliveryId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={fetchData}
        />

        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 ${alpha(theme.palette.warning.main, 0.4)}; }
            50% { box-shadow: 0 0 0 5px ${alpha(theme.palette.warning.main, 0)}; }
          }
        `}</style>
      </Box>
    </LocalizationProvider>
  );
};

export default DeliveryStatus;