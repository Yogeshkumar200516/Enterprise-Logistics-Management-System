// src/pages/AddResources.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField,
  MenuItem, Stack, Chip, Paper, InputAdornment, Tooltip,
  Skeleton, alpha, useTheme, FormControl, InputLabel, Select,
} from "@mui/material";
import {
  Add, Edit, Delete, Search, FilterList,
  DirectionsCar, Refresh, LocalShipping,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import api from "../../../context/Api";
import AddResourceModal from "./AddResourceModal";

const MotionTableRow = motion(TableRow);

const STATUS_COLOR = {
  AVAILABLE:   "success",
  IN_USE:      "warning",
  MAINTENANCE: "error",
};

export default function AddResources() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [vehicles, setVehicles]         = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tempFilter, setTempFilter]     = useState("");
  const [loading, setLoading]           = useState(true);
  const [openModal, setOpenModal]       = useState(false);
  const [editData, setEditData]         = useState(null);
  const [deleting, setDeleting]         = useState(null);

  // ─── Fetch ──────────────────────────────────────────────────────────
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/resources/vehicles");
      const normalized = (res.data.data || []).map((v) => ({
        ...v,
        is_temporary: Number(v.is_temporary),
      }));
      setVehicles(normalized);
    } catch {
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  // ─── Filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    let data = [...vehicles];
    if (search)
      data = data.filter(
        (v) =>
          v.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
          v.vehicle_type?.toLowerCase().includes(search.toLowerCase())
      );
    if (statusFilter) data = data.filter((v) => v.status === statusFilter);
    if (tempFilter !== "") data = data.filter((v) => v.is_temporary === Number(tempFilter));
    setFiltered(data);
  }, [search, statusFilter, tempFilter, vehicles]);

  // ─── Delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/resources/vehicles/${id}`);
      toast.success("Vehicle deleted");
      fetchVehicles();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  // ─── Styles ─────────────────────────────────────────────────────────
  const headerBg = "linear-gradient(135deg, #024990 0%, #0369c7 100%)";
  const cardBg = isDark
    ? "linear-gradient(135deg, #1e2a32 0%, #162028 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)";

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", bgcolor: "background.default" }}>
      <Toaster position="top-right" />

      {/* ── Header ─────────────────────────────────────────────────── */}
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
            <DirectionsCar sx={{ color: "#22fbff", fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                Vehicle Resources
              </Typography>
              <Typography variant="body2" sx={{ color: alpha("#fff", 0.7), mt: 0.3 }}>
                {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} found
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={fetchVehicles}
                sx={{
                  bgcolor: alpha("#fff", 0.1),
                  color: "#fff",
                  "&:hover": { bgcolor: alpha("#fff", 0.2) },
                  borderRadius: 2,
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => { setEditData(null); setOpenModal(true); }}
              sx={{
                bgcolor: "#22fbff",
                color: "#024990",
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": { bgcolor: "#00e5e9" },
                boxShadow: "0 4px 14px rgba(34,251,255,0.35)",
              }}
            >
              Add Vehicle
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            placeholder="Search vehicle number or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              flex: 1, minWidth: 220,
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

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: 2, background: isDark ? alpha("#fff", 0.05) : "#fff" }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="IN_USE">In Use</MenuItem>
              <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Vehicle Type</InputLabel>
            <Select
              value={tempFilter}
              label="Vehicle Type"
              onChange={(e) => setTempFilter(e.target.value)}
              sx={{ borderRadius: 2, background: isDark ? alpha("#fff", 0.05) : "#fff" }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="0">Permanent</MenuItem>
              <MenuItem value="1">Temporary</MenuItem>
            </Select>
          </FormControl>
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
              <TableRow sx={{ background: isDark ? alpha("#024990", 0.25) : alpha("#024990", 0.07) }}>
                {["#", "Vehicle No", "Type", "Capacity", "Status", "Temporary", "Actions"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700, fontSize: 13,
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <DirectionsCar sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
                    <Typography color="text.secondary">No vehicles found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filtered.map((row, idx) => (
                    <MotionTableRow
                      key={row.vehicle_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      sx={{
                        "&:hover": { bgcolor: isDark ? alpha("#024990", 0.12) : alpha("#024990", 0.04) },
                        opacity: deleting === row.vehicle_id ? 0.4 : 1,
                        transition: "background 0.2s, opacity 0.2s",
                      }}
                    >
                      <TableCell sx={{ color: "text.secondary", fontSize: 13 }}>{idx + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LocalShipping sx={{ fontSize: 16, color: "primary.main" }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.vehicle_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{row.vehicle_type || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.capacity ? `${row.capacity} units` : "—"}
                          size="small"
                          sx={{
                            bgcolor: isDark ? alpha("#22fbff", 0.1) : alpha("#024990", 0.1),
                            color: isDark ? "#22fbff" : "#024990",
                            fontWeight: 600, fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          color={STATUS_COLOR[row.status] || "default"}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: 12 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.is_temporary === 1 ? "Temporary" : "Permanent"}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontWeight: 600, fontSize: 12,
                            borderColor: row.is_temporary ? "warning.main" : "success.main",
                            color: row.is_temporary ? "warning.main" : "success.main",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => { setEditData(row); setOpenModal(true); }}
                              sx={{
                                color: "warning.main",
                                "&:hover": { bgcolor: alpha("#ff9800", 0.1) },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(row.vehicle_id)}
                              sx={{
                                color: "error.main",
                                "&:hover": { bgcolor: alpha("#f44336", 0.1) },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>

      <AddResourceModal
        open={openModal}
        handleClose={() => { setOpenModal(false); setEditData(null); }}
        editData={editData}
        refresh={fetchVehicles}
      />
    </Box>
  );
}