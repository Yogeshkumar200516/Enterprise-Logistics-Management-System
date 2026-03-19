// src/pages/Supervisor/AddTempVehicles.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Paper, Tooltip, Skeleton, Alert, Fade,
  Select, MenuItem, FormControl, InputLabel, useTheme, alpha,
} from "@mui/material";
import {
  Add, Search, Close, Edit, Delete, Refresh,
  DirectionsCar, CheckCircle, Build, LocalShipping, Speed,
} from "@mui/icons-material";
import api from "../../../context/Api";
import AddTempVehicleModal from "./AddTempVehiclesModal";

// ─── Reusable summary card (same pattern as users tab) ────────────
const SummaryCard = ({ label, value, Icon, color, sub, loading }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{
        flex: "1 1 130px",
        p: 2.5,
        borderRadius: 3,
        bgcolor: isDark ? alpha(color, 0.1) : alpha(color, 0.07),
        border: `1px solid ${alpha(color, isDark ? 0.2 : 0.15)}`,
        transition: "transform .2s, box-shadow .2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 22px ${alpha(color, 0.18)}` },
      }}
    >
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.07em",
            fontSize: "0.6rem", color: "text.secondary",
          }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={44} height={34} />
          ) : (
            <Typography variant="h4" fontWeight={800}
              sx={{ color, lineHeight: 1.2, mt: 0.3, fontFamily: "'DM Sans', sans-serif" }}>
              {value ?? 0}
            </Typography>
          )}
          {sub && (
            <Typography variant="caption" color="text.disabled"
              sx={{ fontSize: "0.65rem", fontFamily: "'DM Sans', sans-serif" }}>
              {sub}
            </Typography>
          )}
        </Box>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          bgcolor: alpha(color, isDark ? 0.18 : 0.12),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon sx={{ color, fontSize: 19 }} />
        </Box>
      </Box>
    </Box>
  );
};

// ─── Vehicle status badge ─────────────────────────────────────────
const VehicleBadge = ({ status }) => {
  const theme = useTheme();
  const map = {
    AVAILABLE:   { color: theme.palette.success.main, label: "Available",   Icon: CheckCircle    },
    IN_USE:      { color: theme.palette.info.main,    label: "In Use",      Icon: LocalShipping  },
    MAINTENANCE: { color: theme.palette.error.main,   label: "Maintenance", Icon: Build          },
  };
  const cfg = map[status] || { color: theme.palette.text.disabled, label: status, Icon: null };
  const Ico = cfg.Icon;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.55,
      px: 1.1, py: 0.3, borderRadius: "6px", whiteSpace: "nowrap",
      bgcolor: alpha(cfg.color, 0.1), border: `1px solid ${alpha(cfg.color, 0.24)}`,
      color: cfg.color, fontSize: "0.68rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    }}>
      {Ico && <Ico sx={{ fontSize: 11 }} />}
      {cfg.label}
    </Box>
  );
};

// ─── Main component ───────────────────────────────────────────────
const AddTemporaryVehicles = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.info.main;

  const [vehicles,     setVehicles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editData,     setEditData]     = useState(null);

  const fetchVehicles = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/supervisor/temporary-vehicles");
      setVehicles(res.data.data || []);
    } catch {
      setError("Failed to load vehicles. Please refresh.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete vehicle "${num}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/supervisor/temporary-vehicles/${id}`);
      flash("Vehicle deleted successfully.");
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed.");
    }
  };

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4000); };

  const openEdit = (v) => { setEditData(v); setModalOpen(true); };
  const openAdd  = ()  => { setEditData(null); setModalOpen(true); };

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       vehicles.length,
    available:   vehicles.filter(v => v.status === "AVAILABLE").length,
    inUse:       vehicles.filter(v => v.status === "IN_USE").length,
    maintenance: vehicles.filter(v => v.status === "MAINTENANCE").length,
  }), [vehicles]);

  // ── Filtered rows ──────────────────────────────────────────────
  const rows = useMemo(() => vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      [v.vehicle_number, v.vehicle_type, String(v.capacity || "")]
        .some(f => f.toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "ALL" || v.status === statusFilter);
  }), [vehicles, search, statusFilter]);

  const surfaceBg = isDark ? alpha(theme.palette.background.paper, 0.7) : theme.palette.background.paper;
  const headerSx  = {
    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.63rem",
    textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary",
    borderBottom: `2px solid ${theme.palette.divider}`, whiteSpace: "nowrap",
    bgcolor: isDark ? alpha(theme.palette.background.default, 0.6) : alpha(accent, 0.04),
    py: 1.5,
  };

  return (
    <>
      {/* ── Summary cards ── */}
      <Box display="flex" gap={2} mb={3.5} flexWrap="wrap">
        <SummaryCard label="Total Fleet"  value={stats.total}       Icon={DirectionsCar} color={accent}                      loading={loading} />
        <SummaryCard label="Available"    value={stats.available}   Icon={CheckCircle}   color={theme.palette.success.main}  loading={loading} sub="ready to assign" />
        <SummaryCard label="In Use"       value={stats.inUse}       Icon={LocalShipping} color={theme.palette.warning.main}  loading={loading} sub="currently deployed" />
        <SummaryCard label="Maintenance"  value={stats.maintenance} Icon={Build}         color={theme.palette.error.main}    loading={loading} />
      </Box>

      {/* ── Alerts ── */}
      {successMsg && (
        <Fade in>
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg("")}>
            {successMsg}
          </Alert>
        </Fade>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ── Table card ── */}
      <Paper
        elevation={isDark ? 0 : 1}
        sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden", bgcolor: surfaceBg }}
      >
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search vehicle number, type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 17, color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}>
                    <Close sx={{ fontSize: 15 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontFamily: "'DM Sans', sans-serif" }}>Fleet Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Fleet Status"
              sx={{ borderRadius: 2, fontFamily: "'DM Sans', sans-serif" }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="IN_USE">In Use</MenuItem>
              <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchVehicles}
              disabled={loading}
              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
            >
              <Refresh sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openAdd}
            sx={{
              bgcolor: accent,
              "&:hover": { bgcolor: alpha(accent, 0.86) },
              borderRadius: 2,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: `0 4px 12px ${alpha(accent, 0.32)}`,
            }}
          >
            Add Vehicle
          </Button>

          <Typography variant="caption" color="text.secondary"
            sx={{ ml: "auto", fontFamily: "'DM Sans', sans-serif" }}>
            {rows.length} / {vehicles.length}
          </Typography>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {["Vehicle", "Type", "Capacity", "Status", "Added", "Actions"].map((h) => (
                  <TableCell key={h} sx={headerSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                      <DirectionsCar sx={{ fontSize: 44, color: "text.disabled" }} />
                      <Typography variant="body2" color="text.secondary"
                        sx={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {vehicles.length === 0
                          ? "No temporary vehicles yet — add one to get started"
                          : "No results match your search"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((v) => (
                  <TableRow
                    key={v.vehicle_id}
                    hover
                    sx={{ "&:hover": { bgcolor: alpha(accent, 0.03) }, transition: "background .15s" }}
                  >
                    {/* Vehicle number */}
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                          sx={{
                            width: 36, height: 36, borderRadius: 2,
                            bgcolor: alpha(accent, 0.1),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <DirectionsCar sx={{ fontSize: 18, color: accent }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={800}
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.85rem", letterSpacing: "0.03em",
                            }}>
                            {v.vehicle_number}
                          </Typography>
                          <Typography variant="caption" color="text.disabled"
                            sx={{ fontSize: "0.64rem", fontFamily: "'DM Sans', sans-serif" }}>
                            ID #{v.vehicle_id} · Temporary
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1.1, py: 0.3, borderRadius: 1.5,
                          bgcolor: alpha(theme.palette.text.primary, 0.05),
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="caption" fontWeight={700}
                          sx={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "text.secondary" }}>
                          {v.vehicle_type || "—"}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Capacity */}
                    <TableCell>
                      {v.capacity ? (
                        <Box display="flex" alignItems="center" gap={0.6}>
                          <Speed sx={{ fontSize: 13, color: "text.disabled" }} />
                          <Typography variant="body2" fontWeight={700}
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
                            {v.capacity}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>—</Typography>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell><VehicleBadge status={v.status} /></TableCell>

                    {/* Added date */}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary"
                        sx={{ fontSize: "0.72rem", fontFamily: "'DM Sans', sans-serif" }}>
                        {new Date(v.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Edit vehicle">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(v)}
                            sx={{
                              width: 28, height: 28,
                              border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5,
                              color: "text.secondary",
                              "&:hover": { borderColor: accent, color: accent, bgcolor: alpha(accent, 0.08) },
                              transition: "all .18s",
                            }}
                          >
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete vehicle">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(v.vehicle_id, v.vehicle_number)}
                            sx={{
                              width: 28, height: 28,
                              border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5,
                              color: "text.secondary",
                              "&:hover": { borderColor: theme.palette.error.main, color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08) },
                              transition: "all .18s",
                            }}
                          >
                            <Delete sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <AddTempVehicleModal
        open={modalOpen}
        handleClose={() => setModalOpen(false)}
        editData={editData}
        refresh={fetchVehicles}
        onSuccess={(msg) => { flash(msg); fetchVehicles(); }}
      />
    </>
  );
};

export default AddTemporaryVehicles;