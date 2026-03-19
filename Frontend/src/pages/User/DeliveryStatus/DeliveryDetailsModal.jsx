// src/pages/Driver/DriverDeliveryDetailsModal.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, IconButton, CircularProgress,
  Alert, Grid, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Paper,
  LinearProgress, TextField, Collapse, Fade, useTheme, alpha,
  Tab, Tabs,
} from "@mui/material";
import {
  Close, LocalShipping, Person, Assignment, CheckCircle,
  HourglassEmpty, BrokenImage, DirectionsCar, Phone,
  LocationOn, CalendarToday, ExpandMore, ExpandLess,
  Route, SplitscreenOutlined, Schedule, DoneAll, Warning,
  Info, Refresh, CloudUpload, PhotoCamera, Send, ReportProblem,
  Verified, MarkEmailRead,
} from "@mui/icons-material";
import api from "../../../context/Api";

// ─── Status meta ────────────────────────────────────────────────
const DELIVERY_STATUS_META = {
  ASSIGNED:            { label: "Assigned",             colorKey: "info",      Icon: Schedule },
  IN_TRANSIT:          { label: "In Transit",           colorKey: "warning",   Icon: Route },
  DELIVERED:           { label: "Delivered",            colorKey: "success",   Icon: CheckCircle },
  PARTIALLY_DELIVERED: { label: "Partially Delivered",  colorKey: "secondary", Icon: SplitscreenOutlined },
};

const ITEM_STATUS_META = {
  PENDING:   { label: "Pending",   colorKey: "warning", Icon: HourglassEmpty },
  DELIVERED: { label: "Delivered", colorKey: "success", Icon: CheckCircle },
  DAMAGED:   { label: "Damaged",   colorKey: "error",   Icon: BrokenImage },
};

// ─── StatusBadge ────────────────────────────────────────────────
const StatusBadge = ({ status, meta, size = "medium" }) => {
  const theme = useTheme();
  const cfg   = meta[status];
  if (!cfg) return <Typography variant="caption">{status}</Typography>;
  const color = theme.palette[cfg.colorKey]?.main || theme.palette.text.secondary;
  const Icon  = cfg.Icon;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.6,
      px: size === "small" ? 1 : 1.4, py: size === "small" ? 0.3 : 0.45,
      borderRadius: "8px", fontWeight: 700, whiteSpace: "nowrap",
      background: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.28)}`,
      color, fontSize: size === "small" ? "0.67rem" : "0.75rem",
    }}>
      <Icon sx={{ fontSize: size === "small" ? 12 : 14 }} />
      {cfg.label}
    </Box>
  );
};

// ─── FileUploadZone ─────────────────────────────────────────────
const FileUploadZone = ({ onFile, file, label, accept = "image/*,application/pdf" }) => {
  const theme   = useTheme();
  const inputRef= useRef();
  const [drag, setDrag] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const preview = file && file.type?.startsWith("image/")
    ? URL.createObjectURL(file)
    : null;

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      sx={{
        border: `2px dashed ${drag ? theme.palette.primary.main : theme.palette.divider}`,
        borderRadius: 2, p: 2, textAlign: "center", cursor: "pointer",
        background: drag ? alpha(theme.palette.primary.main, 0.05) : "transparent",
        transition: "all .2s",
        "&:hover": { borderColor: theme.palette.primary.main, background: alpha(theme.palette.primary.main, 0.04) },
      }}
    >
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      {preview ? (
        <Box>
          <img src={preview} alt="preview" style={{ maxHeight: 100, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }} />
          <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>{file.name}</Typography>
        </Box>
      ) : file ? (
        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          <CloudUpload color="primary" />
          <Typography variant="body2" color="primary.main" fontWeight={600}>{file.name}</Typography>
        </Box>
      ) : (
        <Box>
          <PhotoCamera sx={{ color: "text.disabled", fontSize: 28, mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="caption" color="text.disabled">Click or drag & drop · JPG, PNG, PDF · max 10MB</Typography>
        </Box>
      )}
    </Box>
  );
};

// ─── DamageReportForm ───────────────────────────────────────────
const DamageReportForm = ({ item, onClose, onSuccess, disabled }) => {
  const theme = useTheme();
  const [description, setDescription] = useState(item.damage_description || "");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");

  const handleSubmit = async () => {
    if (!description.trim()) { setError("Please provide a damage description"); return; }
    setSubmitting(true); setError("");
    try {
      const fd = new FormData();
      fd.append("description", description.trim());
      if (evidenceFile) fd.append("evidence", evidenceFile);

      await api.post(`/api/driver-delivery/report-damage/${item.delivery_item_id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit damage report");
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, bgcolor: alpha(theme.palette.error.main, 0.04) }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <ReportProblem sx={{ color: "error.main", fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight={700} color="error.main">Report Damage — {item.product_name}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ ml: "auto" }}><Close fontSize="small" /></IconButton>
      </Box>

      {/* Existing report info */}
      {item.damage_description && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: "0.78rem" }}>
          <strong>Existing report:</strong> {item.damage_description}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.78rem" }} onClose={() => setError("")}>{error}</Alert>}

      <TextField
        fullWidth multiline rows={3} size="small"
        label="Damage Description *"
        placeholder="Describe the damage: what happened, how it occurred, extent of damage…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={disabled || submitting}
        sx={{ mb: 2 }}
      />

      <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600}>
        Evidence Photo / Document (optional)
      </Typography>
      <FileUploadZone
        label="Upload evidence photo or document"
        onFile={setEvidenceFile}
        file={evidenceFile}
      />

      {item.damage_evidence_url && !evidenceFile && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Existing evidence on file · uploading a new file will replace it
        </Typography>
      )}

      <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
        <Button size="small" variant="outlined" onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          size="small" variant="contained" color="error"
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <Send />}
          onClick={handleSubmit} disabled={submitting || disabled}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {submitting ? "Submitting…" : "Submit Report"}
        </Button>
      </Box>
    </Box>
  );
};

// ─── ItemRow ─────────────────────────────────────────────────────
const ItemRow = ({ item, onRefresh, deliveryStatus, disabled }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [proofFile,    setProofFile]    = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [showDamage,   setShowDamage]   = useState(false);
  const [error,        setError]        = useState("");

  const isFinal       = ["DELIVERED", "DAMAGED"].includes(item.delivery_status);
  const isDisabled    = disabled || isFinal;
  const deliveryFinal = ["DELIVERED", "PARTIALLY_DELIVERED"].includes(deliveryStatus);

  const handleMarkStatus = async (status) => {
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("status", status);
      if (proofFile) fd.append("proof", proofFile);

      await api.patch(`/api/driver-delivery/update-item/${item.delivery_item_id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProofFile(null);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update item");
      setUploading(false);
    }
  };

  return (
    <Box sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: "hidden", mb: 1 }}>
      {/* Item header */}
      <Box sx={{
        px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
        bgcolor: item.delivery_status === "DELIVERED"
          ? alpha(theme.palette.success.main, isDark ? 0.08 : 0.04)
          : item.delivery_status === "DAMAGED"
          ? alpha(theme.palette.error.main, isDark ? 0.08 : 0.04)
          : "transparent",
      }}>
        {/* Product info */}
        <Box flex={1} minWidth={120}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={700}>{item.product_name}</Typography>
            {item.is_fragile && (
              <Chip icon={<BrokenImage sx={{ fontSize: "11px !important" }} />} label="Fragile"
                size="small" color="error" sx={{ height: 18, fontSize: "0.6rem" }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">Qty: {item.quantity}</Typography>
        </Box>

        {/* Status */}
        <StatusBadge status={item.delivery_status} meta={ITEM_STATUS_META} size="small" />

        {/* Delivered time */}
        {item.delivery_status === "DELIVERED" && item.delivered_at && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
            {new Date(item.delivered_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </Typography>
        )}

        {/* Proof thumbnail */}
        {item.proof_url && (
          <Tooltip title="View proof">
            <Box
              component="a" href={item.proof_url} target="_blank" rel="noreferrer"
              sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "primary.main", textDecoration: "none", fontSize: "0.72rem", fontWeight: 600 }}
            >
              <Verified sx={{ fontSize: 14 }} /> Proof
            </Box>
          </Tooltip>
        )}

        {/* Damage tag */}
        {item.damage_id && (
          <Tooltip title={item.damage_description || "Damage reported"}>
            <Chip icon={<ReportProblem sx={{ fontSize: "11px !important" }} />}
              label="Damage Filed" size="small" color="error" variant="outlined"
              sx={{ height: 20, fontSize: "0.63rem" }} />
          </Tooltip>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Box px={2} pb={1}>
          <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: "0.75rem" }} onClose={() => setError("")}>{error}</Alert>
        </Box>
      )}

      {/* Actions (only if not final and delivery not finalized) */}
      {!isDisabled && !deliveryFinal && (
        <Box sx={{
          px: 2, pb: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          pt: 1.5,
          bgcolor: isDark ? alpha(theme.palette.background.default, 0.3) : alpha(theme.palette.text.primary, 0.02),
        }}>
          {/* Proof upload */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
            Delivery Proof (photo/document)
          </Typography>
          <FileUploadZone label="Upload delivery proof" onFile={setProofFile} file={proofFile} />

          {/* Action buttons */}
          <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
            <Button
              size="small" variant="contained" color="success"
              startIcon={uploading ? <CircularProgress size={13} color="inherit" /> : <CheckCircle />}
              onClick={() => handleMarkStatus("DELIVERED")}
              disabled={uploading}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}
            >
              Mark Delivered
            </Button>
            <Button
              size="small" variant="outlined" color="error"
              startIcon={<ReportProblem />}
              onClick={() => setShowDamage(v => !v)}
              disabled={uploading}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}
            >
              Report Damage
            </Button>
          </Box>
        </Box>
      )}

      {/* Damage report form */}
      <Collapse in={showDamage} timeout="auto" unmountOnExit>
        <Box px={2} pb={2}>
          <DamageReportForm
            item={item}
            onClose={() => setShowDamage(false)}
            onSuccess={() => { setShowDamage(false); onRefresh(); }}
            disabled={deliveryFinal}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

// ─── OrderGroup ──────────────────────────────────────────────────
const OrderGroup = ({ order, items, onRefresh, deliveryStatus, disabled }) => {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === "dark";
  const [open, setOpen] = useState(true);

  const delivered = items.filter(i => i.delivery_status === "DELIVERED").length;
  const damaged   = items.filter(i => i.delivery_status === "DAMAGED").length;
  const pending   = items.filter(i => i.delivery_status === "PENDING").length;
  const total     = items.length;
  const pct       = total > 0 ? Math.round(((delivered + damaged) / total) * 100) : 0;

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden", mb: 2 }}>
      {/* Order header */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          px: 2.5, py: 2, display: "flex", alignItems: "flex-start", gap: 2,
          cursor: "pointer",
          bgcolor: isDark ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.03),
          borderBottom: open ? `1px solid ${theme.palette.divider}` : "none",
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
          transition: "background .15s", flexWrap: "wrap",
        }}
      >
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
            <Typography variant="body1" fontWeight={800} color="primary.main" sx={{ fontFamily: "'Sora',sans-serif" }}>
              {order.order_reference}
            </Typography>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="body2" fontWeight={600}>{order.customer_name}</Typography>
          </Box>
          <Box display="flex" alignItems="flex-start" gap={0.5}>
            <LocationOn sx={{ fontSize: 14, color: "text.disabled", mt: 0.1, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              {order.customer_address}{order.pincode ? ` — ${order.pincode}` : ""}
            </Typography>
          </Box>
        </Box>

        {/* Item summary chips */}
        <Box display="flex" gap={0.8} alignItems="center" flexShrink={0} flexWrap="wrap">
          {delivered > 0 && <Chip label={`${delivered} ✓`} size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }} />}
          {damaged   > 0 && <Chip label={`${damaged} ✗`}  size="small" color="error"   variant="outlined" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }} />}
          {pending   > 0 && <Chip label={`${pending} ⏳`} size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }} />}

          {/* Mini progress */}
          <Box width={70} ml={1}>
            <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: "hidden" }}>
              <Box sx={{
                height: "100%", width: `${pct}%`, borderRadius: 3,
                background: pct === 100 ? theme.palette.success.main : damaged > 0 ? theme.palette.warning.main : theme.palette.info.main,
                transition: "width .4s ease",
              }} />
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem" }}>{pct}%</Typography>
          </Box>

          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Items */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box p={2}>
          {items.map(item => (
            <ItemRow
              key={item.delivery_item_id}
              item={item}
              onRefresh={onRefresh}
              deliveryStatus={deliveryStatus}
              disabled={disabled}
            />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
};

// ─── Main Modal ──────────────────────────────────────────────────
const DriverDeliveryDetailsModal = ({ open, deliveryId, onClose, onUpdated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [actionBusy,  setActionBusy]  = useState(false);
  const [error,       setError]       = useState("");
  const [successMsg,  setSuccessMsg]  = useState("");
  const [tab,         setTab]         = useState(0);

  // Start delivery state
  const [departureTime, setDepartureTime] = useState(
    new Date().toISOString().slice(0, 16)  // datetime-local format
  );

  const fetchDetails = useCallback(async () => {
    if (!deliveryId) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/api/driver-delivery/assignment/${deliveryId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load delivery details");
    } finally { setLoading(false); }
  }, [deliveryId]);

  useEffect(() => {
    if (open && deliveryId) {
      fetchDetails();
      setTab(0);
      setSuccessMsg("");
      setError("");
    }
  }, [open, deliveryId, fetchDetails]);

  // ─── Group items by order ──────────────────────────────────────
  const groupedByOrder = React.useMemo(() => {
    if (!data?.items?.length) return [];
    const map = new Map();
    data.items.forEach(item => {
      if (!map.has(item.order_id)) {
        map.set(item.order_id, {
          order: {
            order_id: item.order_id,
            order_reference: item.order_reference,
            customer_name: item.customer_name,
            customer_address: item.customer_address,
            pincode: item.pincode,
          },
          items: [],
        });
      }
      map.get(item.order_id).items.push(item);
    });
    return Array.from(map.values());
  }, [data]);

  const items          = data?.items || [];
  const assignment     = data?.assignment;
  const currentStatus  = assignment?.status;
  const isFinalStatus  = ["DELIVERED", "PARTIALLY_DELIVERED"].includes(currentStatus);
  const totalItems     = items.length;
  const deliveredCount = items.filter(i => i.delivery_status === "DELIVERED").length;
  const damagedCount   = items.filter(i => i.delivery_status === "DAMAGED").length;
  const pendingCount   = items.filter(i => i.delivery_status === "PENDING").length;
  const allResolved    = totalItems > 0 && pendingCount === 0;
  const overallPct     = totalItems > 0 ? Math.round(((deliveredCount + damagedCount) / totalItems) * 100) : 0;

  const handleRefresh = () => { fetchDetails(); onUpdated?.(); };

  // ─── Start Delivery ────────────────────────────────────────────
  const handleStartDelivery = async () => {
    setActionBusy(true); setError("");
    try {
      await api.patch(`/api/driver-delivery/start/${deliveryId}`, { departure_time: departureTime });
      setSuccessMsg("Delivery started! Status updated to In Transit.");
      handleRefresh();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start delivery");
    } finally { setActionBusy(false); }
  };

  // ─── Request Approval ──────────────────────────────────────────
  const handleRequestApproval = async () => {
    setActionBusy(true); setError("");
    try {
      await api.patch(`/api/driver-delivery/request-approval/${deliveryId}`);
      setSuccessMsg("Approval request sent to supervisor! They will verify and finalize.");
      handleRefresh();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send approval request");
    } finally { setActionBusy(false); }
  };

  const pColor = theme.palette.primary.main;
  const sColor = theme.palette.secondary.main;

  return (
    <Dialog
      open={open}
      onClose={actionBusy ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, bgcolor: "background.paper", maxHeight: "94vh", border: `1px solid ${theme.palette.divider}`, overflow: "hidden" },
      }}
    >
      {/* Accent bar */}
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />

      {/* Title */}
      <DialogTitle sx={{ pb: 0 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: alpha(pColor, 0.1), border: `1px solid ${alpha(pColor, 0.2)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LocalShipping sx={{ color: pColor, fontSize: 21 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
                Delivery #{deliveryId}
              </Typography>
              {assignment && <StatusBadge status={assignment.status} meta={DELIVERY_STATUS_META} />}
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh} disabled={loading || actionBusy}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} disabled={actionBusy}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1.5, "& .MuiTab-root": { fontWeight: 700, fontSize: "0.8rem", textTransform: "none" } }}>
          <Tab label="Overview" />
          <Tab label={`Orders & Items${totalItems > 0 ? ` (${totalItems})` : ""}`} />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2, overflowX: "hidden" }}>
        {loading && !data ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress color="primary" /></Box>
        ) : !assignment ? (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error || "Failed to load"}</Alert>
        ) : (
          <>
            {error      && <Alert severity="error"   sx={{ mt: 2, mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
            {successMsg && <Fade in><Alert severity="success" sx={{ mt: 2, mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg("")}>{successMsg}</Alert></Fade>}

            {/* ══ TAB 0: OVERVIEW ══ */}
            {tab === 0 && (
              <Box mt={2}>
                {/* Info Cards */}
                <Grid container spacing={2} mb={3}>
                  {/* Vehicle */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.info.main, isDark ? 0.08 : 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <DirectionsCar sx={{ fontSize: 15, color: "info.main" }} />
                        </Box>
                        <Typography variant="caption" fontWeight={800} sx={{ color: "info.main", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Your Vehicle</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{assignment.vehicle_number}</Typography>
                      <Typography variant="caption" color="text.secondary">{assignment.vehicle_type}{assignment.capacity ? ` · Capacity: ${assignment.capacity}` : ""}</Typography>
                      {assignment.is_temporary && <Chip label="Temporary" size="small" color="warning" sx={{ mt: 1, height: 18, fontSize: "0.6rem" }} />}
                    </Box>
                  </Grid>

                  {/* Supervisor */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.08 : 0.05), border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}` }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Person sx={{ fontSize: 15, color: "secondary.main" }} />
                        </Box>
                        <Typography variant="caption" fontWeight={800} sx={{ color: "secondary.main", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Supervisor</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{assignment.supervisor_name}</Typography>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Phone sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography variant="caption" color="text.secondary">{assignment.supervisor_phone}</Typography>
                      </Box>
                      {assignment.supervisor_email && (
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>{assignment.supervisor_email}</Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* Assignment Info */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(pColor, isDark ? 0.07 : 0.04), border: `1px solid ${alpha(pColor, 0.18)}` }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(pColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Info sx={{ fontSize: 15, color: pColor }} />
                        </Box>
                        <Typography variant="caption" fontWeight={800} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Assignment</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        <CalendarToday sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(assignment.assigned_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                        <Chip label={`${groupedByOrder.length} orders`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                        <Chip label={`${totalItems} items`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {/* Overall progress */}
                <Box sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, isDark ? 0.04 : 0.02), border: `1px solid ${theme.palette.divider}` }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Typography variant="subtitle2" fontWeight={700}>Delivery Progress</Typography>
                    <Box display="flex" gap={1.5} flexWrap="wrap">
                      {[
                        { count: deliveredCount, label: "Delivered", color: "success.main" },
                        { count: damagedCount,   label: "Damaged",   color: "error.main" },
                        { count: pendingCount,   label: "Pending",   color: "warning.main" },
                      ].map(({ count, label, color }) => count > 0 && (
                        <Box key={label} display="flex" alignItems="center" gap={0.5}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                          <Typography variant="caption" color="text.secondary">{count} {label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  {/* Segmented progress bar */}
                  <Box sx={{ height: 10, borderRadius: 5, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: "hidden", display: "flex" }}>
                    {deliveredCount > 0 && (
                      <Box sx={{ width: `${(deliveredCount / totalItems) * 100}%`, bgcolor: "success.main", transition: "width .5s ease" }} />
                    )}
                    {damagedCount > 0 && (
                      <Box sx={{ width: `${(damagedCount / totalItems) * 100}%`, bgcolor: "error.main", transition: "width .5s ease" }} />
                    )}
                  </Box>
                  <Box display="flex" justifyContent="space-between" mt={0.5}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.62rem" }}>0%</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: overallPct === 100 ? "success.main" : "text.secondary", fontSize: "0.72rem" }}>
                      {overallPct}% resolved
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.62rem" }}>100%</Typography>
                  </Box>
                </Box>

                {/* START DELIVERY panel (only when ASSIGNED) */}
                {currentStatus === "ASSIGNED" && (
                  <Fade in>
                    <Box sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`, bgcolor: alpha(theme.palette.warning.main, isDark ? 0.07 : 0.04) }}>
                      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <LocalShipping sx={{ color: "warning.main", fontSize: 20 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>Ready to Start?</Typography>
                          <Typography variant="caption" color="text.secondary">Set your departure time, load the vehicle, and begin delivery</Typography>
                        </Box>
                      </Box>

                      <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap">
                        <TextField
                          type="datetime-local"
                          label="Departure Time"
                          size="small"
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ flex: 1, minWidth: 220 }}
                        />
                        <Button
                          variant="contained" color="warning"
                          startIcon={actionBusy ? <CircularProgress size={16} color="inherit" /> : <LocalShipping />}
                          onClick={handleStartDelivery}
                          disabled={actionBusy}
                          sx={{ borderRadius: 2, fontWeight: 800, px: 3, color: "white", whiteSpace: "nowrap",
                            boxShadow: `0 4px 14px ${alpha(theme.palette.warning.main, 0.4)}` }}
                        >
                          {actionBusy ? "Starting…" : "Start Delivery"}
                        </Button>
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* IN_TRANSIT + all resolved → request approval */}
                {currentStatus === "IN_TRANSIT" && allResolved && (
                  <Fade in>
                    <Alert severity="success" icon={<DoneAll />} sx={{ borderRadius: 2, mb: 2 }}>
                      All items are updated! Send an approval request to your supervisor.
                    </Alert>
                  </Fade>
                )}
                {currentStatus === "IN_TRANSIT" && !allResolved && (
                  <Alert severity="info" icon={<Info />} sx={{ borderRadius: 2 }}>
                    Go to the <strong>Orders & Items</strong> tab to update each item status and upload proof.
                    {pendingCount > 0 && <> · <strong>{pendingCount}</strong> item(s) still pending.</>}
                  </Alert>
                )}

                {isFinalStatus && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                    This delivery is <strong>{DELIVERY_STATUS_META[currentStatus]?.label}</strong>. No further action required.
                  </Alert>
                )}
              </Box>
            )}

            {/* ══ TAB 1: ORDERS & ITEMS ══ */}
            {tab === 1 && (
              <Box mt={2}>
                {currentStatus === "ASSIGNED" && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    Start the delivery first before updating item statuses.
                  </Alert>
                )}
                {groupedByOrder.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>No items found</Typography>
                ) : (
                  groupedByOrder.map(({ order, items: orderItems }) => (
                    <OrderGroup
                      key={order.order_id}
                      order={order}
                      items={orderItems}
                      onRefresh={handleRefresh}
                      deliveryStatus={currentStatus}
                      disabled={currentStatus === "ASSIGNED"}
                    />
                  ))
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${theme.palette.divider}`, gap: 1.5, flexWrap: "wrap" }}>
        <Box flex={1}>
          {currentStatus === "IN_TRANSIT" && !allResolved && pendingCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              <strong>{pendingCount}</strong> item{pendingCount > 1 ? "s" : ""} still pending — update all items to request approval
            </Typography>
          )}
          {isFinalStatus && (
            <Typography variant="caption" color="text.disabled">Delivery finalized</Typography>
          )}
        </Box>

        <Button variant="outlined" onClick={onClose} disabled={actionBusy} sx={{ borderRadius: 2 }}>
          Close
        </Button>

        {/* Request Approval button — only when IN_TRANSIT + all resolved */}
        {currentStatus === "IN_TRANSIT" && allResolved && (
          <Button
            variant="contained" color="primary"
            startIcon={actionBusy ? <CircularProgress size={16} color="inherit" /> : <MarkEmailRead />}
            onClick={handleRequestApproval}
            disabled={actionBusy}
            sx={{
              borderRadius: 2, fontWeight: 700, px: 3,
              boxShadow: `0 4px 14px ${alpha(pColor, 0.35)}`,
              "&:hover": { boxShadow: `0 6px 20px ${alpha(pColor, 0.5)}` },
            }}
          >
            {actionBusy ? "Sending…" : "Request Approval"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DriverDeliveryDetailsModal;