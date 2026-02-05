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
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import api from "../../../context/Api";

/* ===============================
   DEFAULT FORM
   (tenant_id intentionally omitted)
================================ */
const emptyForm = {
  role: "",
  username: "",
  full_name: "",
  email: "",
  phone_number: "",
  password: "",
  license_number: "",
  vehicle_type: "",
  vehicle_number: "",
};

const AddUserModal = ({ open, onClose, refresh, editData }) => {
  const theme = useTheme();

  const [form, setForm] = useState(emptyForm);
  const [loggedInUser, setLoggedInUser] = useState(null);

  /* ===============================
     Decode JWT ONCE
  ================================ */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedInUser(jwtDecode(token));
    }
  }, []);

  /* ===============================
     Populate form (Add / Edit)
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
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /* ===============================
     Axios Config
  ================================ */
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  /* ===============================
     SUBMIT LOGIC (FIXED & SAFE)
  ================================ */
 const handleSubmit = async () => {
  try {
    if (!loggedInUser) return;

    const payload = {
      role: form.role,
      full_name: form.full_name,
      email: form.email,
      phone_number: form.phone_number || null,
      is_external_driver: false,
      license_number: form.license_number || null,
      vehicle_type: form.vehicle_type || null,
      vehicle_number: form.vehicle_number || null,
    };

    /* ===============================
       EDIT MODE
    ================================ */
    if (editData) {
      // Optional password
      if (form.password) {
        payload.password = form.password;
      }

      // Tenant handling
      if (editData.role !== "superadmin") {
        payload.tenant_id = editData.tenant_id;
      }

      console.log("EDIT PAYLOAD →", payload);

      await api.put(
        `/api/users/${editData.user_id}`,
        payload,
        axiosConfig
      );

      refresh();
      onClose();
      return;
    }

    /* ===============================
       ADD MODE
    ================================ */

    if (payload.role === "superadmin") {
      delete payload.tenant_id;
    }

    if (
      loggedInUser.role === "superadmin" &&
      payload.role !== "superadmin"
    ) {
      if (!form.tenant_id) {
        alert("Tenant is required");
        return;
      }
      payload.tenant_id = form.tenant_id;
    }

    if (loggedInUser.role !== "superadmin") {
      delete payload.tenant_id;
    }

    payload.username = form.username;
    payload.password = form.password;

    await api.post(`/api/users/add`, payload, axiosConfig);

    refresh();
    onClose();
  } catch (err) {
    console.error("User save error", err);
    alert(err.response?.data?.message || "Failed to save user");
  }
};



  /* ===============================
     Role Options
  ================================ */
  const roleOptions = () => {
    if (loggedInUser?.role === "superadmin") {
      return [
        { label: "Admin", value: "admin" },
        { label: "Supervisor", value: "supervisor" },
        { label: "User", value: "user" },
        { label: "Super Admin", value: "superadmin" },
      ];
    }

    if (loggedInUser?.role === "admin") {
      return [
        { label: "Admin", value: "admin" },
        { label: "Supervisor", value: "supervisor" },
        { label: "User", value: "user" },
      ];
    }

    return [];
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: "90%", sm: 450 },
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          p: 3,
          m: "auto",
          mt: 8,
          borderRadius: 2,
          boxShadow: theme.shadows[6],
        }}
      >
        <Typography variant="h6" mb={2} fontWeight="bold">
          {editData ? "Edit User" : "Add User"}
        </Typography>

        <Stack spacing={2}>
          {/* TENANT SELECT (ONLY WHEN REQUIRED) */}
          {loggedInUser?.role === "superadmin" &&
            !editData &&
            form.role !== "superadmin" && (
              <TextField
                select
                label="Tenant ID"
                name="tenant_id"
                value={form.tenant_id || ""}
                onChange={handleChange}
                fullWidth
              >
                <MenuItem value={1}>Tenant 1</MenuItem>
                <MenuItem value={2}>Tenant 2</MenuItem>
              </TextField>
            )}

          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
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
            select
            label="Role"
            name="role"
            value={form.role}
            onChange={handleChange}
            fullWidth
          >
            {roleOptions().map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
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

          <Button variant="contained" size="large" onClick={handleSubmit}>
            {editData ? "Update User" : "Add User"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default AddUserModal;
