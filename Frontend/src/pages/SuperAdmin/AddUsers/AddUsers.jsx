import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  useTheme,
  Stack,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddUserModal from "./AddUserModal";
import api from "../../../context/Api";


const AddAdminUser = () => {
  const theme = useTheme();

  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");

  // ✅ JWT token from localStorage
  const token = localStorage.getItem("token");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // ===============================
  // Fetch Users
  // ===============================
  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users", axiosConfig);
      setUsers(res.data.data || []);
    } catch (err) {
      console.error("Fetch users error", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ===============================
  // Delete User
  // ===============================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/api/users/${id}`, axiosConfig);
      fetchUsers();
    } catch (err) {
      console.error("Delete user error", err);
    }
  };

  // ===============================
  // Search Filter
  // ===============================
  const filteredUsers = users.filter((u) =>
    `${u.username} ${u.full_name} ${u.email} ${u.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Card
        sx={{
          bgcolor: theme.palette.background.paper,
          boxShadow: theme.shadows[4],
        }}
      >
        <CardContent>
          {/* Header */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={2}
            mb={2}
          >
            <Typography variant="h5" fontWeight="bold">
              User Management
            </Typography>

            <Button
  variant="contained"
  onClick={() => {
    setEditData(null);
    setSearch("");      // ✅ CLEAR SEARCH
    setOpen(true);
  }}
>
  Add User
</Button>

          </Stack>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            label="Search users"
            margin="normal"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Table */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                )}

                {filteredUsers.map((u) => (
                  <TableRow key={u.user_id} hover>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => {
                          setEditData(u);
                          setOpen(true);
                        }}
                      >
                        <EditIcon color="primary" />
                      </IconButton>

                      <IconButton onClick={() => handleDelete(u.user_id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <AddUserModal
        open={open}
        onClose={() => setOpen(false)}
        refresh={fetchUsers}
        editData={editData}
      />
    </Box>
  );
};

export default AddAdminUser;
