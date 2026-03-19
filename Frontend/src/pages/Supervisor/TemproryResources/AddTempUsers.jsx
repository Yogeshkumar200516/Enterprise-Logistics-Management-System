// src/pages/Supervisor/AddTempUsers.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Paper, Avatar, Chip, Tooltip, Skeleton, Alert, Fade,
  Select, MenuItem, FormControl, InputLabel, useTheme, alpha,
} from "@mui/material";
import {
  Add, Search, Close, Edit, Delete, Refresh,
  Groups, CheckCircle, Block, LocalShipping, DirectionsCar,
  Person,
} from "@mui/icons-material";
import api from "../../../context/Api";
import AddTempUserModal from "./AddTempUserModal";

// ─── Reusable summary card ────────────────────────────────────────
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
          <Typography
            variant="caption"
            sx={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontSize: "0.6rem",
              color: "text.secondary",
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={44} height={34} />
          ) : (
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ color, lineHeight: 1.2, mt: 0.3, fontFamily: "'DM Sans', sans-serif" }}
            >
              {value ?? 0}
            </Typography>
          )}
          {sub && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", fontFamily: "'DM Sans', sans-serif" }}>
              {sub}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 2,
            bgcolor: alpha(color, isDark ? 0.18 : 0.12),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon sx={{ color, fontSize: 19 }} />
        </Box>
      </Box>
    </Box>
  );
};

// ─── Account status badge ─────────────────────────────────────────
const AccountBadge = ({ status }) => {
  const theme = useTheme();
  const map = {
    ACTIVE:    { color: theme.palette.success.main, dot: true, label: "Active"    },
    INACTIVE:  { color: theme.palette.text.disabled, dot: true, label: "Inactive" },
    SUSPENDED: { color: theme.palette.error.main,   dot: true, label: "Suspended" },
  };
  const cfg = map[status] || { color: theme.palette.text.disabled, dot: false, label: status };
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.55,
      px: 1.1, py: 0.3, borderRadius: "6px", whiteSpace: "nowrap",
      bgcolor: alpha(cfg.color, 0.1), border: `1px solid ${alpha(cfg.color, 0.24)}`,
      color: cfg.color, fontSize: "0.68rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </Box>
  );
};

// ─── Driver duty badge ────────────────────────────────────────────
const DutyBadge = ({ status }) => {
  const theme = useTheme();
  const map = {
    AVAILABLE:   { color: theme.palette.success.main, label: "Available"   },
    IN_DELIVERY: { color: theme.palette.info.main,    label: "On Delivery" },
    OFF_DUTY:    { color: theme.palette.text.disabled, label: "Off Duty"   },
  };
  const cfg = map[status] || { color: theme.palette.text.disabled, label: status || "—" };
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.55,
      px: 1.1, py: 0.3, borderRadius: "6px", whiteSpace: "nowrap",
      bgcolor: alpha(cfg.color, 0.09), border: `1px solid ${alpha(cfg.color, 0.2)}`,
      color: cfg.color, fontSize: "0.65rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </Box>
  );
};

// ─── Main component ───────────────────────────────────────────────
const AddTemporaryUsers = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.warning.main;

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editData,     setEditData]     = useState(null);

  const fetchUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/supervisor/temporary-users");
      setUsers(res.data.data || []);
    } catch {
      setError("Failed to load drivers. Please refresh.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete external driver "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/supervisor/temporary-users/${id}`);
      flash("Driver deleted successfully.");
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed.");
    }
  };

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const openEdit = (u) => { setEditData(u); setModalOpen(true); };
  const openAdd  = ()  => { setEditData(null); setModalOpen(true); };

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      users.length,
    active:     users.filter(u => u.status === "ACTIVE").length,
    onDelivery: users.filter(u => u.driver_status === "IN_DELIVERY").length,
    suspended:  users.filter(u => u.status === "SUSPENDED").length,
  }), [users]);

  // ── Filtered rows ──────────────────────────────────────────────
  const rows = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = !q || [u.username, u.full_name, u.phone_number, u.vehicle_type, u.license_number]
      .some(f => (f || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "ALL" || u.status === statusFilter);
  }), [users, search, statusFilter]);

  const initials   = (n) => n?.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "?";
  const surfaceBg  = isDark ? alpha(theme.palette.background.paper, 0.7) : theme.palette.background.paper;
  const headerSx   = {
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
        <SummaryCard label="Total Drivers"  value={stats.total}      Icon={Groups}        color={accent}                      loading={loading} />
        <SummaryCard label="Active"         value={stats.active}     Icon={CheckCircle}   color={theme.palette.success.main}  loading={loading} sub="account status" />
        <SummaryCard label="On Delivery"    value={stats.onDelivery} Icon={LocalShipping} color={theme.palette.info.main}     loading={loading} sub="currently active" />
        <SummaryCard label="Suspended"      value={stats.suspended}  Icon={Block}         color={theme.palette.error.main}    loading={loading} />
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
            placeholder="Search name, username, phone…"
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

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontFamily: "'DM Sans', sans-serif" }}>Account Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Account Status"
              sx={{ borderRadius: 2, fontFamily: "'DM Sans', sans-serif" }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchUsers}
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
            Add Driver
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", fontFamily: "'DM Sans', sans-serif" }}>
            {rows.length} / {users.length}
          </Typography>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {["Driver", "Username", "Phone", "License", "Vehicle", "Status", "Duty", "Actions"].map((h) => (
                  <TableCell key={h} sx={headerSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 7 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                      <Groups sx={{ fontSize: 44, color: "text.disabled" }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {users.length === 0 ? "No external drivers yet — add one to get started" : "No results match your search"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => (
                  <TableRow
                    key={u.user_id}
                    hover
                    sx={{ "&:hover": { bgcolor: alpha(accent, 0.03) }, transition: "background .15s" }}
                  >
                    {/* Driver */}
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                          sx={{
                            width: 34, height: 34, fontSize: "0.68rem", fontWeight: 800,
                            bgcolor: alpha(accent, 0.14), color: accent,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {initials(u.full_name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}
                            sx={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.84rem", lineHeight: 1.3 }}>
                            {u.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.66rem", fontFamily: "'DM Sans', sans-serif" }}>
                            ID #{u.user_id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Username — styled as code */}
                    <TableCell>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1, py: 0.25, borderRadius: 1,
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.78rem", fontWeight: 600,
                            color: theme.palette.info.main,
                          }}
                        >
                          @{u.username}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Phone */}
                    <TableCell>
                      <Typography variant="body2"
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "text.secondary" }}>
                        {u.phone_number}
                      </Typography>
                    </TableCell>

                    {/* License */}
                    <TableCell>
                      <Typography variant="body2"
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
                          color: u.license_number ? "text.primary" : "text.disabled",
                          fontStyle: u.license_number ? "normal" : "italic",
                        }}>
                        {u.license_number || "—"}
                      </Typography>
                    </TableCell>

                    {/* Vehicle */}
                    <TableCell>
                      {u.vehicle_type ? (
                        <Box>
                          <Typography variant="caption" fontWeight={700}
                            sx={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", display: "block" }}>
                            {u.vehicle_type}
                          </Typography>
                          {u.vehicle_number && (
                            <Typography variant="caption"
                              sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.67rem", color: "text.disabled" }}>
                              {u.vehicle_number}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>—</Typography>
                      )}
                    </TableCell>

                    {/* Account Status */}
                    <TableCell><AccountBadge status={u.status} /></TableCell>

                    {/* Duty Status */}
                    <TableCell><DutyBadge status={u.driver_status} /></TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Edit driver">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(u)}
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
                        <Tooltip title="Delete driver">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(u.user_id, u.full_name)}
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

      <AddTempUserModal
        open={modalOpen}
        handleClose={() => setModalOpen(false)}
        editData={editData}
        refresh={fetchUsers}
        onSuccess={(msg) => { flash(msg); fetchUsers(); }}
      />
    </>
  );
};

export default AddTemporaryUsers;