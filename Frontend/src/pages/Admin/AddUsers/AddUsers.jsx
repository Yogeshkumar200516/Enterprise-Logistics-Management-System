// src/pages/AddUsers.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField,
  InputAdornment, Tooltip, MenuItem, Chip, Paper,
  Skeleton, alpha, useTheme, FormControl, InputLabel, Select,
} from "@mui/material";
import {
  Add, Edit, Delete, Search, People,
  Refresh, AdminPanelSettings, SupervisorAccount, Person,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import api from "../../../context/Api";
import { useAuth } from "../../../context/AuthContext";
import AddUserModal from "./AddUserModal";

const MotionTableRow = motion(TableRow);

const ROLE_CONFIG = {
  superadmin: { label: "Super Admin",  color: "error",   icon: <AdminPanelSettings sx={{ fontSize: 14 }} /> },
  admin:      { label: "Admin",        color: "primary", icon: <AdminPanelSettings sx={{ fontSize: 14 }} /> },
  supervisor: { label: "Supervisor",   color: "warning", icon: <SupervisorAccount sx={{ fontSize: 14 }} /> },
  user:       { label: "User",         color: "default", icon: <Person sx={{ fontSize: 14 }} /> },
};

const STATUS_COLOR = { ACTIVE: "success", INACTIVE: "default", SUSPENDED: "error" };

export default function AddUsers() {
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [openModal, setOpenModal]   = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleting, setDeleting]     = useState(null);

  // ─── Fetch ──────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/users");
      const arr =
        Array.isArray(res.data)        ? res.data :
        Array.isArray(res.data.users)  ? res.data.users :
        Array.isArray(res.data.data)   ? res.data.data : [];
      setUsers(arr);
    } catch {
      toast.error("Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ─── Filter ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const s = search.toLowerCase();
      const matchSearch =
        !s ||
        u.username?.toLowerCase().includes(s) ||
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // ─── Delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  // ─── Styles ─────────────────────────────────────────────────────────
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
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
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
            <People sx={{ color: "#22fbff", fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                Company Users
              </Typography>
              <Typography variant="body2" sx={{ color: alpha("#fff", 0.7), mt: 0.3 }}>
                {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={fetchUsers}
                sx={{
                  bgcolor: alpha("#fff", 0.1), color: "#fff",
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
              onClick={() => { setEditingUser(null); setOpenModal(true); }}
              sx={{
                bgcolor: "#22fbff", color: "#024990", fontWeight: 700,
                borderRadius: 2, "&:hover": { bgcolor: "#00e5e9" },
                boxShadow: "0 4px 14px rgba(34,251,255,0.35)",
              }}
            >
              Add User
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            placeholder="Search by name, username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              flex: 1, minWidth: 240,
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
            <InputLabel>Filter by Role</InputLabel>
            <Select
              value={roleFilter}
              label="Filter by Role"
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ borderRadius: 2, background: isDark ? alpha("#fff", 0.05) : "#fff" }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="user">User</MenuItem>
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
                {["#", "User", "Email", "Phone", "Role", "Status", "Actions"].map((h) => (
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
                    <People sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filtered.map((u, idx) => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
                    return (
                      <MotionTableRow
                        key={u.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                        sx={{
                          "&:hover": { bgcolor: isDark ? alpha("#024990", 0.12) : alpha("#024990", 0.04) },
                          opacity: deleting === u.user_id ? 0.4 : 1,
                          transition: "background 0.2s, opacity 0.2s",
                        }}
                      >
                        <TableCell sx={{ color: "text.secondary", fontSize: 13 }}>{idx + 1}</TableCell>

                        {/* User cell with avatar */}
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 36, height: 36, borderRadius: 2,
                                background: "linear-gradient(135deg, #024990, #0369c7)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
                              }}
                            >
                              {u.full_name?.[0]?.toUpperCase() || "U"}
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {u.full_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{u.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{u.phone_number || "—"}</Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={rc.icon}
                            label={rc.label}
                            color={rc.color}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: 12 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={u.status}
                            color={STATUS_COLOR[u.status] || "default"}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: 12 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => { setEditingUser(u); setOpenModal(true); }}
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
                                onClick={() => handleDelete(u.user_id)}
                                disabled={u.user_id === currentUser?.user_id}
                                sx={{
                                  color: "error.main",
                                  "&:hover": { bgcolor: alpha("#f44336", 0.1) },
                                  "&.Mui-disabled": { color: alpha("#f44336", 0.3) },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
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

      <AddUserModal
        open={openModal}
        onClose={() => { setOpenModal(false); setEditingUser(null); }}
        refreshUsers={fetchUsers}
        editData={editingUser}
      />
    </Box>
  );
}