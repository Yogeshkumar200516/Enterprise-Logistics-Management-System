// src/pages/Supervisor/ScrapLogDetailsModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, IconButton, CircularProgress,
  Alert, Grid, Divider, FormControl, InputLabel, Select, MenuItem,
  Tooltip, Fade, useTheme, alpha,
} from "@mui/material";
import {
  Close, Recycling, Person, CheckCircle, Business,
  ShoppingCart, DirectionsCar, Phone, CalendarToday,
  HourglassEmpty, Cancel as CancelIcon, Refresh, Edit,
  LocationOn, Info,
} from "@mui/icons-material";
import api from "../../../context/Api";

const STATUS_META = {
  COLLECTED: { label: "Collected", colorKey: "info",    Icon: HourglassEmpty },
  APPROVED:  { label: "Approved",  colorKey: "success", Icon: CheckCircle },
  REJECTED:  { label: "Rejected",  colorKey: "error",   Icon: CancelIcon },
};

const StatusBadge = ({ status }) => {
  const theme = useTheme();
  const cfg   = STATUS_META[status];
  if (!cfg) return <Typography variant="caption">{status}</Typography>;
  const color = theme.palette[cfg.colorKey]?.main;
  const Icon  = cfg.Icon;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, px: 1.4, py: 0.45, borderRadius: "8px", background: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.28)}`, color, fontWeight: 700, fontSize: "0.75rem" }}>
      <Icon sx={{ fontSize: 14 }} /> {cfg.label}
    </Box>
  );
};

const ScrapLogDetailsModal = ({ open, scrapId, onClose, onStatusUpdated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pColor = theme.palette.success.main;
  const sColor = theme.palette.info.main;

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newStatus,  setNewStatus]  = useState("");

  const fetchDetails = useCallback(async () => {
    if (!scrapId) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/api/scrap-log/log/${scrapId}`);
      setData(res.data.log);
      setNewStatus(res.data.log?.status || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load scrap log details");
    } finally { setLoading(false); }
  }, [scrapId]);

  useEffect(() => {
    if (open && scrapId) fetchDetails();
  }, [open, scrapId, fetchDetails]);

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === data?.status) return;
    setSaving(true); setError("");
    try {
      await api.patch(`/api/scrap-log/update-status/${scrapId}`, { status: newStatus });
      setSuccessMsg(`Status updated to ${STATUS_META[newStatus]?.label || newStatus}!`);
      await fetchDetails();
      onStatusUpdated?.();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally { setSaving(false); }
  };

  const fmt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const isFinal = data?.status === "APPROVED" || data?.status === "REJECTED";

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 4, bgcolor: "background.paper", maxHeight: "90vh", border: `1px solid ${theme.palette.divider}`, overflow: "hidden" } }}>
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />

      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: alpha(pColor, 0.1), border: `1px solid ${alpha(pColor, 0.2)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Recycling sx={{ color: pColor, fontSize: 21 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
                Scrap Log #{scrapId}
              </Typography>
              {data && <StatusBadge status={data.status} />}
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh"><IconButton size="small" onClick={fetchDetails} disabled={loading || saving}><Refresh fontSize="small" /></IconButton></Tooltip>
            <IconButton size="small" onClick={onClose} disabled={saving}><Close fontSize="small" /></IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        {loading && !data
          ? <Box display="flex" justifyContent="center" py={6}><CircularProgress color="success" /></Box>
          : !data
          ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error || "Failed to load"}</Alert>
          : (
            <>
              {error      && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
              {successMsg && <Fade in><Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg("")}>{successMsg}</Alert></Fade>}

              {/* Scrap Info */}
              <Box sx={{ p: 2, mb: 2.5, borderRadius: 3, bgcolor: isDark ? alpha(pColor, 0.07) : alpha(pColor, 0.04), border: `1px solid ${alpha(pColor, 0.18)}` }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(pColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Recycling sx={{ fontSize: 15, color: pColor }} />
                  </Box>
                  <Typography variant="caption" fontWeight={800} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Scrap Info</Typography>
                </Box>
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">Type</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{data.scrap_type}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Quantity</Typography>
                    <Typography variant="body1" fontWeight={800}>{data.quantity}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Source</Typography>
                    <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
                      {data.source === "INTERNAL" ? <Business sx={{ fontSize: 15, color: "text.secondary" }} /> : <ShoppingCart sx={{ fontSize: 15, color: "secondary.main" }} />}
                      <Typography variant="body2" fontWeight={700}>{data.source === "INTERNAL" ? "Internal" : "Customer Exchange"}</Typography>
                    </Box>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(data.created_at)}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Vehicle & Driver */}
              <Grid container spacing={2} mb={2.5}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: isDark ? alpha(sColor, 0.07) : alpha(sColor, 0.04), border: `1px solid ${alpha(sColor, 0.18)}` }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: alpha(sColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <DirectionsCar sx={{ fontSize: 14, color: sColor }} />
                      </Box>
                      <Typography variant="caption" fontWeight={800} sx={{ color: sColor, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Vehicle</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{data.vehicle_number || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{data.vehicle_type || ""}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: isDark ? alpha(theme.palette.secondary.main, 0.07) : alpha(theme.palette.secondary.main, 0.04), border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}` }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Person sx={{ fontSize: 14, color: "secondary.main" }} />
                      </Box>
                      <Typography variant="caption" fontWeight={800} sx={{ color: "secondary.main", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Driver</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{data.collected_by_name}</Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Phone sx={{ fontSize: 12, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">{data.collector_phone}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Customer Exchange Info */}
              {data.source === "CUSTOMER" && data.order_reference && (
                <Box sx={{ p: 2, mb: 2.5, borderRadius: 3, bgcolor: isDark ? alpha(theme.palette.info.main, 0.07) : alpha(theme.palette.info.main, 0.04), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Info sx={{ fontSize: 14, color: "info.main" }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: "info.main", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.61rem" }}>Linked Delivery</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="primary.main">{data.order_reference}</Typography>
                  <Typography variant="body2">{data.customer_name}</Typography>
                  {data.customer_address && (
                    <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
                      <LocationOn sx={{ fontSize: 12, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">{data.customer_address}</Typography>
                    </Box>
                  )}
                  {data.exchanged_product && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Product: <strong>{data.exchanged_product}</strong>
                    </Typography>
                  )}
                </Box>
              )}

              {/* Status Update */}
              {!isFinal && (
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: isDark ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.warning.main, 0.04), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                  <Typography variant="body2" fontWeight={700} mb={1.5}>Update Status</Typography>
                  <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>New Status</InputLabel>
                      <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="New Status"
                        sx={{ borderRadius: 2, "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" } }}>
                        <MenuItem value="COLLECTED">Collected</MenuItem>
                        <MenuItem value="APPROVED">Approved</MenuItem>
                        <MenuItem value="REJECTED">Rejected</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="contained" color="success"
                      startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Edit />}
                      onClick={handleUpdateStatus} disabled={saving || newStatus === data.status}
                      sx={{ borderRadius: 2, fontWeight: 700 }}>
                      {saving ? "Saving…" : "Update"}
                    </Button>
                  </Box>
                </Box>
              )}

              {isFinal && (
                <Alert severity={data.status === "APPROVED" ? "success" : "error"} sx={{ borderRadius: 2 }}>
                  This scrap log is <strong>{STATUS_META[data.status]?.label}</strong>. No further changes allowed.
                </Alert>
              )}
            </>
          )
        }
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button variant="outlined" onClick={onClose} disabled={saving} sx={{ borderRadius: 2 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScrapLogDetailsModal;