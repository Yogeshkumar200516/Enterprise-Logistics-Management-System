// src/pages/Supervisor/AddTempVehiclesModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, MenuItem, Typography,
  IconButton, Alert, CircularProgress, Grid,
  useTheme, alpha,
} from "@mui/material";
import { Close, DirectionsCar } from "@mui/icons-material";
import api from "../../../context/Api";

const EMPTY = {
  vehicle_number: "",
  vehicle_type:   "",
  capacity:       "",
  status:         "AVAILABLE",
};

const AddTempVehicleModal = ({ open, handleClose, editData, refresh, onSuccess }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.info.main;
  const sColor = theme.palette.success.main;

  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // ── Populate on open ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setError("");
    if (editData) {
      setForm({
        vehicle_number: editData.vehicle_number || "",
        vehicle_type:   editData.vehicle_type   || "",
        capacity:       editData.capacity       || "",
        status:         editData.status         || "AVAILABLE",
      });
    } else {
      setForm(EMPTY);
    }
  }, [editData, open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.vehicle_number.trim()) { setError("Vehicle number is required");  return; }
    if (!form.vehicle_type.trim())   { setError("Vehicle type is required");    return; }
    if (!form.capacity)              { setError("Capacity is required");        return; }
    if (Number(form.capacity) <= 0) { setError("Capacity must be greater than 0"); return; }

    setSaving(true); setError("");
    try {
      if (editData) {
        await api.put(`/api/supervisor/temporary-vehicles/${editData.vehicle_id}`, {
          vehicle_number: form.vehicle_number.trim(),
          vehicle_type:   form.vehicle_type.trim(),
          capacity:       Number(form.capacity),
          status:         form.status,
        });
        onSuccess?.("Vehicle updated successfully.");
      } else {
        await api.post("/api/supervisor/temporary-vehicles", {
          vehicle_number: form.vehicle_number.trim(),
          vehicle_type:   form.vehicle_type.trim(),
          capacity:       Number(form.capacity),
          status:         form.status,
        });
        onSuccess?.("Vehicle added successfully.");
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally { setSaving(false); }
  };

  const STATUS_OPTIONS = [
    { value: "AVAILABLE",   label: "Available"    },
    { value: "IN_USE",      label: "In Use"       },
    { value: "MAINTENANCE", label: "Maintenance"  },
  ];

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
        },
      }}
    >
      {/* Top accent stripe */}
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${sColor})` }} />

      <DialogTitle sx={{ pb: 1.5, pt: 2.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 38, height: 38, borderRadius: 2,
                bgcolor: alpha(accent, 0.12),
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <DirectionsCar sx={{ color: accent, fontSize: 19 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}
                sx={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
                {editData ? "Edit Temporary Vehicle" : "Add Temporary Vehicle"}
              </Typography>
              <Typography variant="caption" color="text.secondary"
                sx={{ fontFamily: "'DM Sans', sans-serif" }}>
                {editData ? `Editing: ${editData.vehicle_number}` : "Register a short-term fleet vehicle"}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={saving}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5, pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Grid container spacing={1.5}>
          {/* Vehicle Number */}
          <Grid item xs={12} sm={7}>
            <TextField
              fullWidth size="small" label="Vehicle Number *"
              placeholder="e.g. KA-01-AB-1234"
              value={form.vehicle_number} onChange={set("vehicle_number")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.9rem", letterSpacing: "0.04em" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth select size="small" label="Status"
              value={form.status} onChange={set("status")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}
                  sx={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Vehicle Type */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth size="small" label="Vehicle Type *"
              placeholder="e.g. Truck, Mini Van, Pickup, Bike"
              value={form.vehicle_type} onChange={set("vehicle_type")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>

          {/* Capacity */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" label="Capacity *"
              type="number" placeholder="e.g. 1000"
              value={form.capacity} onChange={set("capacity")}
              inputProps={{ min: 1 }}
              InputProps={{
                sx: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.9rem" },
              }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
              helperText="in kg or units"
              FormHelperTextProps={{ sx: { fontFamily: "'DM Sans', sans-serif", fontSize: "0.67rem" } }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
        <Button
          variant="outlined" onClick={handleClose} disabled={saving}
          sx={{ borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={15} color="inherit" /> : null}
          sx={{
            borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
            bgcolor: accent, "&:hover": { bgcolor: alpha(accent, 0.86) },
            boxShadow: `0 4px 12px ${alpha(accent, 0.3)}`,
          }}
        >
          {saving ? "Saving…" : editData ? "Update Vehicle" : "Add Vehicle"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTempVehicleModal;