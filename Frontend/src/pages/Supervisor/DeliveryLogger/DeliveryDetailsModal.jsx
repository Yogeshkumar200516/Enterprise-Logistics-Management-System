// src/pages/Supervisor/DeliveryDetailsModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, IconButton, CircularProgress,
  Alert, Grid, Avatar, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Paper,
  LinearProgress, Select, MenuItem, FormControl, useTheme, alpha,
  Collapse, Fade,
} from "@mui/material";
import {
  Close, LocalShipping, Person, Verified, Assignment,
  CheckCircle, Cancel, HourglassEmpty, BrokenImage,
  DirectionsCar, Phone, LocationOn, CalendarToday,
  ExpandMore, ExpandLess, Route, SplitscreenOutlined,
  Schedule, DoneAll, Warning, Info, Refresh,
} from "@mui/icons-material";
import api from "../../../context/Api";

// ─── Constants ──────────────────────────────────────────────────
const DELIVERY_STATUS_META = {
  ASSIGNED:            { label: "Assigned",    colorKey: "info",      Icon: Schedule },
  IN_TRANSIT:          { label: "In Transit",  colorKey: "warning",   Icon: Route },
  DELIVERED:           { label: "Delivered",   colorKey: "success",   Icon: CheckCircle },
  PARTIALLY_DELIVERED: { label: "Partially Delivered", colorKey: "secondary", Icon: SplitscreenOutlined },
};

const ITEM_STATUS_META = {
  PENDING:   { label: "Pending",   colorKey: "warning", Icon: HourglassEmpty },
  DELIVERED: { label: "Delivered", colorKey: "success", Icon: CheckCircle },
  DAMAGED:   { label: "Damaged",   colorKey: "error",   Icon: BrokenImage },
};

// ─── Helper: StatusBadge ────────────────────────────────────────
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
      borderRadius: "8px",
      background: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.28)}`,
      color, fontWeight: 700, whiteSpace: "nowrap",
      fontSize: size === "small" ? "0.67rem" : "0.75rem",
    }}>
      <Icon sx={{ fontSize: size === "small" ? 12 : 14 }} />
      {cfg.label}
    </Box>
  );
};

// ─── OrderGroup: collapsible order card with its items ──────────
const OrderGroup = ({ order, items, onItemStatusChange, disabled }) => {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === "dark";
  const [open, setOpen] = useState(true);

  const delivered = items.filter(i => i.delivery_status === "DELIVERED").length;
  const damaged   = items.filter(i => i.delivery_status === "DAMAGED").length;
  const pending   = items.filter(i => i.delivery_status === "PENDING").length;
  const total     = items.length;
  const pct       = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const progColor = pct === 100 ? theme.palette.success.main
    : damaged > 0 ? theme.palette.error.main
    : theme.palette.warning.main;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.5) : "background.paper",
      }}
    >
      {/* Order Header */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          px: 2.5, py: 1.8,
          display: "flex", alignItems: "center", gap: 2,
          cursor: "pointer",
          bgcolor: isDark
            ? alpha(theme.palette.primary.main, 0.06)
            : alpha(theme.palette.primary.main, 0.03),
          borderBottom: open ? `1px solid ${theme.palette.divider}` : "none",
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.07) },
          transition: "background .15s",
        }}
      >
        {/* Order ref */}
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2" fontWeight={800} color="primary.main"
              sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.88rem" }}>
              {order.order_reference}
            </Typography>
            <Typography variant="caption" color="text.secondary">·</Typography>
            <Typography variant="body2" fontWeight={600} noWrap>{order.customer_name}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
            <LocationOn sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {order.customer_address}{order.pincode ? ` — ${order.pincode}` : ""}
            </Typography>
          </Box>
        </Box>

        {/* Mini stats */}
        <Box display="flex" gap={1} alignItems="center" flexShrink={0}>
          {delivered > 0 && (
            <Chip label={`${delivered} ✓`} size="small" color="success" variant="outlined"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }} />
          )}
          {damaged > 0 && (
            <Chip label={`${damaged} ✗`} size="small" color="error" variant="outlined"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }} />
          )}
          {pending > 0 && (
            <Chip label={`${pending} ⏳`} size="small" color="warning" variant="outlined"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }} />
          )}
        </Box>

        {/* Progress */}
        <Box width={80} flexShrink={0}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.63rem" }}>
            {pct}%
          </Typography>
          <LinearProgress
            variant="determinate" value={pct}
            sx={{
              height: 5, borderRadius: 3, mt: 0.3,
              bgcolor: alpha(progColor, 0.15),
              "& .MuiLinearProgress-bar": { bgcolor: progColor, borderRadius: 3 },
            }}
          />
        </Box>

        <IconButton size="small" sx={{ color: "text.secondary", ml: 0.5 }}>
          {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      {/* Items Table */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Product", "Qty", "Fragile", "Status", "Proof", "Update"].map(h => (
                <TableCell key={h} sx={{
                  bgcolor: isDark ? alpha(theme.palette.background.default, 0.4) : alpha(theme.palette.text.primary, 0.03),
                  color: "text.secondary", fontWeight: 700, fontSize: "0.65rem",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.delivery_item_id}
                sx={{ "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.03) }, transition: "background .12s" }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
                    {item.product_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={item.quantity} size="small" variant="outlined"
                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                </TableCell>
                <TableCell>
                  {item.is_fragile
                    ? <Chip icon={<BrokenImage sx={{ fontSize: "11px !important" }} />}
                        label="Fragile" size="small" color="error"
                        sx={{ height: 20, fontSize: "0.63rem" }} />
                    : <Typography variant="caption" color="text.disabled">—</Typography>
                  }
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.delivery_status} meta={ITEM_STATUS_META} size="small" />
                </TableCell>
                <TableCell>
  {item.proof_url ? (
    <Tooltip title="Click to view proof">
      <Box
        component="a"
        href={`http://localhost:5000${item.proof_url}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.4),
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`
          }
        }}
      >
        <Box
          component="img"
          src={`http://localhost:5000${item.proof_url}`}
          alt="Proof"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </Box>
    </Tooltip>
  ) : (
    <Typography
      variant="caption"
      color="text.disabled"
      sx={{ fontSize: "0.72rem", fontStyle: "italic" }}
    >
      No proof added
    </Typography>
  )}
</TableCell>
                <TableCell>
                  {item.delivery_status !== "PENDING" ? (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                      {item.delivery_status === "DELIVERED" && item.delivered_at
                        ? new Date(item.delivered_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "Updated"}
                    </Typography>
                  ) : (
                    <FormControl size="small" disabled={disabled}>
                      <Select
                        value={item.delivery_status}
                        onChange={(e) => onItemStatusChange(item.delivery_item_id, e.target.value)}
                        sx={{
                          fontSize: "0.75rem", height: 28, minWidth: 110,
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                        }}
                      >
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="DELIVERED">Mark Delivered</MenuItem>
                        <MenuItem value="DAMAGED">Mark Damaged</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </Paper>
  );
};

// ─── Main Modal ──────────────────────────────────────────────────
const DeliveryDetailsModal = ({ open, deliveryId, onClose, onStatusUpdated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [data,         setData]         = useState(null);   // { assignment, items }
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [itemSaving,   setItemSaving]   = useState(false);
  const [error,        setError]        = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [localItems,   setLocalItems]   = useState([]);     // local copy for optimistic UI

  // ─── Fetch ─────────────────────────────────────────────────────
  const fetchDetails = useCallback(async () => {
    if (!deliveryId) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/api/delivery-logger/assignment/${deliveryId}`);
      setData(res.data);
      setLocalItems(res.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assignment details");
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    if (open && deliveryId) fetchDetails();
  }, [open, deliveryId, fetchDetails]);

  // ─── Group items by order ──────────────────────────────────────
  const groupedByOrder = React.useMemo(() => {
    if (!localItems.length) return [];
    const map = new Map();
    localItems.forEach(item => {
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
  }, [localItems]);

  // ─── Derived status summary ────────────────────────────────────
  const totalItems     = localItems.length;
  const deliveredCount = localItems.filter(i => i.delivery_status === "DELIVERED").length;
  const damagedCount   = localItems.filter(i => i.delivery_status === "DAMAGED").length;
  const pendingCount   = localItems.filter(i => i.delivery_status === "PENDING").length;
  const allDone        = totalItems > 0 && pendingCount === 0;
  const allDelivered   = totalItems > 0 && deliveredCount === totalItems;
  const pct            = totalItems > 0 ? Math.round(((deliveredCount + damagedCount) / totalItems) * 100) : 0;

  const currentStatus  = data?.assignment?.status;
  const isFinalStatus  = currentStatus === "DELIVERED" || currentStatus === "PARTIALLY_DELIVERED";

  // ─── Update single item status ─────────────────────────────────
  const handleItemStatusChange = async (deliveryItemId, newStatus) => {
    setItemSaving(true); setError("");
    // Optimistic update
    setLocalItems(prev =>
      prev.map(i =>
        i.delivery_item_id === deliveryItemId
          ? { ...i, delivery_status: newStatus, delivered_at: newStatus === "DELIVERED" ? new Date().toISOString() : i.delivered_at }
          : i
      )
    );
    try {
      await api.patch(`/api/delivery-logger/update-item-status/${deliveryItemId}`, { status: newStatus });
    } catch (err) {
      // Rollback on failure
      setLocalItems(prev =>
        prev.map(i => i.delivery_item_id === deliveryItemId ? { ...i, delivery_status: "PENDING", delivered_at: null } : i)
      );
      setError(err.response?.data?.message || "Failed to update item status");
    } finally {
      setItemSaving(false);
    }
  };

  // ─── Mark overall delivery status ─────────────────────────────
  const handleMarkDelivery = async (status) => {
    setSaving(true); setError("");
    try {
      await api.patch(`/api/delivery-logger/update-status/${deliveryId}`, { status });
      setSuccessMsg(
        status === "DELIVERED"
          ? "Delivery marked as Delivered! Vehicle & driver are now available."
          : status === "PARTIALLY_DELIVERED"
          ? "Delivery marked as Partially Delivered. Vehicle & driver are now available."
          : `Status updated to ${status}`
      );
      await fetchDetails();
      onStatusUpdated?.();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update delivery status");
    } finally {
      setSaving(false);
    }
  };

  // ─── Determine which action buttons to show ────────────────────
  const canMarkInTransit    = currentStatus === "ASSIGNED";
  const canMarkDelivered    = !isFinalStatus && allDelivered;
  const canMarkPartial      = !isFinalStatus && allDone && !allDelivered && damagedCount > 0;
  const canMarkAnyCompleted = !isFinalStatus && allDone;

  const pColor = theme.palette.primary.main;
  const sColor = theme.palette.secondary.main;

  const assignment = data?.assignment;

  return (
    <Dialog
      open={open}
      onClose={saving || itemSaving ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4, bgcolor: "background.paper", maxHeight: "94vh",
          border: `1px solid ${theme.palette.divider}`, overflow: "hidden",
        },
      }}
    >
      {/* Accent bar */}
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />

      {/* Title */}
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: alpha(pColor, 0.1), border: `1px solid ${alpha(pColor, 0.2)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Assignment sx={{ color: pColor, fontSize: 21 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", color: "text.primary", letterSpacing: "-0.02em" }}>
                Delivery #{deliveryId}
              </Typography>
              {assignment && (
                <Box display="flex" alignItems="center" gap={1}>
                  <StatusBadge status={assignment.status} meta={DELIVERY_STATUS_META} />
                </Box>
              )}
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchDetails} disabled={loading || saving}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} disabled={saving}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2, overflowX: "hidden" }}>
        {(loading && !data) ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress color="primary" />
          </Box>
        ) : !assignment ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error || "Failed to load"}</Alert>
        ) : (
          <>
            {/* Alerts */}
            {error      && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
            {successMsg && <Fade in><Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg("")}>{successMsg}</Alert></Fade>}

            {/* Item Saving indicator */}
            {itemSaving && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* ── Info Cards Row ── */}
            <Grid container spacing={2} mb={3}>
              {/* Vehicle */}
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: isDark ? alpha(theme.palette.info.main, 0.07) : alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DirectionsCar sx={{ fontSize: 16, color: "info.main" }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: "info.main", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.62rem" }}>Vehicle</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{assignment.vehicle_number}</Typography>
                  <Typography variant="caption" color="text.secondary">{assignment.vehicle_type}{assignment.capacity ? ` · Cap: ${assignment.capacity}` : ""}</Typography>
                </Box>
              </Grid>

              {/* Driver */}
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: isDark ? alpha(theme.palette.success.main, 0.07) : alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Person sx={{ fontSize: 16, color: "success.main" }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: "success.main", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.62rem" }}>Driver</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{assignment.driver_name}</Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Phone sx={{ fontSize: 12, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">{assignment.driver_phone}</Typography>
                  </Box>
                  {assignment.driver_email && (
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>{assignment.driver_email}</Typography>
                  )}
                </Box>
              </Grid>

              {/* Meta */}
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: isDark ? alpha(pColor, 0.07) : alpha(pColor, 0.04), border: `1px solid ${alpha(pColor, 0.18)}` }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(pColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Info sx={{ fontSize: 16, color: pColor }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.62rem" }}>Assignment Info</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Person sx={{ fontSize: 12, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">Supervisor: {assignment.supervisor_name}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Phone sx={{ fontSize: 12, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">{assignment.supervisor_phone}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarToday sx={{ fontSize: 12, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(assignment.assigned_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* ── Overall Progress Bar ── */}
            <Box sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.text.primary, 0.02), border: `1px solid ${theme.palette.divider}` }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>Delivery Progress</Typography>
                <Box display="flex" gap={1.5}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                    <Typography variant="caption" color="text.secondary">{deliveredCount} Delivered</Typography>
                  </Box>
                  {damagedCount > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main" }} />
                      <Typography variant="caption" color="text.secondary">{damagedCount} Damaged</Typography>
                    </Box>
                  )}
                  {pendingCount > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main" }} />
                      <Typography variant="caption" color="text.secondary">{pendingCount} Pending</Typography>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.disabled">({totalItems} total items)</Typography>
                </Box>
              </Box>
              {/* Segmented bar */}
              <Box sx={{ height: 10, borderRadius: 5, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: "hidden", display: "flex" }}>
                {deliveredCount > 0 && (
                  <Box sx={{ width: `${(deliveredCount / totalItems) * 100}%`, bgcolor: "success.main", transition: "width .5s ease" }} />
                )}
                {damagedCount > 0 && (
                  <Box sx={{ width: `${(damagedCount / totalItems) * 100}%`, bgcolor: "error.main", transition: "width .5s ease" }} />
                )}
              </Box>
              <Box display="flex" justifyContent="space-between" mt={0.5}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.63rem" }}>0%</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: pct === 100 ? "success.main" : "text.secondary", fontSize: "0.72rem" }}>{pct}% completed</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.63rem" }}>100%</Typography>
              </Box>
            </Box>

            {/* ── Action Banner (when all done) ── */}
            {canMarkAnyCompleted && !isFinalStatus && (
              <Fade in>
                <Alert
                  severity={allDelivered ? "success" : "warning"}
                  icon={allDelivered ? <DoneAll /> : <Warning />}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  {allDelivered
                    ? "All items have been delivered! You can now mark this delivery as complete."
                    : `${damagedCount} item(s) damaged, ${deliveredCount} delivered. Mark as Partially Delivered to complete.`
                  }
                </Alert>
              </Fade>
            )}

            {/* ── Status Update (in progress) ── */}
            {!isFinalStatus && (
              <Box
                sx={{
                  mb: 3, p: 2, borderRadius: 3,
                  bgcolor: isDark ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.warning.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>Update Delivery Status</Typography>
                  <Typography variant="caption" color="text.secondary">Move the overall delivery through its lifecycle</Typography>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {canMarkInTransit && (
                    <Button variant="outlined" color="warning" size="small"
                      startIcon={saving ? <CircularProgress size={14} /> : <Route />}
                      onClick={() => handleMarkDelivery("IN_TRANSIT")} disabled={saving}
                      sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.78rem" }}>
                      Mark In Transit
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* ── Completed Status Info ── */}
            {isFinalStatus && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3, borderRadius: 2 }}>
                This delivery is <strong>{DELIVERY_STATUS_META[currentStatus]?.label}</strong>. Vehicle and driver have been released.
              </Alert>
            )}

            {/* ── Orders + Items ── */}
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, fontFamily: "'Sora',sans-serif" }}>
              Orders & Items
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({groupedByOrder.length} orders)
              </Typography>
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              {groupedByOrder.map(({ order, items }) => (
                <OrderGroup
                  key={order.order_id}
                  order={order}
                  items={items}
                  onItemStatusChange={handleItemStatusChange}
                  disabled={isFinalStatus || saving}
                />
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${theme.palette.divider}`, gap: 1.5, flexWrap: "wrap" }}>
        {/* Left side info */}
        <Box flex={1}>
          {!isFinalStatus && pendingCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              <strong>{pendingCount}</strong> item{pendingCount > 1 ? "s" : ""} still pending — update each item status above
            </Typography>
          )}
          {isFinalStatus && (
            <Typography variant="caption" color="text.disabled">
              This delivery has been finalized
            </Typography>
          )}
        </Box>

        <Button variant="outlined" onClick={onClose} disabled={saving} sx={{ borderRadius: 2 }}>
          Close
        </Button>

        {/* Mark Partially Delivered */}
        {canMarkPartial && (
          <Tooltip title="Some items are damaged — mark as partially delivered">
            <Button
              variant="contained" color="secondary" size="medium"
              startIcon={saving ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <SplitscreenOutlined />}
              onClick={() => handleMarkDelivery("PARTIALLY_DELIVERED")}
              disabled={saving}
              sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
            >
              Mark Partially Delivered
            </Button>
          </Tooltip>
        )}

        {/* Mark Delivered (only if ALL items are DELIVERED) */}
        {canMarkDelivered && (
          <Button
            variant="contained" color="success" size="medium"
            startIcon={saving ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <DoneAll />}
            onClick={() => handleMarkDelivery("DELIVERED")}
            disabled={saving}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3, boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.4)}`, "&:hover": { boxShadow: `0 6px 20px ${alpha(theme.palette.success.main, 0.55)}` } }}
          >
            {saving ? "Saving…" : "Mark as Delivered"}
          </Button>
        )}

        {/* When all done but not yet finalized and they're all damaged (edge case) */}
        {canMarkAnyCompleted && !canMarkDelivered && !canMarkPartial && !isFinalStatus && (
          <Button
            variant="contained" color="warning" size="medium"
            startIcon={saving ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <SplitscreenOutlined />}
            onClick={() => handleMarkDelivery("PARTIALLY_DELIVERED")}
            disabled={saving}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
          >
            Complete Delivery
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeliveryDetailsModal;
