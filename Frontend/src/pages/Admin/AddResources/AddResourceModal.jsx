// src/components/resources/AddResourceModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, MenuItem,
  Switch, FormControlLabel, IconButton, CircularProgress,
  alpha, useTheme, InputAdornment,
} from "@mui/material";
import {
  Close, DirectionsCar, LocalShipping,
  Speed, Build,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import api from "../../../context/Api";

export default function AddResourceModal({ open, handleClose, editData, refresh }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    vehicle_type: "",
    vehicle_number: "",
    capacity: "",
    status: "AVAILABLE",
    is_temporary: 0,
  });

  useEffect(() => {
    if (editData) {
      setForm({
        vehicle_type:   editData.vehicle_type   || "",
        vehicle_number: editData.vehicle_number || "",
        capacity:       editData.capacity        || "",
        status:         editData.status          || "AVAILABLE",
        is_temporary:   Number(editData.is_temporary),
      });
    } else {
      setForm({ vehicle_type: "", vehicle_number: "", capacity: "", status: "AVAILABLE", is_temporary: 0 });
    }
  }, [editData, open]);

  const handleSubmit = async () => {
    if (!form.vehicle_number.trim()) { toast.error("Vehicle number is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, is_temporary: Number(form.is_temporary) };
      if (editData) {
        await api.put(`/api/resources/vehicles/${editData.vehicle_id}`, payload);
        toast.success("Vehicle updated");
      } else {
        await api.post("/api/resources/vehicles", payload);
        toast.success("Vehicle added");
      }
      refresh();
      handleClose();
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

  const statusColors = {
    AVAILABLE:   "#4caf50",
    IN_USE:      "#ff9800",
    MAINTENANCE: "#f44336",
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
              <DirectionsCar sx={{ color: "#22fbff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                {editData ? "Edit Vehicle" : "Add Vehicle"}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.65) }}>
                {editData ? `Editing ${editData.vehicle_number}` : "Enter vehicle details"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: alpha("#fff", 0.7), "&:hover": { color: "#fff" } }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Content ────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 0.5 }}>
          {/* Vehicle Number */}
          <TextField
            label="Vehicle Number *"
            value={form.vehicle_number}
            onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
            disabled={Boolean(editData)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocalShipping sx={{ fontSize: 17, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />

          {/* Vehicle Type */}
          <TextField
            label="Vehicle Type"
            value={form.vehicle_type}
            onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
            size="small"
            fullWidth
            placeholder="e.g. Truck, Van, Bike"
            sx={inputSx}
          />

          {/* Capacity */}
          <TextField
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            size="small"
            fullWidth
            inputProps={{ min: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Speed sx={{ fontSize: 17, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />

          {/* Status */}
          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            size="small"
            fullWidth
            sx={inputSx}
          >
            {["AVAILABLE", "IN_USE", "MAINTENANCE"].map((s) => (
              <MenuItem key={s} value={s}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: "50%",
                      bgcolor: statusColors[s],
                    }}
                  />
                  {s.replace("_", " ")}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Temporary toggle */}
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.12)}`,
            background: isDark ? alpha("#fff", 0.02) : alpha("#024990", 0.02),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Build sx={{ fontSize: 18, color: "text.secondary" }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Temporary Vehicle</Typography>
              <Typography variant="caption" color="text.secondary">
                Mark if this is a temporary / hired vehicle
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={form.is_temporary === 1}
            onChange={(e) => setForm({ ...form, is_temporary: e.target.checked ? 1 : 0 })}
            color="warning"
          />
        </Box>
      </DialogContent>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <DialogActions sx={{ p: 3, pt: 1, gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
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
          {saving ? "Saving..." : editData ? "Update Vehicle" : "Add Vehicle"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}