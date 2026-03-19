// src/pages/Supervisor/ScrapLogModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, IconButton, CircularProgress,
  Alert, Grid, Card, CardContent, Stepper, Step, StepLabel,
  StepConnector, stepConnectorClasses, Avatar, TextField,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Select, MenuItem, InputLabel, useTheme, alpha,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Close, Recycling, Person, CheckCircle, Phone,
  ArrowForward, Business, ShoppingCart, DirectionsCar,
  LocalShipping, Add, Delete, LocationOn, Notes,
} from "@mui/icons-material";
import api from "../../../context/Api";

// ─── Gradient Stepper Connector ──────────────────────────────────
const GradientConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 17 },
  [`& .${stepConnectorClasses.line}`]: { height: 2, border: 0, background: theme.palette.divider, borderRadius: 1 },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
    background: `linear-gradient(90deg,${theme.palette.success.main},${theme.palette.info.main})`,
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    background: `linear-gradient(90deg,${theme.palette.success.main},${theme.palette.info.main})`,
  },
}));

const StepIconRoot = styled("div")(({ theme, ownerState }) => ({
  width: 36, height: 36, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "0.82rem", fontWeight: 700, transition: "all .3s",
  ...(ownerState.active && {
    background: `linear-gradient(135deg,${theme.palette.success.main},${theme.palette.info.main})`,
    boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.45)}`,
    color: "#fff",
  }),
  ...(ownerState.completed && { background: theme.palette.success.main, color: "#fff" }),
  ...(!ownerState.active && !ownerState.completed && {
    background: alpha(theme.palette.text.primary, 0.07),
    color: theme.palette.text.disabled,
    border: `1px solid ${theme.palette.divider}`,
  }),
}));

const CustomStepIcon = ({ active, completed, icon }) => (
  <StepIconRoot ownerState={{ active, completed }}>
    {completed ? <CheckCircle sx={{ fontSize: 17 }} /> : icon}
  </StepIconRoot>
);

// ─── Selectable Card ────────────────────────────────────────────
const SelectableCard = ({ selected, onClick, accentColor, children }) => {
  const theme = useTheme();
  return (
    <Card onClick={onClick} sx={{
      cursor: "pointer", borderRadius: 3,
      border: `2px solid ${selected ? accentColor : theme.palette.divider}`,
      background: selected ? alpha(accentColor, 0.07) : theme.palette.background.paper,
      transition: "all .22s", position: "relative", overflow: "hidden",
      "&:hover": {
        border: `2px solid ${alpha(accentColor, 0.6)}`,
        background: alpha(accentColor, 0.05),
        transform: "translateY(-2px)",
        boxShadow: `0 6px 20px ${alpha(accentColor, 0.15)}`,
      },
      "&::before": selected ? {
        content: '""', position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg,${accentColor},${alpha(accentColor, 0.5)})`,
      } : {},
    }}>
      {children}
    </Card>
  );
};

// ─── Empty scrap item factory ─────────────────────────────────────
const newScrapItem = () => ({ item_description: "", quantity: 1, delivery_item_id: "" });

// ─── Main Modal ──────────────────────────────────────────────────
const ScrapLogModal = ({ open, onClose, onSuccess }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [activeStep,     setActiveStep]     = useState(0);
  const [loading,        setLoading]        = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState("");

  // Data from server
  const [vehicles,            setVehicles]           = useState([]);
  const [drivers,             setDrivers]            = useState([]);
  const [exchangeItems,       setExchangeItems]       = useState([]);   // customer-exchange-items

  // Step 1 — assignment
  const [selectedVehicle,    setSelectedVehicle]    = useState(null);
  const [selectedDriver,     setSelectedDriver]     = useState(null);

  // Step 2 — scrap details
  const [source,             setSource]             = useState("INTERNAL");
  const [scrapType,          setScrapType]          = useState("");
  // INTERNAL-only fields
  const [pickupAddress,      setPickupAddress]      = useState("");
  const [pickupPincode,      setPickupPincode]      = useState("");
  const [collectionNotes,    setCollectionNotes]    = useState("");
  // Per-item list (one row per scrap item)
  const [scrapItems,         setScrapItems]         = useState([newScrapItem()]);

  const steps = ["Vehicle & Driver", "Scrap Details", "Review & Confirm"];

  useEffect(() => {
    if (open) { resetForm(); fetchData(); }
  }, [open]);

  const resetForm = () => {
    setActiveStep(0); setSelectedVehicle(null); setSelectedDriver(null);
    setSource("INTERNAL"); setScrapType(""); setPickupAddress(""); setPickupPincode(""); setCollectionNotes("");
    setScrapItems([newScrapItem()]); setError("");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, dRes, iRes] = await Promise.all([
        api.get("/api/scrap-log/available-vehicles"),
        api.get("/api/scrap-log/available-drivers"),
        api.get("/api/scrap-log/customer-exchange-items"),
      ]);
      setVehicles(vRes.data.vehicles || []);
      setDrivers(dRes.data.drivers || []);
      setExchangeItems(iRes.data.items || []);
    } catch {
      setError("Failed to load data. Please try again.");
    } finally { setLoading(false); }
  }, []);

  // ── Item row helpers ──────────────────────────────────────────
  const addItem = () => setScrapItems(prev => [...prev, newScrapItem()]);
  const removeItem = (idx) => setScrapItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) =>
    setScrapItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  // ── Step validation ───────────────────────────────────────────
  const handleNext = () => {
    setError("");
    if (activeStep === 0) {
      if (!selectedVehicle) { setError("Please select a vehicle"); return; }
      if (!selectedDriver)  { setError("Please select a driver");  return; }
    }
    if (activeStep === 1) {
      if (!scrapType.trim()) { setError("Please enter a scrap type label"); return; }
      if (source === "INTERNAL" && !pickupAddress.trim()) { setError("Pickup address is required for Internal scrap"); return; }
      const invalid = scrapItems.some(it => !it.item_description.trim() || it.quantity < 1);
      if (invalid) { setError("Every item needs a description and quantity ≥ 1"); return; }
      if (source === "CUSTOMER") {
        const missing = scrapItems.some(it => !it.delivery_item_id);
        if (missing) { setError("Every Customer Exchange item must be linked to a delivery item"); return; }
      }
    }
    setActiveStep(p => p + 1);
  };

  const handleBack = () => { setError(""); setActiveStep(p => p - 1); };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      // Build payload matching POST /api/scrap-log/create-run
      const payload = {
        vehicle_id:       selectedVehicle.vehicle_id,
        driver_id:        selectedDriver.user_id,
        source,
        scrap_type:       scrapType.trim(),
        scrap_items: scrapItems.map(it => ({
          item_description: it.item_description.trim(),
          quantity:         parseInt(it.quantity) || 1,
          ...(source === "CUSTOMER" && { delivery_item_id: it.delivery_item_id }),
        })),
      };
      if (source === "INTERNAL") {
        payload.pickup_address   = pickupAddress.trim();
        payload.pickup_pincode   = pickupPincode.trim();
        payload.collection_notes = collectionNotes.trim() || undefined;
      }

      await api.post("/api/scrap-log/create-run", payload);
      onSuccess?.(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create scrap run");
      setSubmitting(false);
    }
  };

  const initials = (n) => n?.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "?";
  const pColor = theme.palette.success.main;
  const sColor = theme.palette.info.main;

  // ── Step renderers ────────────────────────────────────────────
  const renderStep0 = () => (
    <Box>
      {/* Vehicles */}
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Select Vehicle</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>{vehicles.length} available</Typography>
      {vehicles.length === 0
        ? <Alert severity="info" sx={{ borderRadius: 2, mb: 3 }}>No vehicles currently available</Alert>
        : <Grid container spacing={2} mb={3.5}>
            {vehicles.map(v => (
              <Grid item xs={12} sm={6} md={4} key={v.vehicle_id}>
                <SelectableCard
                  selected={selectedVehicle?.vehicle_id === v.vehicle_id}
                  onClick={() => { setSelectedVehicle(v); setError(""); }}
                  accentColor={pColor}>
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 2,
                        bgcolor: alpha(pColor, selectedVehicle?.vehicle_id === v.vehicle_id ? 0.18 : 0.08),
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <DirectionsCar sx={{ fontSize: 17, color: selectedVehicle?.vehicle_id === v.vehicle_id ? pColor : "text.disabled" }} />
                      </Box>
                      {selectedVehicle?.vehicle_id === v.vehicle_id && <CheckCircle sx={{ color: pColor, fontSize: 18 }} />}
                    </Box>
                    <Typography variant="body1" fontWeight={700}
                      sx={{ color: selectedVehicle?.vehicle_id === v.vehicle_id ? pColor : "text.primary", fontFamily: "'Sora',sans-serif" }}>
                      {v.vehicle_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {v.vehicle_type}{v.capacity ? ` · Cap: ${v.capacity}` : ""}
                    </Typography>
                    {v.is_temporary && <Chip label="Temporary" size="small" color="warning" sx={{ mt: 1, height: 18, fontSize: "0.6rem" }} />}
                  </CardContent>
                </SelectableCard>
              </Grid>
            ))}
          </Grid>
      }

      {/* Drivers */}
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Assign Driver</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>{drivers.length} available</Typography>
      {drivers.length === 0
        ? <Alert severity="info" sx={{ borderRadius: 2 }}>No drivers currently available</Alert>
        : <Grid container spacing={2}>
            {drivers.map(d => (
              <Grid item xs={12} sm={6} md={4} key={d.user_id}>
                <SelectableCard
                  selected={selectedDriver?.user_id === d.user_id}
                  onClick={() => { setSelectedDriver(d); setError(""); }}
                  accentColor={sColor}>
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                      <Avatar sx={{ width: 34, height: 34, fontSize: "0.72rem", fontWeight: 800,
                        bgcolor: selectedDriver?.user_id === d.user_id ? alpha(sColor, 0.18) : alpha(theme.palette.text.primary, 0.07),
                        color: selectedDriver?.user_id === d.user_id ? sColor : "text.secondary" }}>
                        {initials(d.full_name)}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={700}
                          sx={{ color: selectedDriver?.user_id === d.user_id ? sColor : "text.primary", fontFamily: "'Sora',sans-serif" }}>
                          {d.full_name}
                        </Typography>
                        {d.is_external_driver && <Chip label="External" size="small" color="info" sx={{ height: 16, fontSize: "0.58rem" }} />}
                      </Box>
                      {selectedDriver?.user_id === d.user_id && <CheckCircle sx={{ color: sColor, fontSize: 18 }} />}
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Phone sx={{ fontSize: 12, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">{d.phone_number}</Typography>
                    </Box>
                    {d.license_number && <Typography variant="caption" color="text.secondary" display="block">Lic: {d.license_number}</Typography>}
                  </CardContent>
                </SelectableCard>
              </Grid>
            ))}
          </Grid>
      }
    </Box>
  );

  const renderStep1 = () => (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Scrap Collection Details</Typography>
      <Grid container spacing={2.5} mt={0}>

        {/* Source Radio */}
        <Grid item xs={12}>
          <Box sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`,
            bgcolor: isDark ? alpha(theme.palette.background.default, 0.3) : alpha(theme.palette.text.primary, 0.02) }}>
            <FormControl component="fieldset">
              <FormLabel sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.primary", mb: 1, display: "block" }}>Scrap Source</FormLabel>
              <RadioGroup row value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setScrapItems([newScrapItem()]);
                  setError("");
                }}>
                <FormControlLabel value="INTERNAL" control={<Radio color="success" />}
                  label={<Box display="flex" alignItems="center" gap={0.8}>
                    <Business sx={{ fontSize: 16, color: source === "INTERNAL" ? pColor : "text.disabled" }} />
                    <Typography variant="body2" fontWeight={600}>Internal Collection</Typography>
                  </Box>} />
                <FormControlLabel value="CUSTOMER" control={<Radio color="info" />}
                  label={<Box display="flex" alignItems="center" gap={0.8}>
                    <ShoppingCart sx={{ fontSize: 16, color: source === "CUSTOMER" ? sColor : "text.disabled" }} />
                    <Typography variant="body2" fontWeight={600}>Customer Exchange</Typography>
                  </Box>} />
              </RadioGroup>
            </FormControl>
          </Box>
        </Grid>

        {/* Scrap Type Label (always shown) */}
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Scrap Type Label *" value={scrapType}
            onChange={(e) => setScrapType(e.target.value)}
            placeholder="e.g. Electronics, Cardboard, Mixed…"
            InputProps={{ sx: { borderRadius: 2 } }} />
        </Grid>

        {/* INTERNAL — Pickup Address */}
        {source === "INTERNAL" && (
          <>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Pickup Pincode" value={pickupPincode}
                onChange={(e) => setPickupPincode(e.target.value)}
                InputProps={{ sx: { borderRadius: 2 }, startAdornment: <LocationOn sx={{ fontSize: 16, color: "text.disabled", mr: 0.5 }} /> }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Pickup Address *" value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Full pickup location address"
                multiline rows={2}
                InputProps={{ sx: { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Collection Notes (optional)" value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                placeholder="Any special instructions for the driver…"
                multiline rows={2}
                InputProps={{ sx: { borderRadius: 2 }, startAdornment: <Notes sx={{ fontSize: 16, color: "text.disabled", mr: 0.5, alignSelf: "flex-start", mt: 0.5 }} /> }} />
            </Grid>
          </>
        )}

        {/* Scrap Items List */}
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="body2" fontWeight={700}>
              {source === "CUSTOMER" ? "Exchange Items" : "Items to Collect"} ({scrapItems.length})
            </Typography>
            <Button size="small" startIcon={<Add />} onClick={addItem} sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}>
              Add Item
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {scrapItems.map((item, idx) => (
              <Box key={idx} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? alpha(theme.palette.background.default, 0.2) : alpha(theme.palette.text.primary, 0.01) }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "text.disabled", fontSize: "0.62rem" }}>
                    Item {idx + 1}
                  </Typography>
                  {scrapItems.length > 1 && (
                    <IconButton size="small" onClick={() => removeItem(idx)} sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}>
                      <Delete sx={{ fontSize: 15 }} />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={1.5}>
                  {/* Customer exchange: link to delivery item */}
                  {source === "CUSTOMER" && (
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Delivery Item (Customer Exchange) *</InputLabel>
                        <Select
                          value={item.delivery_item_id}
                          onChange={(e) => updateItem(idx, "delivery_item_id", e.target.value)}
                          label="Delivery Item (Customer Exchange) *"
                          sx={{ borderRadius: 2 }}>
                          <MenuItem value="">— Select delivered item —</MenuItem>
                          {exchangeItems.map(ei => (
                            <MenuItem key={ei.delivery_item_id} value={ei.delivery_item_id}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{ei.order_reference} · {ei.product_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{ei.customer_name}</Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {exchangeItems.length === 0 && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          No delivered items available. Items must be DELIVERED in an active delivery.
                        </Typography>
                      )}
                    </Grid>
                  )}
                  <Grid item xs={12} sm={8}>
                    <TextField fullWidth size="small" label="Item Description *"
                      value={item.item_description}
                      onChange={(e) => updateItem(idx, "item_description", e.target.value)}
                      placeholder="e.g. Empty Gas Cylinder, Old AC Unit…"
                      InputProps={{ sx: { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Qty *" type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      inputProps={{ min: 1 }}
                      InputProps={{ sx: { borderRadius: 2 } }} />
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep2 = () => {
    const totalQty = scrapItems.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
    return (
      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Review & Confirm</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>Verify all details before creating the scrap run</Typography>
        <Grid container spacing={2}>
          {/* Vehicle */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2.5, borderRadius: 3, background: alpha(pColor, 0.07), border: `1px solid ${alpha(pColor, 0.2)}` }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(pColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LocalShipping sx={{ fontSize: 15, color: pColor }} />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.62rem" }}>Vehicle</Typography>
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{selectedVehicle?.vehicle_number}</Typography>
              <Typography variant="caption" color="text.secondary">{selectedVehicle?.vehicle_type}{selectedVehicle?.capacity ? ` · Cap: ${selectedVehicle.capacity}` : ""}</Typography>
            </Box>
          </Grid>

          {/* Driver */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2.5, borderRadius: 3, background: alpha(sColor, 0.07), border: `1px solid ${alpha(sColor, 0.2)}` }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(sColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Person sx={{ fontSize: 15, color: sColor }} />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ color: sColor, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.62rem" }}>Driver</Typography>
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{selectedDriver?.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">{selectedDriver?.phone_number}</Typography>
            </Box>
          </Grid>

          {/* Scrap Summary */}
          <Grid item xs={12}>
            <Box sx={{ p: 2.5, borderRadius: 3, background: alpha(theme.palette.secondary.main, 0.07), border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}` }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Recycling sx={{ fontSize: 15, color: "secondary.main" }} />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ color: "secondary.main", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.62rem" }}>Scrap Details</Typography>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
                <Chip label={scrapType} color="secondary" sx={{ fontWeight: 700 }} />
                <Chip label={`${scrapItems.length} item type${scrapItems.length > 1 ? "s" : ""}`} variant="outlined" />
                <Chip label={`Total Qty: ${totalQty}`} variant="outlined" />
                <Chip label={source === "INTERNAL" ? "Internal" : "Customer Exchange"}
                  color={source === "INTERNAL" ? "default" : "info"} variant="outlined"
                  icon={source === "INTERNAL" ? <Business sx={{ fontSize: "14px !important" }} /> : <ShoppingCart sx={{ fontSize: "14px !important" }} />} />
              </Box>

              {/* Item list preview */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                {scrapItems.map((it, idx) => {
                  const linked = source === "CUSTOMER" && exchangeItems.find(ei => ei.delivery_item_id == it.delivery_item_id);
                  return (
                    <Box key={idx} sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${theme.palette.divider}` }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="body2" fontWeight={600}>{it.item_description}</Typography>
                        <Chip label={`×${it.quantity}`} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Box>
                      {linked && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>
                          ↔ {linked.order_reference} · {linked.product_name} — {linked.customer_name}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Pickup location (INTERNAL) */}
              {source === "INTERNAL" && pickupAddress && (
                <Box sx={{ mt: 1.5, p: 1.2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.06), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                  <Box display="flex" alignItems="flex-start" gap={0.8}>
                    <LocationOn sx={{ fontSize: 14, color: "warning.main", mt: 0.2 }} />
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="warning.main" display="block" sx={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pickup</Typography>
                      <Typography variant="caption" color="text.secondary">{pickupAddress}{pickupPincode ? ` — ${pickupPincode}` : ""}</Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 4, bgcolor: "background.paper", maxHeight: "93vh", border: `1px solid ${theme.palette.divider}`, overflow: "hidden" } }}>
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />

      <DialogTitle sx={{ pt: 3, pb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: alpha(pColor, 0.12), border: `1px solid ${alpha(pColor, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Recycling sx={{ color: pColor, fontSize: 21 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em", color: "text.primary" }}>New Scrap Run</Typography>
              <Typography variant="caption" color="text.secondary">Step {activeStep + 1} of {steps.length}</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} disabled={submitting} size="small"><Close fontSize="small" /></IconButton>
        </Box>
        <Box mt={3}>
          <Stepper activeStep={activeStep} connector={<GradientConnector />} alternativeLabel>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel StepIconComponent={CustomStepIcon}
                  sx={{ "& .MuiStepLabel-label": { fontSize: "0.72rem", fontWeight: 600, "&.Mui-active": { color: pColor }, "&.Mui-completed": { color: "text.secondary" } } }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1, overflow: "auto" }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {loading
          ? <Box display="flex" justifyContent="center" py={6}><CircularProgress color="success" /></Box>
          : renderStep()
        }
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
        {activeStep > 0 && (
          <Button variant="outlined" onClick={handleBack} disabled={submitting} sx={{ borderRadius: 2 }}>Back</Button>
        )}
        <Box flex={1} />
        {activeStep < steps.length - 1
          ? <Button variant="contained" onClick={handleNext} disabled={loading} endIcon={<ArrowForward />}
              sx={{ borderRadius: 2, fontWeight: 700, px: 3, background: `linear-gradient(135deg,${pColor},${sColor})`, color: "#fff", "&:hover": { boxShadow: `0 4px 16px ${alpha(pColor, 0.4)}` } }}>
              Continue
            </Button>
          : <Button variant="contained" onClick={handleSubmit} disabled={submitting}
              startIcon={submitting ? <CircularProgress size={17} sx={{ color: "inherit" }} /> : <Recycling />}
              color="success" sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}>
              {submitting ? "Creating…" : "Create Scrap Run"}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
};

export default ScrapLogModal;