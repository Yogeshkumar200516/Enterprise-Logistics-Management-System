import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  useTheme,
  Stack,
  Divider,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import api from "../../../context/Api";

/* ===============================
   DEFAULT FORM STATE
================================ */
const emptyForm = {
  role: "",
  username: "",
  full_name: "",
  email: "",
  phone_number: "",
  password: "",
  tenant_id: "",
  is_external_driver: false,
  license_number: "",
  vehicle_type: "",
  vehicle_number: "",
};

const AddUserModal = ({ open, onClose, refresh, editData }) => {
  const theme = useTheme();

  const [form, setForm] = useState(emptyForm);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [companies, setCompanies] = useState([]);

  /* ===============================
     Decode JWT
  ================================ */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedInUser(jwtDecode(token));
    }
  }, []);

  /* ===============================
     Fetch Companies (Superadmin)
  ================================ */
  useEffect(() => {
    if (loggedInUser?.role === "superadmin") {
      fetchCompanies();
    }
  }, [loggedInUser]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/api/companies");
      setCompanies(res.data?.data || []);
    } catch (err) {
      console.error("Fetch companies error:", err);
    }
  };

  /* ===============================
     Populate / Reset Form
  ================================ */
  useEffect(() => {
    if (editData) {
      setForm({
        role: editData.role || "",
        username: editData.username || "",
        full_name: editData.full_name || "",
        email: editData.email || "",
        phone_number: editData.phone_number || "",
        password: "",
        tenant_id: editData.tenant_id || "",
        is_external_driver: editData.is_external_driver || false,
        license_number: editData.license_number || "",
        vehicle_type: editData.vehicle_type || "",
        vehicle_number: editData.vehicle_number || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editData, open]);

  /* ===============================
     Handle Input Change
  ================================ */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Reset tenant if role changes
    if (name === "role") {
      setForm((prev) => ({
        ...prev,
        role: value,
        tenant_id: "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ===============================
     Submit Handler
  ================================ */
  const handleSubmit = async () => {
    try {
      if (!loggedInUser) return;

      /* ===============================
         BASIC VALIDATION
      ================================ */
      if (!form.role) {
        alert("Role is required");
        return;
      }

      if (!form.full_name) {
        alert("Full name is required");
        return;
      }

      /* ===============================
         BASE PAYLOAD
      ================================ */
      const payload = {
        role: form.role,
        full_name: form.full_name,
        email: form.email || null,
        phone_number: form.phone_number || null,
        status: "ACTIVE",
      };

      /* ===============================
         TENANT RULES
      ================================ */
      if (loggedInUser.role === "superadmin") {
        if (form.role !== "superadmin") {
          if (!form.tenant_id) {
            alert("Please select a company");
            return;
          }
          payload.tenant_id = form.tenant_id;
        }
      }
      // admin / supervisor → tenant comes from JWT in backend

      /* ===============================
         DRIVER FIELDS
      ================================ */
      if (form.role === "user") {
        payload.is_external_driver = form.is_external_driver;
        payload.license_number = form.license_number || null;
        payload.vehicle_type = form.vehicle_type || null;
        payload.vehicle_number = form.vehicle_number || null;
      }

      /* ===============================
         ADD MODE
      ================================ */
      if (!editData) {
        if (!form.username || !form.password) {
          alert("Username and password are required");
          return;
        }

        payload.username = form.username;
        payload.password = form.password;

        await api.post("/api/users/", payload);
      }

      /* ===============================
         EDIT MODE
      ================================ */
      if (editData) {
        if (form.password) {
          payload.password = form.password;
        }

        await api.put(`/api/users/${editData.user_id}`, payload);
      }

      refresh();
      onClose();
    } catch (error) {
      console.error("User save error:", error);
      alert(error.response?.data?.message || "Failed to save user");
    }
  };

  /* ===============================
     Role Options
  ================================ */
  const roleOptions = () => {
    if (loggedInUser?.role === "superadmin") {
      return ["superadmin", "admin", "supervisor", "user"];
    }
    if (loggedInUser?.role === "admin") {
      return ["supervisor", "user"];
    }
    return [];
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: "92%", sm: 500 },
          bgcolor: theme.palette.background.paper,
          p: 3,
          m: "auto",
          mt: 6,
          borderRadius: 2,
          boxShadow: theme.shadows[6],
          height: "80%",
          overflowY: "auto",
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {editData ? "Edit User" : "Add User"}
        </Typography>

        <Stack spacing={2}>
          {/* COMPANY SELECT (SUPERADMIN ONLY) */}
          {loggedInUser?.role === "superadmin" &&
            form.role &&
            form.role !== "superadmin" &&
            !editData && (
              <TextField
                select
                label="Select Company"
                name="tenant_id"
                value={form.tenant_id}
                onChange={handleChange}
                fullWidth
              >
                {companies.map((c) => (
                  <MenuItem key={c.tenant_id} value={c.tenant_id}>
                    {c.company_name} ({c.company_code}) — ID: {c.tenant_id}
                  </MenuItem>
                ))}
              </TextField>
            )}

          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            disabled={!!editData}
            fullWidth
          />

          <TextField
            label="Full Name"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Phone Number"
            name="phone_number"
            value={form.phone_number}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            select
            label="Role"
            name="role"
            value={form.role}
            onChange={handleChange}
            fullWidth
          >
            {roleOptions().map((role) => (
              <MenuItem key={role} value={role}>
                {role.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>

          {!editData && (
            <TextField
              type="password"
              label="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
            />
          )}

          {/* DRIVER SECTION */}
          {form.role === "user" && (
            <>
              <Divider />

              <TextField
                label="License Number"
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
                fullWidth
              />

              <TextField
                label="Vehicle Type"
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={handleChange}
                fullWidth
              />

              <TextField
                label="Vehicle Number"
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                fullWidth
              />
            </>
          )}

          <Button variant="contained" size="large" onClick={handleSubmit}>
            {editData ? "Update User" : "Add User"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default AddUserModal;
