// src/pages/Supervisor/DeliveryLoggerModal.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, IconButton, CircularProgress,
  Alert, Grid, Card, CardContent, Stepper, Step, StepLabel,
  StepConnector, stepConnectorClasses, Avatar, useTheme, alpha,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Close, LocalShipping, Person, Assignment, CheckCircle,
  Phone, ArrowForward, RocketLaunch, ShoppingBag,
} from "@mui/icons-material";
import api from "../../../context/Api";
import OrdersSelectionModal from "./OrderSelectionModal";

// ─── Stepper Connector ──────────────────────────────────────────
const GradientConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 17 },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2, border: 0,
    background: theme.palette.divider,
    borderRadius: 1,
  },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
    background: `linear-gradient(90deg,${theme.palette.primary.main},${theme.palette.secondary.main})`,
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    background: `linear-gradient(90deg,${theme.palette.primary.main},${theme.palette.secondary.main})`,
  },
}));

// ─── Step Icon ──────────────────────────────────────────────────
const StepIconRoot = styled("div")(({ theme, ownerState }) => ({
  width: 36, height: 36, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "0.82rem", fontWeight: 700, transition: "all .3s",
  ...(ownerState.active && {
    background: `linear-gradient(135deg,${theme.palette.primary.main},${theme.palette.secondary.main})`,
    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.45)}`,
    color: "#fff",
  }),
  ...(ownerState.completed && {
    background: theme.palette.success.main,
    color: "#fff",
  }),
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
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer", borderRadius: 3,
        border: `2px solid ${selected ? accentColor : theme.palette.divider}`,
        background: selected ? alpha(accentColor, 0.07) : theme.palette.background.paper,
        transition: "all .22s",
        position: "relative", overflow: "hidden",
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
      }}
    >
      {children}
    </Card>
  );
};

// ─── Main ───────────────────────────────────────────────────────
const DeliveryLoggerModal = ({ open, onClose, onSuccess }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [activeStep, setActiveStep] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [showOrders, setShowOrders] = useState(false);

  const [vehicles,         setVehicles]        = useState([]);
  const [drivers,          setDrivers]         = useState([]);
  const [selectedVehicle,  setSelectedVehicle] = useState(null);
  const [selectedDriver,   setSelectedDriver]  = useState(null);
  const [selectedOrderIds, setSelectedOrderIds]= useState([]);
  const [allOrders,        setAllOrders]       = useState([]);

  const steps = ["Vehicle", "Driver", "Orders", "Confirm"];

  useEffect(() => {
    if (open) { resetForm(); fetchData(); }
  }, [open]);

  const resetForm = () => {
    setActiveStep(0); setSelectedVehicle(null); setSelectedDriver(null);
    setSelectedOrderIds([]); setAllOrders([]); setError("");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        api.get("/api/delivery-logger/available-vehicles"),
        api.get("/api/delivery-logger/available-drivers"),
      ]);
      setVehicles(vRes.data.vehicles || []);
      setDrivers(dRes.data.drivers || []);
    } catch { setError("Failed to load data. Please try again."); }
    finally { setLoading(false); }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedVehicle) { setError("Please select a vehicle"); return; }
    if (activeStep === 1 && !selectedDriver)  { setError("Please select a driver");  return; }
    if (activeStep === 2 && !selectedOrderIds.length) { setError("Please select at least one order"); return; }
    setError(""); setActiveStep(p => p + 1);
  };

  const handleBack    = () => { setError(""); setActiveStep(p => p - 1); };
  const handleOrdersConfirm = (ids, orders) => { setSelectedOrderIds(ids); setAllOrders(orders); setShowOrders(false); };

  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      await api.post("/api/delivery-logger/create-assignment", {
        vehicle_id: selectedVehicle.vehicle_id,
        driver_id:  selectedDriver.user_id,
        order_ids:  selectedOrderIds,
      });
      onSuccess?.(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create assignment");
      setSubmitting(false);
    }
  };

  const selectedOrdersData = allOrders.filter(o => selectedOrderIds.includes(o.order_id));
  const totalItems         = selectedOrdersData.reduce((s, o) => s + (parseInt(o.total_items) || 0), 0);
  const initials = (n) => n?.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "?";

  const pColor = theme.palette.primary.main;
  const sColor = theme.palette.secondary.main;

  // ─── Step Content ──────────────────────────────────────────────
  const renderStep = () => {
    switch (activeStep) {

      case 0:
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Choose a Vehicle</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>{vehicles.length} available</Typography>
            {vehicles.length === 0
              ? <Alert severity="info" sx={{ borderRadius: 2 }}>No vehicles available</Alert>
              : <Grid container spacing={2}>
                  {vehicles.map(v => (
                    <Grid item xs={12} sm={6} md={4} key={v.vehicle_id}>
                      <SelectableCard selected={selectedVehicle?.vehicle_id === v.vehicle_id} onClick={() => { setSelectedVehicle(v); setError(""); }} accentColor={pColor}>
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: selectedVehicle?.vehicle_id === v.vehicle_id ? alpha(pColor, 0.15) : alpha(theme.palette.text.primary, 0.06), display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <LocalShipping sx={{ fontSize: 17, color: selectedVehicle?.vehicle_id === v.vehicle_id ? pColor : "text.disabled" }} />
                            </Box>
                            {selectedVehicle?.vehicle_id === v.vehicle_id && <CheckCircle sx={{ color: pColor, fontSize: 18 }} />}
                          </Box>
                          <Typography variant="body1" fontWeight={700} sx={{ color: selectedVehicle?.vehicle_id === v.vehicle_id ? pColor : "text.primary", fontFamily: "'Sora',sans-serif" }}>{v.vehicle_number}</Typography>
                          <Typography variant="caption" color="text.secondary">{v.vehicle_type}{v.capacity ? ` · Cap: ${v.capacity}` : ""}</Typography>
                          {v.is_temporary && <Chip label="Temporary" size="small" color="warning" sx={{ mt: 1, height: 18, fontSize: "0.6rem" }} />}
                        </CardContent>
                      </SelectableCard>
                    </Grid>
                  ))}
                </Grid>
            }
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Assign a Driver</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>{drivers.length} available</Typography>
            {drivers.length === 0
              ? <Alert severity="info" sx={{ borderRadius: 2 }}>No drivers available</Alert>
              : <Grid container spacing={2}>
                  {drivers.map(d => (
                    <Grid item xs={12} sm={6} md={4} key={d.user_id}>
                      <SelectableCard selected={selectedDriver?.user_id === d.user_id} onClick={() => { setSelectedDriver(d); setError(""); }} accentColor={theme.palette.success.main}>
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                            <Avatar sx={{ width: 34, height: 34, fontSize: "0.72rem", fontWeight: 800, bgcolor: selectedDriver?.user_id === d.user_id ? alpha(theme.palette.success.main, 0.18) : alpha(theme.palette.text.primary, 0.07), color: selectedDriver?.user_id === d.user_id ? "success.main" : "text.secondary" }}>{initials(d.full_name)}</Avatar>
                            <Box flex={1}>
                              <Typography variant="body2" fontWeight={700} sx={{ color: selectedDriver?.user_id === d.user_id ? "success.main" : "text.primary", fontFamily: "'Sora',sans-serif" }}>{d.full_name}</Typography>
                              {d.is_external_driver && <Chip label="External" size="small" color="info" sx={{ height: 16, fontSize: "0.58rem" }} />}
                            </Box>
                            {selectedDriver?.user_id === d.user_id && <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />}
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

      case 2:
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Select Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Pick orders for this delivery run</Typography>
            <Box
              onClick={() => setShowOrders(true)}
              sx={{
                border: `2px dashed ${selectedOrderIds.length ? theme.palette.secondary.main : theme.palette.divider}`,
                borderRadius: 3, p: 4,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: selectedOrderIds.length ? alpha(theme.palette.secondary.main, 0.05) : "transparent",
                cursor: "pointer", transition: "all .2s",
                "&:hover": { borderColor: theme.palette.secondary.main, background: alpha(theme.palette.secondary.main, 0.04) },
              }}
            >
              <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: alpha(theme.palette.secondary.main, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingBag sx={{ color: "secondary.main", fontSize: 26 }} />
              </Box>
              <Box textAlign="center">
                <Typography variant="body1" fontWeight={700} color="secondary.main">
                  {selectedOrderIds.length > 0 ? `${selectedOrderIds.length} Order${selectedOrderIds.length > 1 ? "s" : ""} Selected` : "Click to Select Orders"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedOrderIds.length > 0 ? `${totalItems} total items · click to modify` : "Opens the order selection panel"}
                </Typography>
              </Box>
              {selectedOrderIds.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center" maxWidth={400}>
                  {selectedOrdersData.slice(0, 6).map(o => (
                    <Chip key={o.order_id} label={o.order_reference} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.68rem" }} />
                  ))}
                  {selectedOrderIds.length > 6 && <Chip label={`+${selectedOrderIds.length - 6} more`} size="small" variant="outlined" />}
                </Box>
              )}
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Review & Confirm</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Please verify before creating the assignment</Typography>
            <Grid container spacing={2}>
              {/* Vehicle */}
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2.5, borderRadius: 3, background: alpha(pColor, 0.07), border: `1px solid ${alpha(pColor, 0.2)}` }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(pColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <LocalShipping sx={{ fontSize: 16, color: pColor }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: pColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>Vehicle</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{selectedVehicle?.vehicle_number}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedVehicle?.vehicle_type}{selectedVehicle?.capacity ? ` · Capacity: ${selectedVehicle.capacity}` : ""}</Typography>
                </Box>
              </Grid>
              {/* Driver */}
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2.5, borderRadius: 3, background: alpha(theme.palette.success.main, 0.07), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Person sx={{ fontSize: 16, color: "success.main" }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: "success.main", textTransform: "uppercase", letterSpacing: "0.06em" }}>Driver</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif" }}>{selectedDriver?.full_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedDriver?.phone_number}</Typography>
                  {selectedDriver?.license_number && <Typography variant="caption" color="text.secondary" display="block">License: {selectedDriver.license_number}</Typography>}
                </Box>
              </Grid>
              {/* Orders */}
              <Grid item xs={12}>
                <Box sx={{ p: 2.5, borderRadius: 3, background: alpha(sColor, 0.07), border: `1px solid ${alpha(sColor, 0.2)}` }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha(sColor, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Assignment sx={{ fontSize: 16, color: sColor }} />
                      </Box>
                      <Typography variant="caption" fontWeight={700} sx={{ color: sColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>Orders</Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Chip label={`${selectedOrderIds.length} orders`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                      <Chip label={`${totalItems} items`} size="small" variant="outlined" />
                    </Box>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {selectedOrdersData.map(o => (
                      <Box key={o.order_id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, px: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.04) }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="secondary.main">{o.order_reference}</Typography>
                          <Typography variant="caption" color="text.secondary">{o.customer_name} · {o.customer_address}</Typography>
                        </Box>
                        <Chip label={`${o.total_items} items`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.63rem" }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      default: return null;
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={submitting ? undefined : onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: "background.paper",
            maxHeight: "92vh",
            border: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
          },
        }}
      >
        {/* Accent top bar */}
        <Box sx={{ height: 4, background: `linear-gradient(90deg,${pColor},${sColor})` }} />

        <DialogTitle sx={{ pt: 3, pb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: alpha(pColor, 0.12), border: `1px solid ${alpha(pColor, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RocketLaunch sx={{ color: pColor, fontSize: 21 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em", color: "text.primary" }}>New Delivery</Typography>
                <Typography variant="caption" color="text.secondary">Step {activeStep + 1} of {steps.length}</Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} disabled={submitting} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Stepper */}
          <Box mt={3}>
            <Stepper activeStep={activeStep} connector={<GradientConnector />} alternativeLabel>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel
                    StepIconComponent={CustomStepIcon}
                    sx={{ "& .MuiStepLabel-label": { fontSize: "0.72rem", fontWeight: 600, "&.Mui-active": { color: pColor }, "&.Mui-completed": { color: "text.secondary" } } }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>
          )}
          {loading
            ? <Box display="flex" justifyContent="center" py={6}><CircularProgress color="primary" /></Box>
            : renderStep()
          }
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
          {activeStep > 0 && (
            <Button variant="outlined" onClick={handleBack} disabled={submitting} sx={{ borderRadius: 2 }}>Back</Button>
          )}
          <Box flex={1} />
          {activeStep < steps.length - 1
            ? <Button variant="contained" onClick={handleNext} disabled={loading} endIcon={<ArrowForward />} sx={{ borderRadius: 2, fontWeight: 700, px: 3, background: `linear-gradient(135deg,${pColor},${sColor})`, color: "#fff", "&:hover": { boxShadow: `0 4px 16px ${alpha(pColor, 0.4)}` } }}>Continue</Button>
            : <Button variant="contained" onClick={handleSubmit} disabled={submitting}
                startIcon={submitting ? <CircularProgress size={17} sx={{ color: "inherit" }} /> : <RocketLaunch />}
                color="success" sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
              >
                {submitting ? "Creating…" : "Launch Delivery"}
              </Button>
          }
        </DialogActions>
      </Dialog>

      <OrdersSelectionModal
        open={showOrders}
        onClose={() => setShowOrders(false)}
        onConfirm={handleOrdersConfirm}
        alreadySelected={selectedOrderIds}
      />
    </>
  );
};

export default DeliveryLoggerModal;
