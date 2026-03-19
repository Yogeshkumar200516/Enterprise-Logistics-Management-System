// src/components/users/AddUserModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, MenuItem,
  IconButton, CircularProgress, Checkbox, FormControlLabel,
  alpha, useTheme, InputAdornment, Divider, Switch,
} from "@mui/material";
import {
  Close, Person, Email, Phone, Lock, Badge,
  DirectionsCar, VerifiedUser, DriveEta, AdminPanelSettings,
} from "@mui/icons-material";
import { toast } from "react-hot-toast";
import api from "../../../context/Api";

export default function AddUserModal({ open, onClose, refreshUsers, editData }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isEdit = Boolean(editData);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    role: "user",
    username: "",
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    is_external_driver: false,
    license_number: "",
    vehicle_number: "",
    vehicle_type: "",
  });

  useEffect(() => {
    if (editData) {
      setForm({ ...editData, password: "", is_external_driver: Boolean(editData.is_external_driver) });
    } else {
      setForm({
        role: "user", username: "", full_name: "", email: "",
        phone_number: "", password: "", is_external_driver: false,
        license_number: "", vehicle_number: "", vehicle_type: "",
      });
    }
  }, [editData, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error("Full name is required"); return; }
    if (!form.email.trim())     { toast.error("Email is required"); return; }
    if (!isEdit && !form.password.trim()) { toast.error("Password is required"); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/users/${editData.user_id}`, form);
        toast.success("User updated");
      } else {
        await api.post("/api/users", form);
        toast.success("User created");
      }
      refreshUsers();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      background: isDark ? alpha("#fff", 0.04) : alpha("#024990", 0.03),
      "&:hover fieldset": { borderColor: "primary.main" },
    },
  };

  const sectionTitle = (icon, text) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mt: 2 }}>
      {React.cloneElement(icon, { sx: { color: "primary.main", fontSize: 17 } })}
      <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", letterSpacing: 1 }}>
        {text}
      </Typography>
    </Box>
  );

  const roleColors = { admin: "#024990", supervisor: "#ff9800", user: "#4caf50" };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: isDark
            ? "linear-gradient(135deg, #1e2a32 0%, #162028 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
          border: `1px solid ${isDark ? alpha("#91eff1", 0.12) : alpha("#024990", 0.12)}`,
          boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.5)" : "0 24px 80px rgba(2,73,144,0.15)",
        },
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42, height: 42, borderRadius: 2,
                bgcolor: alpha("#22fbff", 0.15),
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${alpha("#22fbff", 0.3)}`,
              }}
            >
              <AdminPanelSettings sx={{ color: "#22fbff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                {isEdit ? "Edit User" : "Add User"}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.65) }}>
                {isEdit ? `Editing ${editData?.full_name}` : "Fill in user details below"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: alpha("#fff", 0.7), "&:hover": { color: "#fff" } }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Content ────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 3, pb: 1 }}>
        {/* Role selector */}
        {sectionTitle(<VerifiedUser />, "ROLE & ACCESS")}
        <TextField
          select
          label="Role"
          name="role"
          value={form.role}
          onChange={handleChange}
          size="small"
          fullWidth
          sx={inputSx}
        >
          {[
            { val: "admin", label: "Admin", icon: "🔑" },
            { val: "supervisor", label: "Supervisor", icon: "👔" },
            { val: "user", label: "User / Driver", icon: "🚗" },
          ].map((r) => (
            <MenuItem key={r.val} value={r.val}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 8, height: 8, borderRadius: "50%",
                    bgcolor: roleColors[r.val],
                  }}
                />
                {r.icon} {r.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* Basic Info */}
        {sectionTitle(<Person />, "PERSONAL INFORMATION")}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Full Name *"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 17, color: "text.disabled" }} /></InputAdornment> }}
            sx={inputSx}
          />
          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><Badge sx={{ fontSize: 17, color: "text.disabled" }} /></InputAdornment> }}
            sx={inputSx}
          />
          <TextField
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 17, color: "text.disabled" }} /></InputAdornment> }}
            sx={inputSx}
          />
          <TextField
            label="Phone Number"
            name="phone_number"
            value={form.phone_number}
            onChange={handleChange}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 17, color: "text.disabled" }} /></InputAdornment> }}
            sx={inputSx}
          />
          {!isEdit && (
            <TextField
              label="Password *"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={{ gridColumn: "1 / -1", ...inputSx }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 17, color: "text.disabled" }} /></InputAdornment> }}
            />
          )}
        </Box>

        {/* Driver fields — only for user role */}
        {form.role === "user" && (
          <>
            <Divider sx={{ my: 2 }} />
            {sectionTitle(<DriveEta />, "DRIVER INFORMATION")}

            {/* External driver toggle */}
            <Box
              sx={{
                p: 2, mb: 2, borderRadius: 2,
                border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.12)}`,
                background: isDark ? alpha("#fff", 0.02) : alpha("#024990", 0.02),
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>External Driver</Typography>
                <Typography variant="caption" color="text.secondary">
                  Driver hired externally, not a company employee
                </Typography>
              </Box>
              <Switch
                name="is_external_driver"
                checked={Boolean(form.is_external_driver)}
                onChange={(e) => setForm((prev) => ({ ...prev, is_external_driver: e.target.checked }))}
                color="warning"
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="License Number"
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
                size="small"
                fullWidth
                sx={inputSx}
              />
              <TextField
                label="Vehicle Type"
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={handleChange}
                size="small"
                fullWidth
                placeholder="e.g. Truck, Van"
                sx={inputSx}
              />
              <TextField
                label="Vehicle Number"
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                size="small"
                fullWidth
                sx={{ gridColumn: "1 / -1", ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><DirectionsCar sx={{ fontSize: 17, color: "text.disabled" }} /></InputAdornment> }}
              />
            </Box>
          </>
        )}
      </DialogContent>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={saving}
          sx={{ borderRadius: 2, fontWeight: 600, flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            flex: 2, borderRadius: 2, fontWeight: 700,
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
            boxShadow: "0 4px 14px rgba(2,73,144,0.35)",
            "&:hover": { background: "linear-gradient(135deg, #023570 0%, #024990 100%)" },
          }}
        >
          {saving ? "Saving..." : isEdit ? "Update User" : "Create User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}