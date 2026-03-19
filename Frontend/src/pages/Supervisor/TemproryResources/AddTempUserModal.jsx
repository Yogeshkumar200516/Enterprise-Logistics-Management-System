// src/pages/Supervisor/AddTempUserModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, MenuItem, Typography,
  IconButton, Alert, CircularProgress, Grid,
  useTheme, alpha,
} from "@mui/material";
import { Close, Person } from "@mui/icons-material";
import api from "../../../context/Api";

const EMPTY = {
  full_name: "", username: "", phone_number: "", password: "",
  status: "ACTIVE", license_number: "", vehicle_type: "", vehicle_number: "",
};

const AddTempUserModal = ({ open, handleClose, editData, refresh, onSuccess }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.warning.main;

  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // ── Populate form on open ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setError("");
    if (editData) {
      setForm({
        full_name:      editData.full_name      || "",
        username:       editData.username       || "",
        phone_number:   editData.phone_number   || "",
        password:       "",
        status:         editData.status         || "ACTIVE",
        license_number: editData.license_number || "",
        vehicle_type:   editData.vehicle_type   || "",
        vehicle_number: editData.vehicle_number || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [editData, open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.full_name.trim())    { setError("Full name is required");                          return; }
    if (!form.username.trim())     { setError("Username is required");                           return; }
    if (!form.phone_number.trim()) { setError("Phone number is required");                       return; }
    if (!editData && !form.password.trim()) { setError("Password is required for new accounts"); return; }

    setSaving(true); setError("");
    try {
      if (editData) {
        // ✏️ PUT — username now included so it can be changed
        await api.put(`/api/supervisor/temporary-users/${editData.user_id}`, {
          full_name:      form.full_name.trim(),
          username:       form.username.trim(),
          phone_number:   form.phone_number.trim(),
          status:         form.status,
          license_number: form.license_number.trim() || null,
          vehicle_type:   form.vehicle_type.trim()   || null,
          vehicle_number: form.vehicle_number.trim() || null,
        });
        onSuccess?.("Driver updated successfully.");
      } else {
        // ➕ POST
        await api.post("/api/supervisor/temporary-users", {
          full_name:      form.full_name.trim(),
          username:       form.username.trim(),
          phone_number:   form.phone_number.trim(),
          password:       form.password,
          status:         form.status,
          license_number: form.license_number.trim() || null,
          vehicle_type:   form.vehicle_type.trim()   || null,
          vehicle_number: form.vehicle_number.trim() || null,
        });
        onSuccess?.("Driver added successfully.");
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally { setSaving(false); }
  };

  const sColor = theme.palette.info.main;

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
              <Person sx={{ color: accent, fontSize: 19 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}
                sx={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
                {editData ? "Edit External Driver" : "Add External Driver"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'DM Sans', sans-serif" }}>
                {editData ? `Editing: ${editData.full_name}` : "Create a temporary driver account"}
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

        {/* ── Section: Account ── */}
        <Typography variant="caption" fontWeight={700}
          sx={{
            display: "block", mb: 1.5,
            textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.6rem",
            color: "text.disabled", fontFamily: "'DM Sans', sans-serif",
          }}>
          Account Details
        </Typography>

        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="Full Name *"
              value={form.full_name} onChange={set("full_name")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>

          {/* Username — always editable, shows warning on edit */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="Username *"
              value={form.username} onChange={set("username")}
              helperText={editData ? "⚠ Changing username affects login credentials" : "Used to log in to the driver app"}
              FormHelperTextProps={{
                sx: {
                  fontFamily: "'DM Sans', sans-serif", fontSize: "0.67rem",
                  color: editData ? "warning.main" : "text.disabled",
                },
              }}
              InputProps={{
                sx: {
                  borderRadius: 2,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.88rem",
                },
              }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>

          <Grid item xs={12} sm={editData ? 6 : 12}>
            <TextField
              fullWidth size="small" label="Phone Number *"
              value={form.phone_number} onChange={set("phone_number")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.88rem" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>

          {editData && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select size="small" label="Account Status"
                value={form.status} onChange={set("status")}
                InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
                InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="SUSPENDED">Suspended</MenuItem>
              </TextField>
            </Grid>
          )}

          {!editData && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" label="Password *" type="password"
                  value={form.password} onChange={set("password")}
                  InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
                  InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth select size="small" label="Account Status"
                  value={form.status} onChange={set("status")}
                  InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
                  InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </TextField>
              </Grid>
            </>
          )}
        </Grid>

        {/* ── Section: Vehicle ── */}
        <Box sx={{ mt: 2.5, mb: 1.5, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" fontWeight={700}
            sx={{
              textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.6rem",
              color: "text.disabled", fontFamily: "'DM Sans', sans-serif",
            }}>
            Vehicle Info <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </Typography>
        </Box>

        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="License Number"
              value={form.license_number} onChange={set("license_number")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.88rem" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="Vehicle Type"
              placeholder="e.g. Truck, Van, Bike"
              value={form.vehicle_type} onChange={set("vehicle_type")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'DM Sans', sans-serif" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" label="Vehicle Number"
              value={form.vehicle_number} onChange={set("vehicle_number")}
              InputProps={{ sx: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.88rem" } }}
              InputLabelProps={{ sx: { fontFamily: "'DM Sans', sans-serif" } }}
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
          {saving ? "Saving…" : editData ? "Update Driver" : "Add Driver"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTempUserModal;