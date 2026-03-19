// src/pages/Supervisor/DeliveryLogger.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Button, Chip, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, CircularProgress, Alert, Select,
  MenuItem, FormControl, InputLabel, Menu, Badge, Stack, Avatar,
  Fade, Skeleton, useTheme, alpha,
} from "@mui/material";
import {
  Add, Search, FilterList, Refresh, LocalShipping, CheckCircle,
  Assignment, DirectionsCar, Route, SplitscreenOutlined, Schedule,
  Close, OpenInNew,
} from "@mui/icons-material";
import api from "../../../context/Api";
import DeliveryLoggerModal from "./DeliveryLoggerModal";
import DeliveryDetailsModal from "./DeliveryDetailsModal";

// ─── Status metadata ────────────────────────────────────────────
const STATUS_META = {
  ASSIGNED:            { label: "Assigned",    colorKey: "info",      icon: <Assignment sx={{ fontSize: 13 }} /> },
  IN_TRANSIT:          { label: "In Transit",  colorKey: "warning",   icon: <Route sx={{ fontSize: 13 }} /> },
  DELIVERED:           { label: "Delivered",   colorKey: "success",   icon: <CheckCircle sx={{ fontSize: 13 }} /> },
  PARTIALLY_DELIVERED: { label: "Partial",     colorKey: "secondary", icon: <SplitscreenOutlined sx={{ fontSize: 13 }} /> },
};

// ─── Stat Card ──────────────────────────────────────────────────
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

// ─── Status Badge ───────────────────────────────────────────────
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

// ─── Item Progress ──────────────────────────────────────────────
const ItemProgress = ({ delivered, total }) => {
  const theme = useTheme();
  const pct   = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const color = pct === 100 ? theme.palette.success.main : pct > 50 ? theme.palette.warning.main : theme.palette.info.main;
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{delivered}/{total}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{pct}%</Typography>
      </Box>
      <Box sx={{ height: 5, borderRadius: 3, background: alpha(theme.palette.text.primary, 0.08), overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width .5s ease" }} />
      </Box>
    </Box>
  );
};

// ─── Main ───────────────────────────────────────────────────────
const DeliveryLogger = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [assignments,   setAssignments]   = useState([]);
  const [stats,         setStats]         = useState({});
  const [allVehicles,   setAllVehicles]   = useState([]);
  const [allDrivers,    setAllDrivers]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");

  // Modals
  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [detailsDeliveryId, setDetailsDeliveryId] = useState(null);

  // Filters
  const [searchQuery,   setSearchQuery]   = useState("");
  const [filterAnchor,  setFilterAnchor]  = useState(null);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver,  setFilterDriver]  = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [aRes, sRes, vRes, dRes] = await Promise.all([
        api.get("/api/delivery-logger/assignments"),
        api.get("/api/delivery-logger/assignment-stats"),
        api.get("/api/delivery-logger/all-vehicles"),
        api.get("/api/delivery-logger/all-drivers"),
      ]);
      setAssignments(aRes.data.assignments || []);
      setStats(sRes.data.stats || {});
      setAllVehicles(vRes.data.vehicles || []);
      setAllDrivers(dRes.data.drivers || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load delivery data");
    } finally { setLoading(false); }
  };

  const handleCreateSuccess = () => {
    setSuccessMsg("Assignment created successfully!");
    fetchData();
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const clearFilters  = () => { setFilterVehicle(""); setFilterDriver(""); setFilterStatus(""); setFilterAnchor(null); };
  const activeCnt     = [filterVehicle, filterDriver, filterStatus].filter(Boolean).length;

  const rows = useMemo(() => {
    return assignments.filter((a) => {
      const q  = searchQuery.toLowerCase();
      const ms = !q || [a.vehicle_number, a.driver_name, a.supervisor_name, String(a.delivery_id)].some(v => v?.toLowerCase().includes(q));
      const mv = !filterVehicle || String(a.vehicle_id)  === String(filterVehicle);
      const md = !filterDriver  || String(a.driver_id)   === String(filterDriver);
      const mst= !filterStatus  || a.status === filterStatus;
      return ms && mv && md && mst;
    });
  }, [assignments, searchQuery, filterVehicle, filterDriver, filterStatus]);

  const fmt      = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const initials = (n)  => n?.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "?";

  const selectSx  = { "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" } };
  const surfaceBg = isDark ? alpha(theme.palette.background.paper, 0.75) : theme.palette.background.paper;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');`}</style>

      {/* ── Header ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 46, height: 46, borderRadius: 2.5, background: `linear-gradient(135deg,${theme.palette.primary.main},${theme.palette.secondary.main})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}` }}>
            <LocalShipping sx={{ color: "#fff", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", color: "text.primary", letterSpacing: "-0.02em" }}>Delivery Logger</Typography>
            <Typography variant="caption" color="text.secondary">Track and manage all delivery assignments</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1.5}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {loading ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
            </IconButton>
          </Tooltip>
          <Button
            variant="contained" startIcon={<Add />} onClick={() => setShowCreateModal(true)}
            sx={{
              background: `linear-gradient(135deg,${theme.palette.primary.main},${theme.palette.secondary.main})`,
              borderRadius: 2, fontWeight: 700, px: 2.5, color: "#fff",
              fontFamily: "'Sora',sans-serif",
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              "&:hover": { boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`, transform: "translateY(-1px)" },
              transition: "all .2s",
            }}
          >
            Create Logger
          </Button>
        </Box>
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
            size="small" placeholder="Search vehicle, driver, ID…" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} sx={{ flex: 1, minWidth: 200 }}
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
            {filterStatus  && <Chip size="small" label={`Status: ${STATUS_META[filterStatus]?.label || filterStatus}`} onDelete={() => setFilterStatus("")}   color="primary" variant="outlined" />}
            {filterVehicle && <Chip size="small" label={`Vehicle: ${allVehicles.find(v => String(v.vehicle_id) === String(filterVehicle))?.vehicle_number || filterVehicle}`} onDelete={() => setFilterVehicle("")} color="primary" variant="outlined" />}
            {filterDriver  && <Chip size="small" label={`Driver: ${allDrivers.find(d => String(d.user_id) === String(filterDriver))?.full_name || filterDriver}`} onDelete={() => setFilterDriver("")} color="primary" variant="outlined" />}
          </Box>
        )}

        {/* Filter Menu */}
        <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}
          PaperProps={{ sx: { borderRadius: 3, minWidth: 280, p: 2, border: `1px solid ${theme.palette.divider}` } }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Filter Assignments</Typography>
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
                {allVehicles.map(v => <MenuItem key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_number} ({v.vehicle_type})</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Driver</InputLabel>
              <Select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} label="Driver" sx={selectSx}>
                <MenuItem value="">All Drivers</MenuItem>
                {allDrivers.map(d => <MenuItem key={d.user_id} value={d.user_id}>{d.full_name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={() => setFilterAnchor(null)} sx={{ borderRadius: 2 }}>Apply</Button>
          </Stack>
        </Menu>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {["#", "Status", "Vehicle", "Driver", "Supervisor", "Orders", "Progress", "Assigned At", "Details"].map(h => (
                  <TableCell key={h} sx={{
                    bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.primary.main, 0.04),
                    color: "text.secondary", fontWeight: 700, fontSize: "0.67rem",
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    borderBottom: `2px solid ${theme.palette.divider}`, whiteSpace: "nowrap",
                  }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                  ))
                : rows.length === 0
                  ? <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                          <LocalShipping sx={{ fontSize: 44, color: "text.disabled" }} />
                          <Typography color="text.secondary">{assignments.length === 0 ? "No assignments yet" : "No results match your filters"}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  : rows.map(a => (
                      <TableRow key={a.delivery_id} hover
                        sx={{ "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04) }, transition: "background .15s" }}>

                        {/* ID */}
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="text.disabled" sx={{ fontSize: "0.75rem", fontFamily: "'Sora',sans-serif" }}>
                            #{a.delivery_id}
                          </Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell><StatusBadge status={a.status} /></TableCell>

                        {/* Vehicle */}
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.2}>
                            <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <DirectionsCar sx={{ fontSize: 15, color: "info.main" }} />
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>{a.vehicle_number}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>{a.vehicle_type}</Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Driver */}
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.2}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: "0.65rem", fontWeight: 800, bgcolor: alpha(theme.palette.success.main, 0.15), color: "success.main" }}>
                              {initials(a.driver_name)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>{a.driver_name}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>{a.driver_phone}</Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Supervisor */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>{a.supervisor_name}</Typography>
                        </TableCell>

                        {/* Orders */}
                        <TableCell>
                          <Chip label={`${a.total_orders} orders`} size="small" color="secondary" variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.68rem", height: 22 }} />
                        </TableCell>

                        {/* Progress */}
                        <TableCell sx={{ minWidth: 130 }}>
                          <ItemProgress delivered={parseInt(a.delivered_items) || 0} total={parseInt(a.total_items) || 0} />
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>{fmt(a.assigned_at)}</Typography>
                        </TableCell>

                        {/* Details / Edit button */}
                        <TableCell>
                          <Tooltip title="View Details & Update Status">
                            <IconButton
                              size="small"
                              onClick={() => setDetailsDeliveryId(a.delivery_id)}
                              sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 1.5,
                                color: "text.secondary",
                                width: 30, height: 30,
                                "&:hover": {
                                  borderColor: theme.palette.primary.main,
                                  color: theme.palette.primary.main,
                                  bgcolor: alpha(theme.palette.primary.main, 0.07),
                                },
                                transition: "all .18s",
                              }}
                            >
                              <OpenInNew sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Modal */}
      <DeliveryLoggerModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Details Modal */}
      <DeliveryDetailsModal
        open={Boolean(detailsDeliveryId)}
        deliveryId={detailsDeliveryId}
        onClose={() => setDetailsDeliveryId(null)}
        onStatusUpdated={fetchData}
      />
    </Box>
  );
};

export default DeliveryLogger;
