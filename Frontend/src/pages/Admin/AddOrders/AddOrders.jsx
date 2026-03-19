// src/pages/AddOrders.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, Tooltip, MenuItem, Select, FormControl,
  InputLabel, CircularProgress, Skeleton, alpha, useTheme,
} from "@mui/material";
import {
  Search, Add, Upload, Visibility, Edit, Delete,
  FilterList, Refresh, ReceiptLong, LocalShipping,
  CheckCircle, PendingActions,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import api from "../../../context/Api";
import AddOrdersModal from "./AddOrdersModal";
import OrderDetailsModal from "./OrderDetailsModal";
import BulkUploadModal from "./BulkUploadModal";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  NOT_ASSIGNED: { label: "Not Assigned", color: "warning", icon: <PendingActions sx={{ fontSize: 14 }} /> },
  IN_PROGRESS:  { label: "In Progress",  color: "info",    icon: <LocalShipping sx={{ fontSize: 14 }} /> },
  DELIVERED:    { label: "Delivered",    color: "success", icon: <CheckCircle sx={{ fontSize: 14 }} /> },
};

// ─── Row animation ────────────────────────────────────────────────────────────
const MotionTableRow = motion(TableRow);

export default function AddOrders() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("ALL");
  const [addOpen, setAddOpen]       = useState(false);
  const [viewOrder, setViewOrder]   = useState(null);
  const [editOrder, setEditOrder]   = useState(null);
  const [bulkOpen, setBulkOpen]     = useState(false);
  const [deleting, setDeleting]     = useState(null);

  // ─── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.get("/api/orders", { params });
      setOrders(res.data.data || []);
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 400);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (order) => {
    if (!window.confirm(`Delete order ${order.order_reference || `#${order.order_id}`}?`)) return;
    setDeleting(order.order_id);
    try {
      await api.delete(`/api/orders/${order.order_id}`);
      toast.success("Order deleted");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const cardBg = isDark
    ? "linear-gradient(135deg, #1e2a32 0%, #162028 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)";

  const headerBg = isDark
    ? "linear-gradient(135deg, #024990 0%, #023570 100%)"
    : "linear-gradient(135deg, #024990 0%, #0369c7 100%)";

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", bgcolor: "background.default" }}>
      <Toaster position="top-right" />

      {/* ── Page Header ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Box
          sx={{
            background: headerBg,
            borderRadius: 3,
            p: { xs: 2.5, md: 3 },
            mb: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            boxShadow: "0 8px 32px rgba(2,73,144,0.25)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ReceiptLong sx={{ color: "#fff", fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                Orders Management
              </Typography>
              <Typography variant="body2" sx={{ color: alpha("#fff", 0.7), mt: 0.3 }}>
                {orders.length} order{orders.length !== 1 ? "s" : ""} found
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => setBulkOpen(true)}
              sx={{
                borderColor: alpha("#fff", 0.5),
                color: "#fff",
                "&:hover": { borderColor: "#fff", bgcolor: alpha("#fff", 0.1) },
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Upload Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddOpen(true)}
              sx={{
                bgcolor: "#22fbff",
                color: "#024990",
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": { bgcolor: "#00e5e9" },
                boxShadow: "0 4px 14px rgba(34,251,255,0.35)",
              }}
            >
              Add Order
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Search by reference, customer, pincode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              flex: 1,
              minWidth: 250,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                background: isDark ? alpha("#fff", 0.05) : "#fff",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <FilterList sx={{ fontSize: 16 }} /> Status
              </Box>
            </InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
              sx={{ borderRadius: 2, background: isDark ? alpha("#fff", 0.05) : "#fff" }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="NOT_ASSIGNED">Not Assigned</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchOrders}
              sx={{
                bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.08),
                "&:hover": { bgcolor: isDark ? alpha("#fff", 0.14) : alpha("#024990", 0.15) },
                borderRadius: 2,
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </motion.div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            background: cardBg,
            border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1)}`,
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  background: isDark
                    ? alpha("#024990", 0.25)
                    : alpha("#024990", 0.07),
                }}
              >
                {["#", "Reference", "Customer", "Address", "Pincode", "Items", "Status", "Created At", "Actions"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: isDark ? "#91eff1" : "#024990",
                      borderBottom: `2px solid ${isDark ? alpha("#91eff1", 0.2) : alpha("#024990", 0.15)}`,
                      py: 1.8,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <ReceiptLong sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
                    <Typography color="text.secondary">No orders found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {orders.map((order, idx) => {
                    const sc = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.NOT_ASSIGNED;
                    const isDeleting = deleting === order.order_id;

                    return (
                      <MotionTableRow
                        key={order.order_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.25, delay: idx * 0.03 }}
                        sx={{
                          "&:hover": {
                            bgcolor: isDark ? alpha("#024990", 0.12) : alpha("#024990", 0.04),
                          },
                          opacity: isDeleting ? 0.5 : 1,
                          transition: "background 0.2s",
                        }}
                      >
                        <TableCell sx={{ color: "text.secondary", fontSize: 13 }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                            {order.order_reference || `—`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {order.customer_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {order.customer_address || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{order.pincode || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${order.item_count} item${order.item_count !== 1 ? "s" : ""}`}
                            size="small"
                            sx={{
                              bgcolor: isDark ? alpha("#22fbff", 0.12) : alpha("#024990", 0.1),
                              color: isDark ? "#22fbff" : "#024990",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={sc.icon}
                            label={sc.label}
                            color={sc.color}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: 12 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => setViewOrder(order)}
                                sx={{
                                  color: isDark ? "#91eff1" : "#024990",
                                  "&:hover": { bgcolor: isDark ? alpha("#91eff1", 0.1) : alpha("#024990", 0.1) },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Edit Order">
                              <IconButton
                                size="small"
                                onClick={() => setEditOrder(order)}
                                sx={{
                                  color: "warning.main",
                                  "&:hover": { bgcolor: alpha("#ff9800", 0.1) },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip
                              title={
                                order.delivery_status !== "NOT_ASSIGNED"
                                  ? "Cannot delete — order is active"
                                  : "Delete Order"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={order.delivery_status !== "NOT_ASSIGNED" || isDeleting}
                                  onClick={() => handleDelete(order)}
                                  sx={{
                                    color: "error.main",
                                    "&:hover": { bgcolor: alpha("#f44336", 0.1) },
                                    "&.Mui-disabled": { color: alpha("#f44336", 0.3) },
                                  }}
                                >
                                  {isDeleting ? <CircularProgress size={16} /> : <Delete fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </MotionTableRow>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <AddOrdersModal
        open={addOpen || !!editOrder}
        onClose={() => { setAddOpen(false); setEditOrder(null); }}
        onSuccess={() => { setAddOpen(false); setEditOrder(null); fetchOrders(); }}
        editData={editOrder}
      />

      <OrderDetailsModal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
      />

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => { setBulkOpen(false); fetchOrders(); }}
      />
    </Box>
  );
}