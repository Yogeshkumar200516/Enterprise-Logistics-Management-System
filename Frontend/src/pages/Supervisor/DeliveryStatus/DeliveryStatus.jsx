// src/pages/Supervisor/DeliveryStatus.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
} from "@mui/material";
import {
  Visibility,
  Edit,
  Refresh,
  Search,
  LocalShipping,
  Person,
  Assignment,
  CheckCircle,
  HourglassEmpty,
  DirectionsCar,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import api from "../../../context/Api";
import { useAuth } from "../../../context/AuthContext";

const SupervisorDeliveryStatus = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateStatusDialog, setUpdateStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const [expandedRows, setExpandedRows] = useState({});

  const statusColors = {
    ASSIGNED: "warning",
    IN_TRANSIT: "info",
    DELIVERED: "success",
    PARTIALLY_DELIVERED: "secondary",
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [searchTerm, statusFilter, assignments]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/delivery-logger/assignments");
      setAssignments(response.data.assignments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch delivery assignments");
    } finally {
      setLoading(false);
    }
  };

  const filterAssignments = () => {
    let filtered = assignments;

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.delivery_id?.toString().includes(searchTerm)
      );
    }

    setFilteredAssignments(filtered);
  };

  const handleViewDetails = async (deliveryId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/delivery-logger/assignment/${deliveryId}`);
      setAssignmentDetails(response.data);
      setSelectedAssignment(deliveryId);
      setDetailsDialogOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch assignment details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !selectedAssignment) return;

    try {
      setLoading(true);
      await api.patch(`/api/delivery-logger/update-status/${selectedAssignment}`, {
        status: newStatus,
      });
      setSuccess("Delivery status updated successfully");
      setUpdateStatusDialog(false);
      setNewStatus("");
      fetchAssignments();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const openUpdateDialog = (deliveryId, currentStatus) => {
    setSelectedAssignment(deliveryId);
    setNewStatus(currentStatus);
    setUpdateStatusDialog(true);
  };

  const toggleRowExpand = (deliveryId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [deliveryId]: !prev[deliveryId],
    }));
  };

  const getProgressPercentage = (delivered, total) => {
    if (total === 0) return 0;
    return Math.round((delivered / total) * 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <Typography variant="h4" fontWeight="bold">
            Delivery Status
          </Typography>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchAssignments}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by vehicle, driver, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="ASSIGNED">Assigned</MenuItem>
                <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="PARTIALLY_DELIVERED">Partially Delivered</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "warning.light" }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">
                  {assignments.filter((a) => a.status === "ASSIGNED").length}
                </Typography>
                <Typography variant="body2">Assigned</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "info.light" }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">
                  {assignments.filter((a) => a.status === "IN_TRANSIT").length}
                </Typography>
                <Typography variant="body2">In Transit</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "success.light" }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">
                  {assignments.filter((a) => a.status === "DELIVERED").length}
                </Typography>
                <Typography variant="body2">Delivered</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "secondary.light" }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">
                  {assignments.filter((a) => a.status === "PARTIALLY_DELIVERED").length}
                </Typography>
                <Typography variant="body2">Partial</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assignments Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Orders</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Assigned Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No delivery assignments found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <React.Fragment key={assignment.delivery_id}>
                      <TableRow hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            #{assignment.delivery_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <LocalShipping fontSize="small" color="primary" />
                            <Box>
                              <Typography variant="body2">{assignment.vehicle_number}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {assignment.vehicle_type}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Person fontSize="small" color="primary" />
                            <Box>
                              <Typography variant="body2">{assignment.driver_name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {assignment.driver_phone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={assignment.status}
                            color={statusColors[assignment.status] || "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${assignment.total_orders} orders`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {assignment.delivered_items}/{assignment.total_items} items
                            </Typography>
                            <Box
                              sx={{
                                width: "100%",
                                height: 6,
                                bgcolor: "action.hover",
                                borderRadius: 1,
                                mt: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${getProgressPercentage(
                                    assignment.delivered_items,
                                    assignment.total_items
                                  )}%`,
                                  height: "100%",
                                  bgcolor: "success.main",
                                  borderRadius: 1,
                                }}
                              />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(assignment.assigned_at).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(assignment.delivery_id)}
                              color="primary"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Update Status">
                            <IconButton
                              size="small"
                              onClick={() => openUpdateDialog(assignment.delivery_id, assignment.status)}
                              color="secondary"
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={expandedRows[assignment.delivery_id] ? "Collapse" : "Expand"}>
                            <IconButton
                              size="small"
                              onClick={() => toggleRowExpand(assignment.delivery_id)}
                            >
                              {expandedRows[assignment.delivery_id] ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 0, border: 0 }}>
                          <Collapse in={expandedRows[assignment.delivery_id]} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Quick Summary
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body2" color="text.secondary">
                                    Supervisor: {assignment.supervisor_name}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body2" color="text.secondary">
                                    Total Items: {assignment.total_items}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body2" color="text.secondary">
                                    Damaged: {assignment.damaged_items || 0}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Delivery Assignment Details</DialogTitle>
        <DialogContent>
          {assignmentDetails && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Vehicle Information
                    </Typography>
                    <Typography variant="body2">
                      Number: {assignmentDetails.assignment.vehicle_number}
                    </Typography>
                    <Typography variant="body2">
                      Type: {assignmentDetails.assignment.vehicle_type}
                    </Typography>
                    <Typography variant="body2">
                      Capacity: {assignmentDetails.assignment.capacity}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Driver Information
                    </Typography>
                    <Typography variant="body2">
                      Name: {assignmentDetails.assignment.driver_name}
                    </Typography>
                    <Typography variant="body2">
                      Phone: {assignmentDetails.assignment.driver_phone}
                    </Typography>
                    <Typography variant="body2">
                      Email: {assignmentDetails.assignment.driver_email}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Delivery Items
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order Ref</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignmentDetails.items.map((item) => (
                      <TableRow key={item.delivery_item_id}>
                        <TableCell>{item.order_reference}</TableCell>
                        <TableCell>
                          {item.product_name} (Qty: {item.quantity})
                          {item.is_fragile && (
                            <Chip label="Fragile" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.customer_name}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {item.customer_address}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.delivery_status}
                            size="small"
                            color={item.delivery_status === "DELIVERED" ? "success" : "default"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateStatusDialog} onClose={() => setUpdateStatusDialog(false)}>
        <DialogTitle>Update Delivery Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select value={newStatus} label="New Status" onChange={(e) => setNewStatus(e.target.value)}>
              <MenuItem value="ASSIGNED">Assigned</MenuItem>
              <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="PARTIALLY_DELIVERED">Partially Delivered</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateStatusDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateStatus}
            disabled={loading || !newStatus}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupervisorDeliveryStatus;
