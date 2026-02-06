import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Grid,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import api from "../../../context/Api";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

function AddUserModal({ open, onClose, refreshUsers, editData }) {
  const isEdit = Boolean(editData);

  const [form, setForm] = useState({
    role: "user",
    username: "",
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    is_external_driver: false,
    license_number: "",
    vehicle_number: "",
    vehicle_type: "",
  });

  // ✅ PREFILL EDIT DATA
  useEffect(() => {
    if (editData) {
      setForm({
        ...editData,
        password: "",
      });
    } else {
      setForm({
        role: "user",
        username: "",
        full_name: "",
        email: "",
        phone_number: "",
        password: "",
        is_external_driver: false,
        license_number: "",
        vehicle_number: "",
        vehicle_type: "",
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ✅ SUBMIT
  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await api.put(`/api/users/${editData.user_id}`, form);
      } else {
        await api.post("/api/users", form);
      }

      refreshUsers();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" mb={3}>
          {isEdit ? "Edit User" : "Add User"}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              select
              label="Role"
              name="role"
              value={form.role}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Full Name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Phone"
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          {!isEdit && (
            <Grid item xs={6}>
              <TextField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
          )}

          {/* DRIVER FIELDS ONLY FOR USER */}
          {form.role === "user" && (
            <>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_external_driver}
                      onChange={handleChange}
                      name="is_external_driver"
                    />
                  }
                  label="External Driver"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="License Number"
                  name="license_number"
                  value={form.license_number}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Vehicle Number"
                  name="vehicle_number"
                  value={form.vehicle_number}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Vehicle Type"
                  name="vehicle_type"
                  value={form.vehicle_type}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
            </>
          )}
        </Grid>

        <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default AddUserModal;
