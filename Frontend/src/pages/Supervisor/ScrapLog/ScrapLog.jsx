// src/pages/Supervisor/ScrapLogStatus.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Button, Chip, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, CircularProgress, Alert, Select,
  MenuItem, FormControl, InputLabel, Menu, Badge, Stack, Avatar,
  Fade, Skeleton, useTheme, alpha, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, LinearProgress, Divider,
} from "@mui/material";
import {
  Add, Search, FilterList, Refresh, Recycling, CheckCircle,
  HourglassEmpty, Cancel, Business, ShoppingCart, Close,
  Person, LocationOn, CalendarToday, Delete, Visibility,
  DirectionsCar, LocalShipping, VerifiedUser, Schedule,
  AssignmentTurnedIn, ErrorOutline, PlayArrow, DoneAll,
} from "@mui/icons-material";
import api from "../../../context/Api";
import ScrapLogModal from "./ScrapLogModal";

// ─── Status config: updated to match new ENUM ────────────────────
const STATUS_META = {
  ASSIGNED:   { label: "Assigned",    colorKey: "warning",   icon: <Schedule        sx={{ fontSize: 13 }} /> },
  IN_TRANSIT: { label: "In Transit",  colorKey: "info",      icon: <LocalShipping   sx={{ fontSize: 13 }} /> },
  COMPLETED:  { label: "Completed",   colorKey: "secondary", icon: <AssignmentTurnedIn sx={{ fontSize: 13 }} /> },
  APPROVED:   { label: "Approved",    colorKey: "success",   icon: <CheckCircle     sx={{ fontSize: 13 }} /> },
  REJECTED:   { label: "Rejected",    colorKey: "error",     icon: <Cancel          sx={{ fontSize: 13 }} /> },
};

const SOURCE_META = {
  INTERNAL: { label: "Internal",          colorKey: "default",   icon: <Business     sx={{ fontSize: 13 }} /> },
  CUSTOMER: { label: "Customer Exchange", colorKey: "secondary", icon: <ShoppingCart sx={{ fontSize: 13 }} /> },
};

// ─── Stat Card ────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, colorKey, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const color  = theme.palette[colorKey]?.main || theme.palette.primary.main;
  return (
    <Box sx={{
      flex: 1, minWidth: 110, borderRadius: 3, p: 2.5,
      background: alpha(color, isDark ? 0.1 : 0.07),
      border: `1px solid ${alpha(color, isDark ? 0.25 : 0.18)}`,
      transition: "transform .2s, box-shadow .2s",
      "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 24px ${alpha(color, 0.2)}` },
    }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", fontSize: "0.61rem" }}>{label}</Typography>
          {loading
            ? <Skeleton variant="text" width={50} height={36} />
            : <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.15, mt: 0.5, fontFamily: "'Sora',sans-serif" }}>{value ?? 0}</Typography>}
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
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.6,
      px: 1.2, py: 0.35, borderRadius: "7px",
      background: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.25)}`,
      color, fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {meta.icon} {meta.label}
    </Box>
  );
};

// ─── Source Badge ─────────────────────────────────────────────────
const SourceBadge = ({ source }) => {
  const theme = useTheme();
  const meta  = SOURCE_META[source];
  if (!meta) return <Typography variant="caption">{source}</Typography>;
  const color = source === "CUSTOMER" ? theme.palette.secondary.main : theme.palette.text.secondary;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.6,
      px: 1.1, py: 0.3, borderRadius: "6px",
      background: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.22)}`,
      color, fontSize: "0.67rem", fontWeight: 700,
    }}>
      {meta.icon} {meta.label}
    </Box>
  );
};

// ─── Items Progress Bar ───────────────────────────────────────────
const ItemsProgress = ({ total, collected, damaged, pending }) => {
  const theme = useTheme();
  if (!total) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const collectedPct = (collected / total) * 100;
  const damagedPct   = (damaged / total) * 100;
  return (
    <Box sx={{ minWidth: 90 }}>
      <Box display="flex" justifyContent="space-between" mb={0.4}>
        <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
          {collected + damaged}/{total}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "0.65rem", color: pending === 0 ? "success.main" : "text.disabled", fontWeight: 700 }}>
          {pending === 0 ? "Done" : `${pending} left`}
        </Typography>
      </Box>
      <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: "hidden", display: "flex" }}>
        <Box sx={{ width: `${collectedPct}%`, bgcolor: "success.main", borderRadius: "3px 0 0 3px" }} />
        <Box sx={{ width: `${damagedPct}%`,   bgcolor: "error.main" }} />
      </Box>
    </Box>
  );
};

// ─── Run Detail Modal ─────────────────────────────────────────────
const RunDetailModal = ({ open, runId, onClose, onAction }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [run,      setRun]      = useState(null);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [acting,   setActing]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const pColor = theme.palette.success.main;
  const sColor = theme.palette.info.main;

  useEffect(() => {
    if (open && runId) {
      setLoading(true); setError(""); setSuccess("");
      api.get(`/api/scrap-log/run/${runId}`)
        .then(res => { setRun(res.data.run); setItems(res.data.items || []); })
        .catch(err => setError(err.response?.data?.message || "Failed to load details"))
        .finally(() => setLoading(false));
    }
  }, [open, runId]);

  const handleFinalize = async (status) => {
    setActing(true); setError("");
    try {
      await api.patch(`/api/scrap-log/finalize/${runId}`, { status });
      setSuccess(`Run ${status === "APPROVED" ? "approved" : "rejected"} successfully.`);
      setRun(r => ({ ...r, status }));
      onAction?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update");
    } finally { setActing(false); }
  };

  const fmt = (dt) => dt
    ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  const isFinal   = run?.status === "APPROVED" || run?.status === "REJECTED";
  const canFinalize = run?.status === "COMPLETED";

  const ITEM_STATUS_COLOR = { COLLECTED: "success", DAMAGED: "error", PENDING: "warning" };

  return (
    <Dialog open={open} onClose={acting ? undefined : onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 4, border: `1px solid ${theme.palette.divider}`, maxHeight: "92vh", overflow: "hidden" } }}>
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: alpha(pColor, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Recycling sx={{ color: pColor, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>
                Scrap Run #{runId}
              </Typography>
              {run && <StatusBadge status={run.status} />}
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={acting}><Close fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2, overflow: "auto" }}>
        {loading && !run
          ? <Box display="flex" justifyContent="center" py={6}><CircularProgress color="success" /></Box>
          : !run && error
          ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
          : run && (
            <>
              {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
              {success && <Fade in><Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess("")}>{success}</Alert></Fade>}

              {/* Header info cards */}
              <Grid container spacing={2} mb={2.5}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(pColor, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(pColor, 0.18)}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 1, fontSize: "0.6rem" }}>Vehicle</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{run.vehicle_number || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{run.vehicle_type || ""}{run.is_temporary ? " · Temporary" : ""}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(sColor, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(sColor, 0.18)}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: sColor, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 1, fontSize: "0.6rem" }}>Driver</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{run.driver_name || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{run.driver_phone || ""}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: "secondary.main", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 1, fontSize: "0.6rem" }}>Scrap Info</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{run.scrap_type || "—"}</Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.3}>
                      <SourceBadge source={run.source} />
                      <Typography variant="caption" color="text.secondary">Qty: {run.quantity}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Timestamps */}
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${theme.palette.divider}`, mb: 2.5 }}>
                <Box display="flex" gap={3} flexWrap="wrap">
                  {[
                    { label: "Created",   value: fmt(run.created_at)    },
                    { label: "Departed",  value: fmt(run.departure_time) },
                    { label: "Completed", value: fmt(run.completed_at)  },
                  ].map(t => (
                    <Box key={t.label}>
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</Typography>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">{t.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Pickup address (INTERNAL) */}
              {run.source === "INTERNAL" && run.pickup_address && (
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`, mb: 2.5 }}>
                  <Typography variant="caption" fontWeight={800} sx={{ color: "warning.main", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 0.8, fontSize: "0.6rem" }}>Pickup Location</Typography>
                  <Box display="flex" alignItems="flex-start" gap={0.8}>
                    <LocationOn sx={{ fontSize: 15, color: "text.disabled", mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{run.pickup_address}</Typography>
                      {run.pickup_pincode && <Typography variant="caption" color="text.secondary">PIN: {run.pickup_pincode}</Typography>}
                      {run.collection_notes && <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>{run.collection_notes}</Typography>}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Scrap Items Table */}
              {items.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", mb: 1.5 }}>
                    Scrap Items ({items.length})
                  </Typography>
                  <Box sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {["Item", "Qty", "Status", "Customer / Address", "Collected At"].map(h => (
                            <TableCell key={h} sx={{ bgcolor: alpha(pColor, 0.04), fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map(it => (
                          <TableRow key={it.scrap_item_id} hover sx={{ "&:hover": { bgcolor: alpha(pColor, 0.02) } }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>{it.item_description}</Typography>
                              {it.linked_product_name && <Typography variant="caption" color="text.secondary">↔ {it.linked_product_name}</Typography>}
                            </TableCell>
                            <TableCell><Chip label={it.quantity} size="small" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: "0.68rem" }} /></TableCell>
                            <TableCell>
                              <Chip
                                label={it.collection_status}
                                size="small"
                                color={ITEM_STATUS_COLOR[it.collection_status] || "default"}
                                sx={{ fontWeight: 700, height: 20, fontSize: "0.67rem" }}
                              />
                              {it.proof_url && (
                                <Tooltip title="View proof">
                                  <IconButton size="small" href={it.proof_url} target="_blank" sx={{ ml: 0.5, width: 18, height: 18 }}>
                                    <Visibility sx={{ fontSize: 12 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell>
                              {it.customer_name
                                ? <Box>
                                    <Typography variant="caption" fontWeight={600} color="secondary.main">{it.order_reference}</Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">{it.customer_name}</Typography>
                                    {it.customer_address && <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>{it.customer_address}</Typography>}
                                  </Box>
                                : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>Internal</Typography>}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                                {it.collected_at ? new Date(it.collected_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              )}

              {/* Finalize actions */}
              {canFinalize && (
                <Box sx={{ mt: 2.5, p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, 0.05), border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}` }}>
                  <Typography variant="body2" fontWeight={700} mb={0.5}>Driver has completed this run. Ready for your review.</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Approve to confirm all scrap collected. Reject to send back for correction.
                  </Typography>
                  <Box display="flex" gap={1.5}>
                    <Button variant="contained" color="success" startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
                      onClick={() => handleFinalize("APPROVED")} disabled={acting}
                      sx={{ borderRadius: 2, fontWeight: 700 }}>
                      {acting ? "Saving…" : "Approve"}
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<Cancel />}
                      onClick={() => handleFinalize("REJECTED")} disabled={acting}
                      sx={{ borderRadius: 2, fontWeight: 700 }}>
                      Reject
                    </Button>
                  </Box>
                </Box>
              )}

              {isFinal && (
                <Alert sx={{ mt: 2, borderRadius: 2 }} severity={run.status === "APPROVED" ? "success" : "error"}>
                  This scrap run has been <strong>{STATUS_META[run.status]?.label}</strong>. No further changes allowed.
                </Alert>
              )}
            </>
          )
        }
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button variant="outlined" onClick={onClose} disabled={acting} sx={{ borderRadius: 2 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────
const DeleteConfirmModal = ({ open, run, onClose, onSuccess }) => {
  const theme = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");
  const handleDelete = async () => {
    if (!run) return;
    setDeleting(true); setError("");
    try {
      await api.delete(`/api/scrap-log/run/${run.scrap_id}`);
      onSuccess?.(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete scrap run");
    } finally { setDeleting(false); }
  };
  if (!run) return null;
  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 4, border: `1px solid ${theme.palette.divider}` } }}>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700} color="error.main" sx={{ fontFamily: "'Sora',sans-serif" }}>Delete Scrap Run</Typography>
          <IconButton size="small" onClick={onClose} disabled={deleting}><Close fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete <strong>Scrap Run #{run.scrap_id}</strong> ({run.scrap_type})?
          This will free the assigned vehicle and driver. This action cannot be undone.
        </Typography>
        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2, fontSize: "0.78rem" }}>
          Only runs with status <strong>ASSIGNED</strong> (not yet started) can be deleted.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button variant="outlined" onClick={onClose} disabled={deleting} sx={{ borderRadius: 2 }}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
          startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <Delete />}
          sx={{ borderRadius: 2, fontWeight: 700 }}>
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────
const ScrapLogStatus = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [runs,         setRuns]         = useState([]);
  const [stats,        setStats]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [viewRunId,    setViewRunId]    = useState(null);
  const [deleteRun,    setDeleteRun]    = useState(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [rRes, sRes] = await Promise.all([
        api.get("/api/scrap-log/runs"),
        api.get("/api/scrap-log/stats"),
      ]);
      setRuns(rRes.data.runs || []);
      setStats(sRes.data.stats || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load scrap runs");
    } finally { setLoading(false); }
  };

  const handleCreateSuccess = () => { setSuccessMsg("Scrap run created successfully!"); fetchData(); setTimeout(() => setSuccessMsg(""), 4000); };
  const handleDeleteSuccess = () => { setSuccessMsg("Scrap run deleted.");              fetchData(); setTimeout(() => setSuccessMsg(""), 4000); };
  const handleActionSuccess = () => { fetchData(); };

  const clearFilters = () => { setFilterStatus(""); setFilterSource(""); setFilterAnchor(null); };
  const activeCnt    = [filterStatus, filterSource].filter(Boolean).length;

  const rows = useMemo(() => runs.filter(r => {
    const q  = searchQuery.toLowerCase();
    const ms = !q || [r.scrap_type, r.driver_name, String(r.scrap_id), r.vehicle_number, r.supervisor_name].some(v => v?.toLowerCase().includes(q));
    return ms && (!filterStatus || r.status === filterStatus) && (!filterSource || r.source === filterSource);
  }), [runs, searchQuery, filterStatus, filterSource]);

  const fmt      = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const initials = (n) => n?.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "?";
  const surfaceBg = isDark ? alpha(theme.palette.background.paper, 0.75) : theme.palette.background.paper;
  const pColor = theme.palette.success.main;
  const sColor = theme.palette.info.main;

  const needsReview = runs.filter(r => r.status === "COMPLETED").length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');`}</style>

      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 46, height: 46, borderRadius: 2.5, background: `linear-gradient(135deg,${pColor},${sColor})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${alpha(pColor, 0.35)}` }}>
            <Recycling sx={{ color: "#fff", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", color: "text.primary", letterSpacing: "-0.02em" }}>Scrap Log Status</Typography>
            <Typography variant="caption" color="text.secondary">Manage scrap collection runs · assign, track, approve</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center">
          {needsReview > 0 && (
            <Chip
              label={`${needsReview} awaiting review`}
              color="secondary"
              size="small"
              icon={<AssignmentTurnedIn sx={{ fontSize: "14px !important" }} />}
              sx={{ fontWeight: 700, animation: "pulse 2.5s infinite" }}
            />
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {loading ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowCreate(true)}
            sx={{ background: `linear-gradient(135deg,${pColor},${sColor})`, borderRadius: 2, fontWeight: 700, px: 2.5, color: "#fff", fontFamily: "'Sora',sans-serif", boxShadow: `0 4px 14px ${alpha(pColor, 0.3)}`, "&:hover": { boxShadow: `0 6px 20px ${alpha(pColor, 0.45)}`, transform: "translateY(-1px)" }, transition: "all .2s" }}>
            New Scrap Run
          </Button>
        </Box>
      </Box>

      {successMsg && <Fade in><Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg("")}>{successMsg}</Alert></Fade>}
      {error      && <Alert severity="error"   sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Stats Row */}
      <Box display="flex" gap={2} mb={4} flexWrap="wrap">
        <StatCard label="Total"       value={stats.total}          icon={<Recycling />}           colorKey="primary"   loading={loading} />
        <StatCard label="Assigned"    value={stats.assigned}       icon={<Schedule />}            colorKey="warning"   loading={loading} />
        <StatCard label="In Transit"  value={stats.in_transit}     icon={<LocalShipping />}       colorKey="info"      loading={loading} />
        <StatCard label="Completed"   value={stats.completed}      icon={<AssignmentTurnedIn />}  colorKey="secondary" loading={loading} />
        <StatCard label="Approved"    value={stats.approved}       icon={<CheckCircle />}         colorKey="success"   loading={loading} />
        <StatCard label="Rejected"    value={stats.rejected}       icon={<Cancel />}              colorKey="error"     loading={loading} />
        <StatCard label="Internal"    value={stats.internal_runs}  icon={<Business />}            colorKey="warning"   loading={loading} />
        <StatCard label="Customer"    value={stats.customer_runs}  icon={<ShoppingCart />}        colorKey="secondary" loading={loading} />
      </Box>

      {/* Table Card */}
      <Paper elevation={isDark ? 0 : 1} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden", background: surfaceBg }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <TextField size="small" placeholder="Search type, driver, vehicle, ID…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ flex: 1, minWidth: 220 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
              endAdornment: searchQuery ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery("")}><Close fontSize="small" /></IconButton></InputAdornment> : null,
              sx: { borderRadius: 2 },
            }} />
          <Badge badgeContent={activeCnt} color="error">
            <Button variant="outlined" startIcon={<FilterList />} onClick={(e) => setFilterAnchor(e.currentTarget)} color={activeCnt ? "primary" : "inherit"} sx={{ borderRadius: 2, whiteSpace: "nowrap" }}>Filters</Button>
          </Badge>
          {activeCnt > 0 && <Button size="small" color="error" onClick={clearFilters}>Clear All</Button>}
          <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>{rows.length} / {runs.length}</Typography>
        </Box>

        {activeCnt > 0 && (
          <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap", borderBottom: `1px solid ${theme.palette.divider}` }}>
            {filterStatus && <Chip size="small" label={`Status: ${STATUS_META[filterStatus]?.label || filterStatus}`} onDelete={() => setFilterStatus("")} color="primary" variant="outlined" />}
            {filterSource && <Chip size="small" label={`Source: ${SOURCE_META[filterSource]?.label || filterSource}`} onDelete={() => setFilterSource("")} color="primary" variant="outlined" />}
          </Box>
        )}

        <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}
          PaperProps={{ sx: { borderRadius: 3, minWidth: 280, p: 2, border: `1px solid ${theme.palette.divider}` } }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Filter Scrap Runs</Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                <MenuItem value="">All Statuses</MenuItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}><Box display="flex" alignItems="center" gap={1}>{v.icon} {v.label}</Box></MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Source</InputLabel>
              <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} label="Source">
                <MenuItem value="">All Sources</MenuItem>
                {Object.entries(SOURCE_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}><Box display="flex" alignItems="center" gap={1}>{v.icon} {v.label}</Box></MenuItem>
                ))}
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
                {["#", "Status", "Source", "Scrap Type", "Vehicle / Driver", "Items", "Created", "Actions"].map(h => (
                  <TableCell key={h} sx={{ bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : alpha(pColor, 0.04), color: "text.secondary", fontWeight: 700, fontSize: "0.67rem", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `2px solid ${theme.palette.divider}`, whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                  ))
                : rows.length === 0
                ? <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                        <Recycling sx={{ fontSize: 44, color: "text.disabled" }} />
                        <Typography color="text.secondary">{runs.length === 0 ? "No scrap runs yet — create one to get started" : "No results match your filters"}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                : rows.map(r => {
                    const needsAction = r.status === "COMPLETED";
                    return (
                      <TableRow key={r.scrap_id} hover
                        sx={{ "&:hover": { bgcolor: alpha(pColor, 0.03) }, transition: "background .15s", ...(needsAction && { borderLeft: `3px solid ${theme.palette.secondary.main}` }) }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="text.disabled" sx={{ fontSize: "0.75rem", fontFamily: "'Sora',sans-serif" }}>#{r.scrap_id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexDirection="column" gap={0.4}>
                            <StatusBadge status={r.status} />
                            {needsAction && <Typography variant="caption" sx={{ color: "secondary.main", fontSize: "0.6rem", fontWeight: 700 }}>Needs review</Typography>}
                          </Box>
                        </TableCell>
                        <TableCell><SourceBadge source={r.source} /></TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(pColor, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Recycling sx={{ fontSize: 14, color: pColor }} />
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>{r.scrap_type}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.67rem" }}>Qty: {r.total_quantity}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Box display="flex" alignItems="center" gap={0.8}>
                              <DirectionsCar sx={{ fontSize: 13, color: "text.disabled" }} />
                              <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.75rem" }}>{r.vehicle_number || "—"}</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.8} mt={0.2}>
                              <Avatar sx={{ width: 16, height: 16, fontSize: "0.5rem", fontWeight: 800, bgcolor: alpha(sColor, 0.15), color: "info.main" }}>{initials(r.driver_name)}</Avatar>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>{r.driver_name || "—"}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <ItemsProgress
                            total={r.total_items}
                            collected={r.collected_items}
                            damaged={r.damaged_items}
                            pending={r.pending_items}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>{fmt(r.created_at)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => setViewRunId(r.scrap_id)}
                                sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, width: 28, height: 28, color: "text.secondary",
                                  "&:hover": { borderColor: sColor, color: sColor, bgcolor: alpha(sColor, 0.07) }, transition: "all .18s",
                                  ...(needsAction && { borderColor: theme.palette.secondary.main, color: "secondary.main" }),
                                }}>
                                <Visibility sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            {r.status === "ASSIGNED" && (
                              <Tooltip title="Delete (not yet started)">
                                <IconButton size="small" onClick={() => setDeleteRun(r)}
                                  sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, width: 28, height: 28, color: "text.secondary",
                                    "&:hover": { borderColor: theme.palette.error.main, color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.07) }, transition: "all .18s" }}>
                                  <Delete sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ScrapLogModal    open={showCreate}             onClose={() => setShowCreate(false)} onSuccess={handleCreateSuccess} />
      <RunDetailModal   open={Boolean(viewRunId)}     runId={viewRunId}  onClose={() => setViewRunId(null)}  onAction={handleActionSuccess} />
      <DeleteConfirmModal open={Boolean(deleteRun)}  run={deleteRun}    onClose={() => setDeleteRun(null)}   onSuccess={handleDeleteSuccess} />

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 ${alpha(theme.palette.secondary.main, 0.4)}; }
          50%      { box-shadow: 0 0 0 5px ${alpha(theme.palette.secondary.main, 0)}; }
        }
      `}</style>
    </Box>
  );
};

export default ScrapLogStatus;