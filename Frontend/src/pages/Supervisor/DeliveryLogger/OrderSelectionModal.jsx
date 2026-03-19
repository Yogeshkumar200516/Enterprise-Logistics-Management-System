// src/pages/Supervisor/OrdersSelectionModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, InputAdornment, Button, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Collapse, Tooltip, CircularProgress, Alert, Badge,
  Menu, MenuItem, FormControl, InputLabel, Select, Stack,
  useTheme, alpha,
} from "@mui/material";
import {
  Search, FilterList, KeyboardArrowDown, KeyboardArrowUp,
  CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox,
  Close, LocationOn, Inventory2, Done, BrokenImage,
} from "@mui/icons-material";
import api from "../../../context/Api";

const OrdersSelectionModal = ({ open, onClose, onConfirm, alreadySelected = [] }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [expandedOrders,setExpandedOrders]= useState({});
  const [orderItems,    setOrderItems]    = useState({});
  const [selectedOrders,setSelectedOrders]= useState(alreadySelected);

  const [filterAnchor,  setFilterAnchor]  = useState(null);
  const [filterPincode, setFilterPincode] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [uniquePincodes,setUniquePincodes]= useState([]);

  useEffect(() => {
    if (open) { setSelectedOrders(alreadySelected); fetchOrders(); }
  }, [open]);

  const fetchOrders = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/delivery-logger/unassigned-orders");
      const fetched = res.data.orders || [];
      setOrders(fetched);
      setUniquePincodes([...new Set(fetched.map(o => o.pincode).filter(Boolean))].sort());
    } catch (err) { setError(err.response?.data?.message || "Failed to load orders"); }
    finally { setLoading(false); }
  };

  const fetchOrderItems = async (orderId) => {
    if (orderItems[orderId]) return;
    try {
      const res = await api.get(`/api/delivery-logger/order-items/${orderId}`);
      setOrderItems(prev => ({ ...prev, [orderId]: res.data.items || [] }));
    } catch {}
  };

  const toggleExpand = (id) => {
    const next = !expandedOrders[id];
    setExpandedOrders(prev => ({ ...prev, [id]: next }));
    if (next) fetchOrderItems(id);
  };

  const handleToggle = (id) =>
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAll = () => {
    const ids = filtered.map(o => o.order_id);
    const all = ids.every(id => selectedOrders.includes(id));
    setSelectedOrders(prev => all ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const clearFilters = () => { setFilterPincode(""); setFilterAddress(""); setFilterAnchor(null); };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase();
      const ms = !q || [o.order_reference, o.customer_name, o.customer_address, o.pincode].some(v => v?.toLowerCase().includes(q));
      const mp = !filterPincode || o.pincode === filterPincode;
      const ma = !filterAddress || o.customer_address?.toLowerCase().includes(filterAddress.toLowerCase());
      return ms && mp && ma;
    });
  }, [orders, searchQuery, filterPincode, filterAddress]);

  const allSelected  = filtered.length > 0 && filtered.every(o => selectedOrders.includes(o.order_id));
  const someSelected = filtered.some(o => selectedOrders.includes(o.order_id)) && !allSelected;
  const activeCnt    = [filterPincode, filterAddress].filter(Boolean).length;

  const pColor = theme.palette.primary.main;
  const sColor = theme.palette.secondary.main;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4, bgcolor: "background.paper", maxHeight: "90vh",
          border: `1px solid ${theme.palette.divider}`, overflow: "hidden",
        },
      }}
    >
      {/* Accent bar */}
      <Box sx={{ height: 4, background: `linear-gradient(90deg,${sColor},${pColor})` }} />

      {/* Header */}
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(sColor, 0.12), border: `1px solid ${alpha(sColor, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inventory2 sx={{ color: sColor, fontSize: 19 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "'Sora',sans-serif", color: "text.primary" }}>Select Orders</Typography>
              <Typography variant="caption" color="text.secondary">{orders.length} unassigned orders available</Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedOrders.length > 0 && (
              <Chip label={`${selectedOrders.length} selected`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
            )}
            <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search + Filter Bar */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            fullWidth size="small" placeholder="Search reference, customer, address, pincode…"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
              endAdornment: searchQuery ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery("")}><Close fontSize="small" /></IconButton></InputAdornment> : null,
              sx: { borderRadius: 2 },
            }}
          />
          <Badge badgeContent={activeCnt} color="error">
            <Button variant="outlined" startIcon={<FilterList />} onClick={e => setFilterAnchor(e.currentTarget)}
              color={activeCnt ? "primary" : "inherit"} sx={{ borderRadius: 2, whiteSpace: "nowrap" }}>
              Filter
            </Button>
          </Badge>
          {activeCnt > 0 && <Button size="small" color="error" onClick={clearFilters}>Clear</Button>}
        </Box>

        {/* Active filter chips */}
        {activeCnt > 0 && (
          <Box sx={{ px: 2.5, py: 1, display: "flex", gap: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
            {filterPincode && <Chip size="small" label={`Pincode: ${filterPincode}`} onDelete={() => setFilterPincode("")} color="primary" variant="outlined" />}
            {filterAddress && <Chip size="small" label={`Address: "${filterAddress}"`} onDelete={() => setFilterAddress("")} color="primary" variant="outlined" />}
          </Box>
        )}

        {/* Filter Menu */}
        <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}
          PaperProps={{ sx: { borderRadius: 3, minWidth: 280, p: 2, border: `1px solid ${theme.palette.divider}` } }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Filter by Location</Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Pincode</InputLabel>
              <Select value={filterPincode} onChange={e => setFilterPincode(e.target.value)} label="Pincode">
                <MenuItem value="">All Pincodes</MenuItem>
                {uniquePincodes.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small" label="Address contains" value={filterAddress} onChange={e => setFilterAddress(e.target.value)}
              placeholder="e.g. Mumbai, Andheri…"
              InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn sx={{ fontSize: 16, color: "text.disabled" }} /></InputAdornment> }}
            />
            <Button variant="contained" onClick={() => setFilterAnchor(null)} sx={{ borderRadius: 2 }}>Apply</Button>
          </Stack>
        </Menu>

        {/* Table */}
        {loading
          ? <Box display="flex" justifyContent="center" alignItems="center" py={8}><CircularProgress color="primary" /></Box>
          : error
            ? <Box p={3}><Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert></Box>
            : (
              <TableContainer sx={{ maxHeight: "calc(90vh - 290px)", overflowY: "auto" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: isDark ? alpha(theme.palette.background.default, 0.7) : alpha(pColor, 0.04), borderBottom: `2px solid ${theme.palette.divider}` }}>
                        <Tooltip title={allSelected ? "Deselect all" : "Select all visible"}>
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            onChange={handleSelectAll}
                            color="primary"
                            icon={<CheckBoxOutlineBlank />}
                            checkedIcon={<CheckBox />}
                            indeterminateIcon={<IndeterminateCheckBox />}
                          />
                        </Tooltip>
                      </TableCell>
                      {["Order Ref", "Customer", "Address & Pincode", "Items", "Details"].map(h => (
                        <TableCell key={h} sx={{ bgcolor: isDark ? alpha(theme.palette.background.default, 0.7) : alpha(pColor, 0.04), borderBottom: `2px solid ${theme.palette.divider}`, color: "text.secondary", fontWeight: 700, fontSize: "0.67rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.length === 0
                      ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.disabled" }}>No orders match your filters</TableCell></TableRow>
                      : filtered.map(order => {
                          const isSel = selectedOrders.includes(order.order_id);
                          const isExp = expandedOrders[order.order_id];
                          return (
                            <React.Fragment key={order.order_id}>
                              <TableRow
                                hover
                                selected={isSel}
                                sx={{
                                  cursor: "pointer",
                                  bgcolor: isSel ? alpha(pColor, 0.06) : "transparent",
                                  "&:hover": { bgcolor: alpha(pColor, 0.04) },
                                  "&.Mui-selected": { bgcolor: `${alpha(pColor, 0.06)} !important` },
                                  transition: "background .15s",
                                }}
                              >
                                <TableCell padding="checkbox" onClick={() => handleToggle(order.order_id)}>
                                  <Checkbox checked={isSel} color="primary" icon={<CheckBoxOutlineBlank />} checkedIcon={<CheckBox />} />
                                </TableCell>
                                <TableCell onClick={() => handleToggle(order.order_id)}>
                                  <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.82rem" }}>
                                    {order.order_reference}
                                  </Typography>
                                </TableCell>
                                <TableCell onClick={() => handleToggle(order.order_id)}>
                                  <Typography variant="body2" fontWeight={600}>{order.customer_name}</Typography>
                                </TableCell>
                                <TableCell onClick={() => handleToggle(order.order_id)}>
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <LocationOn sx={{ fontSize: 13, color: "text.disabled" }} />
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
                                      {order.customer_address || "—"}
                                    </Typography>
                                  </Box>
                                  {order.pincode && (
                                    <Chip label={order.pincode} size="small" variant="outlined"
                                      sx={{ mt: 0.5, height: 18, fontSize: "0.62rem" }} />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip label={`${order.total_items} items`} size="small" color="secondary" variant="outlined"
                                    sx={{ fontWeight: 700, fontSize: "0.68rem", height: 22 }} />
                                </TableCell>
                                <TableCell>
                                  <Tooltip title={isExp ? "Hide items" : "Show items"}>
                                    <IconButton size="small" onClick={() => toggleExpand(order.order_id)}>
                                      {isExp ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>

                              {/* Expanded items */}
                              <TableRow>
                                <TableCell colSpan={6} sx={{ p: 0, border: "none" }}>
                                  <Collapse in={isExp} timeout="auto" unmountOnExit>
                                    <Box sx={{ mx: 6, my: 1, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${theme.palette.divider}` }}>
                                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                        Items in this order
                                      </Typography>
                                      {!orderItems[order.order_id]
                                        ? <Box display="flex" justifyContent="center" py={2}><CircularProgress size={18} color="primary" /></Box>
                                        : <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                                            {orderItems[order.order_id].map(item => (
                                              <Box key={item.item_id} sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.05), border: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", gap: 1 }}>
                                                <Typography variant="body2">
                                                  {item.product_name}
                                                  <Typography component="span" variant="body2" color="text.disabled"> ×{item.quantity}</Typography>
                                                </Typography>
                                                {item.is_fragile && (
                                                  <Chip icon={<BrokenImage sx={{ fontSize: "11px !important" }} />} label="Fragile" size="small" color="error"
                                                    sx={{ height: 18, fontSize: "0.6rem" }} />
                                                )}
                                              </Box>
                                            ))}
                                          </Box>
                                      }
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })
                    }
                  </TableBody>
                </Table>
              </TableContainer>
            )
        }
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 2.5, py: 2, gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
          {filtered.length} of {orders.length} orders shown
        </Typography>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={selectedOrders.length === 0}
          onClick={() => onConfirm(selectedOrders, orders)}
          startIcon={<Done />}
          color="secondary"
          sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          Confirm {selectedOrders.length > 0 ? `(${selectedOrders.length})` : ""} Orders
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrdersSelectionModal;
