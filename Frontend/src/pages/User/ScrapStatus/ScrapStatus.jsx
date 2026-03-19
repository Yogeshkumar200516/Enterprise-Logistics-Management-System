// src/pages/Driver/ScrapStatus.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box, Typography, Button, Chip, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, CircularProgress, Alert, Select,
  MenuItem, FormControl, InputLabel, Menu, Badge, Stack,
  Fade, Skeleton, useTheme, alpha, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Avatar, LinearProgress,
  Divider,
} from "@mui/material";
import {
  Search, FilterList, Refresh, Recycling, CheckCircle,
  HourglassEmpty, Cancel, Business, ShoppingCart, Close,
  OpenInNew, CalendarToday, LocationOn, Schedule, LocalShipping,
  AssignmentTurnedIn, PlayArrow, DoneAll, UploadFile, Person,
  DirectionsCar, Notes, PhotoCamera, ErrorOutline, Visibility,
} from "@mui/icons-material";
import { DatePicker }         from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs }       from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import api from "../../../context/Api";
import { useAuth } from "../../../context/AuthContext";

// ─── Status config matching new ENUM ─────────────────────────────
const STATUS_META = {
  ASSIGNED:   { label: "Assigned",   colorKey: "warning",   icon: <Schedule        sx={{ fontSize: 13 }} /> },
  IN_TRANSIT: { label: "In Transit", colorKey: "info",      icon: <LocalShipping   sx={{ fontSize: 13 }} /> },
  COMPLETED:  { label: "Completed",  colorKey: "secondary", icon: <AssignmentTurnedIn sx={{ fontSize: 13 }} /> },
  APPROVED:   { label: "Approved",   colorKey: "success",   icon: <CheckCircle     sx={{ fontSize: 13 }} /> },
  REJECTED:   { label: "Rejected",   colorKey: "error",     icon: <Cancel          sx={{ fontSize: 13 }} /> },
};

const SOURCE_META = {
  INTERNAL: { label: "Internal",          icon: <Business     sx={{ fontSize: 13 }} /> },
  CUSTOMER: { label: "Customer Exchange", icon: <ShoppingCart sx={{ fontSize: 13 }} /> },
};

const ITEM_STATUS_COLOR = { COLLECTED: "success", DAMAGED: "error", PENDING: "warning" };

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

// ─── Badges ───────────────────────────────────────────────────────
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

const SourceBadge = ({ source }) => {
  const theme = useTheme();
  const meta  = SOURCE_META[source];
  if (!meta) return <Typography variant="caption">{source}</Typography>;
  const color = source === "CUSTOMER" ? theme.palette.secondary.main : theme.palette.text.secondary;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, px: 1.1, py: 0.3, borderRadius: "6px", background: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.22)}`, color, fontSize: "0.67rem", fontWeight: 700 }}>
      {meta.icon} {meta.label}
    </Box>
  );
};

// ─── Items progress bar ───────────────────────────────────────────
const ItemsProgress = ({ total, collected, damaged, pending }) => {
  const theme = useTheme();
  if (!total) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const collectedPct = (collected / total) * 100;
  const damagedPct   = (damaged   / total) * 100;
  return (
    <Box sx={{ minWidth: 80 }}>
      <Box display="flex" justifyContent="space-between" mb={0.4}>
        <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>{collected + damaged}/{total}</Typography>
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

// ─── Item Update Row ──────────────────────────────────────────────
// Allows driver to update each scrap item's status + upload proof
const ScrapItemRow = ({ item, runStatus, onUpdated }) => {
  const theme = useTheme();
  const [status,    setStatus]    = useState(item.collection_status);
  const [notes,     setNotes]     = useState(item.notes || "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [file,      setFile]      = useState(null);
  const fileRef = useRef(null);

  const canEdit = runStatus === "IN_TRANSIT";

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const formData = new FormData();
      formData.append("collection_status", status);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (file) formData.append("proof", file);

      await api.patch(`/api/driver-scrap/update-item/${item.scrap_item_id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update item");
    } finally { setSaving(false); }
  };

  const isDirty = status !== item.collection_status || notes !== (item.notes || "") || file !== null;

  return (
    <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
      {error && <Alert severity="error" sx={{ mb: 1, borderRadius: 2, py: 0.5 }} onClose={() => setError("")}>{error}</Alert>}

      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5} gap={1}>
        <Box flex={1}>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem" }}>{item.item_description}</Typography>
          {item.linked_product_name && (
            <Typography variant="caption" color="secondary.main">↔ {item.linked_product_name}</Typography>
          )}
          {item.customer_name && (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
              <LocationOn sx={{ fontSize: 12, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary">{item.customer_name} · {item.customer_address}</Typography>
            </Box>
          )}
        </Box>
        <Chip label={`×${item.quantity}`} size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
      </Box>

      {canEdit ? (
        <Grid container spacing={1.5} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status" sx={{ borderRadius: 2 }}>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="COLLECTED">Collected ✓</MenuItem>
                <MenuItem value="DAMAGED">Damaged ✗</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Notes (optional)" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes…"
              InputProps={{ sx: { borderRadius: 2 } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box display="flex" gap={1} alignItems="center">
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0] || null)} />
              <Button size="small" variant="outlined" startIcon={<PhotoCamera />}
                onClick={() => fileRef.current?.click()}
                sx={{ borderRadius: 2, flex: 1, fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                {file ? file.name.slice(0, 12) + "…" : "Add Proof"}
              </Button>
              <Button size="small" variant="contained" color="success"
                onClick={handleSave} disabled={saving || !isDirty}
                startIcon={saving ? <CircularProgress size={12} color="inherit" /> : undefined}
                sx={{ borderRadius: 2, fontWeight: 700, minWidth: 60 }}>
                {saving ? "…" : "Save"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Chip label={item.collection_status} size="small" color={ITEM_STATUS_COLOR[item.collection_status] || "default"} sx={{ fontWeight: 700, height: 22, fontSize: "0.68rem" }} />
          {item.collected_at && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              {new Date(item.collected_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </Typography>
          )}
          {item.notes && <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>{item.notes}</Typography>}
          {item.proof_url && (
            <Tooltip title="View proof">
              <IconButton size="small" href={item.proof_url} target="_blank">
                <Visibility sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── Run Detail Modal ─────────────────────────────────────────────
const ScrapDetailModal = ({ open, scrapId, onClose, onUpdated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [run,     setRun]     = useState(null);
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [acting,  setActing]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const pColor = theme.palette.success.main;
  const sColor = theme.palette.info.main;

  const fetchRun = useCallback(async () => {
    if (!scrapId) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/api/driver-scrap/assignment/${scrapId}`);
      setRun(res.data.run);
      setItems(res.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load details");
    } finally { setLoading(false); }
  }, [scrapId]);

  useEffect(() => {
    if (open && scrapId) { fetchRun(); }
  }, [open, scrapId, fetchRun]);

  const handleStart = async () => {
    setActing(true); setError("");
    try {
      await api.patch(`/api/driver-scrap/start/${scrapId}`, { departure_time: new Date().toISOString() });
      setSuccess("Run started! Status changed to In Transit.");
      await fetchRun();
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start run");
    } finally { setActing(false); }
  };

  const handleRequestApproval = async () => {
    setActing(true); setError("");
    try {
      await api.patch(`/api/driver-scrap/request-approval/${scrapId}`);
      setSuccess("Approval requested! Supervisor will review shortly.");
      await fetchRun();
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request approval");
    } finally { setActing(false); }
  };

  const fmt = (dt) => dt
    ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  const pendingCount    = items.filter(i => i.collection_status === "PENDING").length;
  const allResolved     = items.length > 0 && pendingCount === 0;
  const canStart        = run?.status === "ASSIGNED";
  const canUpdateItems  = run?.status === "IN_TRANSIT";
  const canRequestApproval = run?.status === "IN_TRANSIT" && allResolved;
  const isFinal         = run?.status === "APPROVED" || run?.status === "REJECTED";

  return (
    <Dialog open={open} onClose={acting ? undefined : onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 4, border: `1px solid ${theme.palette.divider}`, maxHeight: "93vh", overflow: "hidden" } }}>
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: alpha(pColor, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Recycling sx={{ color: pColor, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>
                Scrap Run #{scrapId}
              </Typography>
              {run && <StatusBadge status={run.status} />}
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchRun} disabled={loading || acting}><Refresh /></IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} disabled={acting}><Close fontSize="small" /></IconButton>
          </Box>
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

              {/* Summary cards */}
              <Grid container spacing={2} mb={2.5}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(pColor, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(pColor, 0.18)}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 0.8, fontSize: "0.6rem" }}>Vehicle</Typography>
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <DirectionsCar sx={{ fontSize: 16, color: pColor }} />
                      <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{run.vehicle_number || "—"}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{run.vehicle_type || ""}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(sColor, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(sColor, 0.18)}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: sColor, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 0.8, fontSize: "0.6rem" }}>Supervisor</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{run.supervisor_name || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{run.supervisor_phone || ""}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: "secondary.main", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 0.8, fontSize: "0.6rem" }}>Scrap</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{run.scrap_type}</Typography>
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <SourceBadge source={run.source} />
                      <Typography variant="caption" color="text.secondary">Qty: {run.quantity}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Timestamps */}
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${theme.palette.divider}`, mb: 2 }}>
                <Box display="flex" gap={3} flexWrap="wrap">
                  {[{ label: "Assigned", value: fmt(run.created_at) }, { label: "Departed", value: fmt(run.departure_time) }].map(t => (
                    <Box key={t.label}>
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</Typography>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">{t.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Pickup info (INTERNAL) */}
              {run.source === "INTERNAL" && run.pickup_address && (
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`, mb: 2 }}>
                  <Typography variant="caption" fontWeight={800} sx={{ color: "warning.main", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 0.8, fontSize: "0.6rem" }}>Pickup Location</Typography>
                  <Box display="flex" alignItems="flex-start" gap={0.8}>
                    <LocationOn sx={{ fontSize: 15, color: "warning.main", mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{run.pickup_address}</Typography>
                      {run.pickup_pincode && <Typography variant="caption" color="text.secondary">PIN: {run.pickup_pincode}</Typography>}
                      {run.collection_notes && <Typography variant="caption" color="text.disabled" display="block" mt={0.3}>{run.collection_notes}</Typography>}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ── START button ── */}
              {canStart && (
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.06), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`, mb: 2.5 }}>
                  <Typography variant="body2" fontWeight={700} mb={0.5}>Ready to start?</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Press Start to mark this run as In Transit. Your departure time will be recorded.
                  </Typography>
                  <Button variant="contained" color="warning" startIcon={acting ? <CircularProgress size={15} color="inherit" /> : <PlayArrow />}
                    onClick={handleStart} disabled={acting}
                    sx={{ borderRadius: 2, fontWeight: 700, color: "#fff" }}>
                    {acting ? "Starting…" : "Start Run"}
                  </Button>
                </Box>
              )}

              {/* ── Scrap Items ── */}
              {items.length > 0 && (
                <Box mb={2}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>
                      Items ({items.length})
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip label={`${items.filter(i => i.collection_status === "COLLECTED").length} collected`} size="small" color="success" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      {items.filter(i => i.collection_status === "DAMAGED").length > 0 && (
                        <Chip label={`${items.filter(i => i.collection_status === "DAMAGED").length} damaged`} size="small" color="error" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      )}
                      {pendingCount > 0 && (
                        <Chip label={`${pendingCount} pending`} size="small" color="warning" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      )}
                    </Box>
                  </Box>
                  <Stack spacing={1.5}>
                    {items.map(item => (
                      <ScrapItemRow key={item.scrap_item_id} item={item} runStatus={run.status} onUpdated={fetchRun} />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* ── Request Approval ── */}
              {canUpdateItems && (
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(allResolved ? theme.palette.success.main : theme.palette.text.primary, allResolved ? 0.06 : 0.03), border: `1px solid ${alpha(allResolved ? theme.palette.success.main : theme.palette.divider, allResolved ? 0.2 : 1)}` }}>
                  <Typography variant="body2" fontWeight={700} mb={0.5}>
                    {allResolved ? "All items resolved! Request approval." : `${pendingCount} item(s) still pending.`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    {allResolved
                      ? "Your supervisor will review and finalize this scrap run."
                      : "Update all items as Collected or Damaged before requesting approval."}
                  </Typography>
                  <Button variant="contained" color="success"
                    startIcon={acting ? <CircularProgress size={15} color="inherit" /> : <DoneAll />}
                    onClick={handleRequestApproval} disabled={!canRequestApproval || acting}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    {acting ? "Sending…" : "Request Approval"}
                  </Button>
                </Box>
              )}

              {/* ── Final status banners ── */}
              {run.status === "COMPLETED" && (
                <Alert severity="info" icon={<AssignmentTurnedIn />} sx={{ mt: 1.5, borderRadius: 2 }}>
                  Approval request sent. Awaiting supervisor review.
                </Alert>
              )}
              {run.status === "APPROVED" && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 1.5, borderRadius: 2 }}>
                  This scrap run has been <strong>approved</strong> by your supervisor.
                </Alert>
              )}
              {run.status === "REJECTED" && (
                <Alert severity="error" icon={<Cancel />} sx={{ mt: 1.5, borderRadius: 2 }}>
                  This scrap run was <strong>rejected</strong>. Please contact your supervisor for details.
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

// ─── Main Page ────────────────────────────────────────────────────
const ScrapStatus = () => {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === "dark";
  const { user } = useAuth();

  const [assignments,    setAssignments]    = useState([]);
  const [stats,          setStats]          = useState({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [selectedId,     setSelectedId]     = useState(null);

  const [searchQuery,    setSearchQuery]    = useState("");
  const [filterAnchor,   setFilterAnchor]   = useState(null);
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterSource,   setFilterSource]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo,   setFilterDateTo]   = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [aRes, sRes] = await Promise.all([
        api.get("/api/driver-scrap/my-assignments"),
        api.get("/api/driver-scrap/my-stats"),
      ]);
      setAssignments(aRes.data.assignments || []);
      setStats(sRes.data.stats || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load scrap data");
    } finally { setLoading(false); }
  };

  const clearFilters = () => { setFilterStatus(""); setFilterSource(""); setFilterDateFrom(null); setFilterDateTo(null); setFilterAnchor(null); };
  const activeCnt = [filterStatus, filterSource, filterDateFrom, filterDateTo].filter(Boolean).length;

  const rows = useMemo(() => assignments.filter(a => {
    const q  = searchQuery.toLowerCase();
    const ms = !q || [a.scrap_type, String(a.scrap_id), a.vehicle_number].some(v => v?.toLowerCase().includes(q));
    const d  = dayjs(a.created_at);
    const mdf = !filterDateFrom || d.isAfter(dayjs(filterDateFrom).subtract(1, "day"));
    const mdt = !filterDateTo   || d.isBefore(dayjs(filterDateTo).add(1, "day"));
    return ms && (!filterStatus || a.status === filterStatus) && (!filterSource || a.source === filterSource) && mdf && mdt;
  }), [assignments, searchQuery, filterStatus, filterSource, filterDateFrom, filterDateTo]);

  const fmt      = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const surfaceBg = isDark ? alpha(theme.palette.background.paper, 0.75) : theme.palette.background.paper;
  const pColor   = theme.palette.success.main;
  const sColor   = theme.palette.info.main;

  // runs needing driver action
  const needsAction = assignments.filter(a => a.status === "ASSIGNED" || (a.status === "IN_TRANSIT" && a.pending_items > 0)).length;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');`}</style>

        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 46, height: 46, borderRadius: 2.5, background: `linear-gradient(135deg,${pColor},${sColor})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${alpha(pColor, 0.35)}` }}>
              <Recycling sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", color: "text.primary", letterSpacing: "-0.02em" }}>My Scrap Runs</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.full_name ? `Assigned to ${user.full_name}` : "Your scrap collection tasks"}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            {needsAction > 0 && (
              <Chip
                label={`${needsAction} need${needsAction > 1 ? "" : "s"} action`}
                color="warning" size="small"
                icon={<Schedule sx={{ fontSize: "14px !important" }} />}
                sx={{ fontWeight: 700 }}
              />
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={fetchData} disabled={loading} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                {loading ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {/* Stats */}
        <Box display="flex" gap={2} mb={4} flexWrap="wrap">
          <StatCard label="Total"       value={stats.total}          icon={<Recycling />}           colorKey="primary"   loading={loading} />
          <StatCard label="Assigned"    value={stats.assigned}       icon={<Schedule />}            colorKey="warning"   loading={loading} />
          <StatCard label="In Transit"  value={stats.in_transit}     icon={<LocalShipping />}       colorKey="info"      loading={loading} />
          <StatCard label="Completed"   value={stats.completed}      icon={<AssignmentTurnedIn />}  colorKey="secondary" loading={loading} />
          <StatCard label="Approved"    value={stats.approved}       icon={<CheckCircle />}         colorKey="success"   loading={loading} />
          <StatCard label="Rejected"    value={stats.rejected}       icon={<Cancel />}              colorKey="error"     loading={loading} />
          <StatCard label="Internal"    value={stats.internal_count} icon={<Business />}            colorKey="warning"   loading={loading} />
          <StatCard label="Customer"    value={stats.customer_count} icon={<ShoppingCart />}        colorKey="secondary" loading={loading} />
        </Box>

        {/* Table Card */}
        <Paper elevation={isDark ? 0 : 1} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden", background: surfaceBg }}>
          {/* Toolbar */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <TextField size="small" placeholder="Search type, vehicle, ID…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
                endAdornment: searchQuery ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery("")}><Close fontSize="small" /></IconButton></InputAdornment> : null,
                sx: { borderRadius: 2 },
              }} />
            <Badge badgeContent={activeCnt} color="error">
              <Button variant="outlined" startIcon={<FilterList />} onClick={(e) => setFilterAnchor(e.currentTarget)} color={activeCnt ? "primary" : "inherit"} sx={{ borderRadius: 2, whiteSpace: "nowrap" }}>Filters</Button>
            </Badge>
            {activeCnt > 0 && <Button size="small" color="error" onClick={clearFilters}>Clear All</Button>}
            <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>{rows.length} / {assignments.length}</Typography>
          </Box>

          {activeCnt > 0 && (
            <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap", borderBottom: `1px solid ${theme.palette.divider}` }}>
              {filterStatus   && <Chip size="small" label={`Status: ${STATUS_META[filterStatus]?.label || filterStatus}`}   onDelete={() => setFilterStatus("")}   color="primary" variant="outlined" />}
              {filterSource   && <Chip size="small" label={`Source: ${SOURCE_META[filterSource]?.label || filterSource}`}   onDelete={() => setFilterSource("")}   color="primary" variant="outlined" />}
              {filterDateFrom && <Chip size="small" label={`From: ${dayjs(filterDateFrom).format("DD MMM YYYY")}`}          onDelete={() => setFilterDateFrom(null)} color="primary" variant="outlined" />}
              {filterDateTo   && <Chip size="small" label={`To: ${dayjs(filterDateTo).format("DD MMM YYYY")}`}              onDelete={() => setFilterDateTo(null)}   color="primary" variant="outlined" />}
            </Box>
          )}

          <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}
            PaperProps={{ sx: { borderRadius: 3, minWidth: 300, p: 2, border: `1px solid ${theme.palette.divider}` } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Filter Scrap Runs</Typography>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                  <MenuItem value="">All Statuses</MenuItem>
                  {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}><Box display="flex" alignItems="center" gap={1}>{v.icon} {v.label}</Box></MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Source</InputLabel>
                <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} label="Source">
                  <MenuItem value="">All Sources</MenuItem>
                  {Object.entries(SOURCE_META).map(([k, v]) => <MenuItem key={k} value={k}><Box display="flex" alignItems="center" gap={1}>{v.icon} {v.label}</Box></MenuItem>)}
                </Select>
              </FormControl>
              <DatePicker label="Assigned From" value={filterDateFrom} onChange={setFilterDateFrom} slotProps={{ textField: { size: "small", fullWidth: true } }} />
              <DatePicker label="Assigned To"   value={filterDateTo}   onChange={setFilterDateTo}   slotProps={{ textField: { size: "small", fullWidth: true } }} />
              <Button variant="contained" onClick={() => setFilterAnchor(null)} sx={{ borderRadius: 2 }}>Apply</Button>
            </Stack>
          </Menu>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {["#", "Status", "Source", "Scrap Type", "Vehicle", "Items", "Date", "Open"].map(h => (
                    <TableCell key={h} sx={{ bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : alpha(pColor, 0.04), color: "text.secondary", fontWeight: 700, fontSize: "0.67rem", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `2px solid ${theme.palette.divider}`, whiteSpace: "nowrap" }}>{h}</TableCell>
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
                          <Recycling sx={{ fontSize: 44, color: "text.disabled" }} />
                          <Typography color="text.secondary">{assignments.length === 0 ? "No scrap runs assigned to you yet" : "No results match your filters"}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  : rows.map(a => {
                      const isActive     = a.status === "ASSIGNED" || a.status === "IN_TRANSIT";
                      const needsDriverAction = isActive;
                      return (
                        <TableRow key={a.scrap_id} hover onClick={() => setSelectedId(a.scrap_id)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: alpha(pColor, 0.04) },
                            transition: "background .15s",
                            ...(needsDriverAction && { borderLeft: `3px solid ${theme.palette.warning.main}` }),
                          }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="text.disabled" sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.75rem" }}>#{a.scrap_id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" flexDirection="column" gap={0.4}>
                              <StatusBadge status={a.status} />
                              {a.status === "ASSIGNED"   && <Typography variant="caption" sx={{ color: "warning.main",   fontSize: "0.62rem", fontWeight: 700 }}>Tap to start</Typography>}
                              {a.status === "IN_TRANSIT" && a.pending_items > 0 && <Typography variant="caption" sx={{ color: "info.main", fontSize: "0.62rem", fontWeight: 700 }}>{a.pending_items} item{a.pending_items > 1 ? "s" : ""} pending</Typography>}
                              {a.status === "IN_TRANSIT" && a.pending_items === 0 && <Typography variant="caption" sx={{ color: "success.main", fontSize: "0.62rem", fontWeight: 700 }}>Ready to submit</Typography>}
                              {a.status === "COMPLETED"  && <Typography variant="caption" sx={{ color: "secondary.main", fontSize: "0.62rem", fontWeight: 700 }}>Awaiting approval</Typography>}
                            </Box>
                          </TableCell>
                          <TableCell><SourceBadge source={a.source} /></TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(pColor, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Recycling sx={{ fontSize: 14, color: pColor }} />
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>{a.scrap_type}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.67rem" }}>Qty: {a.total_quantity}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.8}>
                              <DirectionsCar sx={{ fontSize: 13, color: "text.disabled" }} />
                              <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.75rem" }}>{a.vehicle_number || "—"}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <ItemsProgress
                              total={a.total_items}
                              collected={a.collected_items}
                              damaged={a.damaged_items}
                              pending={a.pending_items}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <CalendarToday sx={{ fontSize: 12, color: "text.disabled" }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>{fmt(a.created_at)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Open">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedId(a.scrap_id); }}
                                sx={{
                                  border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, width: 30, height: 30, color: "text.secondary",
                                  "&:hover": { borderColor: pColor, color: pColor, bgcolor: alpha(pColor, 0.07) },
                                  transition: "all .18s",
                                  ...(needsDriverAction && { borderColor: theme.palette.warning.main, color: "warning.main" }),
                                }}>
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

        <ScrapDetailModal
          open={Boolean(selectedId)}
          scrapId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={fetchData}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default ScrapStatus;