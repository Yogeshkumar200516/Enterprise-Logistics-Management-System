// src/components/orders/AddOrdersModal.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton,
  Switch, FormControlLabel, Divider, CircularProgress,
  alpha, useTheme, Tooltip,
} from "@mui/material";
import {
  Close, Add, Delete, ReceiptLong, Person,
  LocationOn, Inventory2, ShoppingCart,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import api from "../../../context/Api";

const defaultItem = () => ({ product_name: "", quantity: 1, is_fragile: false });

export default function AddOrdersModal({ open, onClose, onSuccess, editData }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [form, setForm] = useState({
    order_reference: "",
    customer_name: "",
    customer_address: "",
    pincode: "",
  });
  const [items, setItems] = useState([defaultItem()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill on edit
  useEffect(() => {
    if (editData) {
      setForm({
        order_reference: editData.order_reference || "",
        customer_name: editData.customer_name || "",
        customer_address: editData.customer_address || "",
        pincode: editData.pincode || "",
      });
      // Fetch items for this order
      api.get(`/api/orders/${editData.order_id}`).then((res) => {
        const fetchedItems = res.data.data?.items || [];
        setItems(fetchedItems.length > 0 ? fetchedItems : [defaultItem()]);
      }).catch(() => setItems([defaultItem()]));
    } else {
      setForm({ order_reference: "", customer_name: "", customer_address: "", pincode: "" });
      setItems([defaultItem()]);
      setErrors({});
    }
  }, [editData, open]);

  // ─── Validation ───────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = "Customer name is required";
    items.forEach((item, i) => {
      if (!item.product_name.trim()) e[`item_${i}_name`] = "Product name required";
      if (!item.quantity || item.quantity < 1) e[`item_${i}_qty`] = "Min quantity is 1";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, items };
      if (editData) {
        await api.put(`/api/orders/${editData.order_id}`, payload);
        toast.success("Order updated successfully");
      } else {
        await api.post("/api/orders", payload);
        toast.success("Order created successfully");
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ─── Items helpers ────────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, defaultItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  // ─── Styles ───────────────────────────────────────────────────────
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      background: isDark ? alpha("#fff", 0.04) : alpha("#024990", 0.03),
      "&:hover fieldset": { borderColor: "primary.main" },
    },
  };

  const sectionLabel = (icon, text) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mt: 2 }}>
      {React.cloneElement(icon, { sx: { color: "primary.main", fontSize: 18 } })}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", letterSpacing: 0.5 }}>
        {text}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: isDark
            ? "linear-gradient(135deg, #1e2a32 0%, #162028 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
          border: `1px solid ${isDark ? alpha("#91eff1", 0.12) : alpha("#024990", 0.12)}`,
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.5)"
            : "0 24px 80px rgba(2,73,144,0.15)",
        },
      }}
    >
      {/* ── Title ──────────────────────────────────────────────────── */}
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
            <ReceiptLong sx={{ color: "#22fbff", fontSize: 26 }} />
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                {editData ? "Edit Order" : "Add New Order"}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.65) }}>
                {editData ? `Editing #${editData.order_id}` : "Fill in order details below"}
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
        {/* Order Info */}
        {sectionLabel(<ReceiptLong />, "ORDER INFORMATION")}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField
            label="Order Reference"
            placeholder="e.g. ORD-2024-001"
            value={form.order_reference}
            onChange={(e) => setForm({ ...form, order_reference: e.target.value })}
            size="small"
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Pincode"
            placeholder="e.g. 600001"
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            size="small"
            fullWidth
            inputProps={{ maxLength: 10 }}
            sx={inputSx}
          />
        </Box>

        {/* Customer Info */}
        {sectionLabel(<Person />, "CUSTOMER INFORMATION")}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Customer Name *"
            value={form.customer_name}
            onChange={(e) => { setForm({ ...form, customer_name: e.target.value }); setErrors({ ...errors, customer_name: "" }); }}
            error={!!errors.customer_name}
            helperText={errors.customer_name}
            size="small"
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Customer Address"
            value={form.customer_address}
            onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
            size="small"
            fullWidth
            multiline
            rows={2}
            InputProps={{ startAdornment: <LocationOn sx={{ color: "text.disabled", mr: 0.5, fontSize: 18 }} /> }}
            sx={inputSx}
          />
        </Box>

        {/* Items */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2, mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShoppingCart sx={{ color: "primary.main", fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", letterSpacing: 0.5 }}>
              ORDER ITEMS
            </Typography>
          </Box>
          <Button
            startIcon={<Add />}
            size="small"
            onClick={addItem}
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 600, fontSize: 12 }}
          >
            Add Item
          </Button>
        </Box>

        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.12)}`,
                  background: isDark ? alpha("#fff", 0.03) : alpha("#024990", 0.02),
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 20 }}>
                  <Inventory2 sx={{ color: "text.disabled", fontSize: 16 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {i + 1}
                  </Typography>
                </Box>

                <TextField
                  label="Product Name *"
                  value={item.product_name}
                  onChange={(e) => { updateItem(i, "product_name", e.target.value); setErrors({ ...errors, [`item_${i}_name`]: "" }); }}
                  error={!!errors[`item_${i}_name`]}
                  helperText={errors[`item_${i}_name`]}
                  size="small"
                  sx={{ flex: 2, minWidth: 140, ...inputSx }}
                />

                <TextField
                  label="Qty *"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => { updateItem(i, "quantity", Number(e.target.value)); setErrors({ ...errors, [`item_${i}_qty`]: "" }); }}
                  error={!!errors[`item_${i}_qty`]}
                  helperText={errors[`item_${i}_qty`]}
                  size="small"
                  inputProps={{ min: 1 }}
                  sx={{ width: 90, ...inputSx }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={!!item.is_fragile}
                      onChange={(e) => updateItem(i, "is_fragile", e.target.checked)}
                      color="warning"
                    />
                  }
                  label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Fragile</Typography>}
                  sx={{ m: 0 }}
                />

                <Tooltip title="Remove item">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      sx={{ color: "error.main", "&.Mui-disabled": { color: alpha("#f44336", 0.3) } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
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
            borderRadius: 2,
            fontWeight: 700,
            flex: 2,
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
            boxShadow: "0 4px 14px rgba(2,73,144,0.35)",
            "&:hover": { background: "linear-gradient(135deg, #023570 0%, #024990 100%)" },
          }}
        >
          {saving ? "Saving..." : editData ? "Update Order" : "Create Order"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}