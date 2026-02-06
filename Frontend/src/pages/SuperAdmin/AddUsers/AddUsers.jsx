import React, { useEffect, useMemo, useState } from "react";
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
  Chip,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddUserModal from "./AddUserModal";
import api from "../../../context/Api";

const AddAdminUser = () => {
  const theme = useTheme();

  // ===============================
  // STATE
  // ===============================
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // ===============================
  // FETCH USERS
  // ===============================
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/api/users");
      setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error("Fetch users error:", error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ===============================
  // FETCH COMPANIES (SUPERADMIN)
  // ===============================
  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const res = await api.get("/api/companies");

      setCompanies(
        Array.isArray(res.data?.data) ? res.data.data : []
      );
    } catch (error) {
      console.error("Fetch companies error:", error);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  // ===============================
  // DELETE USER
  // ===============================
  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/api/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error("Delete user error:", error);
      alert("Failed to delete user");
    }
  };

  // ===============================
  // FILTER USERS
  // ===============================
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        `${u.username} ${u.full_name} ${u.email} ${u.role}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesRole = roleFilter ? u.role === roleFilter : true;

      const matchesCompany = companyFilter
        ? String(u.tenant_id) === companyFilter
        : true;

      return matchesSearch && matchesRole && matchesCompany;
    });
  }, [users, search, roleFilter, companyFilter]);

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Card
        sx={{
          bgcolor: theme.palette.background.paper,
          boxShadow: theme.shadows[4],
        }}
      >
        <CardContent>
          {/* ================= HEADER ================= */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
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
                setOpen(true);
              }}
            >
              Add User
            </Button>
          </Stack>

          {/* ================= FILTERS ================= */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2}>
            {/* Search */}
            <TextField
              fullWidth
              size="small"
              label="Search users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Company Filter */}
            <TextField
              select
              size="small"
              label="Filter by Company"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              sx={{ minWidth: 240 }}
              disabled={loadingCompanies}
            >
              <MenuItem value="">All Companies</MenuItem>

              {companies.map((company) => (
                <MenuItem
                  key={company.tenant_id}
                  value={String(company.tenant_id)}
                >
                  {company.company_name}
                </MenuItem>
              ))}
            </TextField>

            {/* Role Filter */}
            <TextField
              select
              size="small"
              label="Filter by Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="superadmin">Super Admin</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </TextField>
          </Stack>

          {/* ================= TABLE ================= */}
          <Box sx={{ overflowX: "auto", mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loadingUsers && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={22} />
                    </TableCell>
                  </TableRow>
                )}

                {!loadingUsers && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                )}

                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.full_name}</TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={user.role}
                        color={
                          user.role === "superadmin"
                            ? "secondary"
                            : user.role === "admin"
                            ? "primary"
                            : "default"
                        }
                      />
                    </TableCell>

                    <TableCell>{user.email}</TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={user.status}
                        color={
                          user.status === "ACTIVE"
                            ? "success"
                            : user.status === "SUSPENDED"
                            ? "warning"
                            : "error"
                        }
                      />
                    </TableCell>

                    <TableCell align="center">
                      <IconButton
                        onClick={() => {
                          setEditData(user);
                          setOpen(true);
                        }}
                      >
                        <EditIcon color="primary" />
                      </IconButton>

                      <IconButton
                        onClick={() => handleDelete(user.user_id)}
                      >
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

      {/* ================= MODAL ================= */}
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
