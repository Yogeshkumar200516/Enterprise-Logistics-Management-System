import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  MenuItem,
  Stack,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
} from "@mui/icons-material";

import api from "../../../context/Api";
import { useAuth } from "../../../context/AuthContext";
import AddUserModal from "./AddUserModal";

function AddUsers() {
  const { user } = useAuth();

  // ================= STATES =================
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");

      const usersArray =
        Array.isArray(res.data) ? res.data :
        Array.isArray(res.data.users) ? res.data.users :
        Array.isArray(res.data.data) ? res.data.data :
        [];

      setUsers(usersArray);
    } catch (err) {
      console.error("Fetch users failed", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ================= FILTERED USERS =================
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search.trim() ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter
        ? u.role === roleFilter
        : true;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // ================= DELETE USER =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Box p={3}>
      {/* ================= HEADER ================= */}
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Company Users
        </Typography>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingUser(null);
            setOpenModal(true);
          }}
        >
          Add User
        </Button>
      </Box>

      {/* ================= SEARCH & FILTER ================= */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        mb={3}
      >
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        {/* Role Filter */}
        <TextField
          select
          size="medium"
          label="Filter by Role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All Roles</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="supervisor">Supervisor</MenuItem>
          <MenuItem value="user">User</MenuItem>
        </TextField>
      </Stack>

      {/* ================= TABLE ================= */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <TableRow key={u.user_id} hover>
                    <TableCell>{u.user_id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {u.role}
                    </TableCell>
                    <TableCell>{u.status}</TableCell>

                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => {
                            setEditingUser(u);
                            setOpenModal(true);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(u.user_id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ================= MODAL ================= */}
      <AddUserModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        refreshUsers={fetchUsers}
        editData={editingUser}
      />
    </Box>
  );
}

export default AddUsers;
