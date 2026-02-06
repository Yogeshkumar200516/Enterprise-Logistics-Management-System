import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
} from "@mui/material";
import api from "../../../context/Api";

const AddCompanyModal = ({ open, onClose, refresh, editData }) => {
  const [form, setForm] = useState({
    company_name: "",
    company_code: "",
    phone_no: "",
    email: "",
    address: "",
    state: "",
    pincode: "",
    gst_no: "",
    pan_no: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (editData) {
      setForm({
        company_name: editData.company_name || "",
        company_code: editData.company_code || "",
        phone_no: editData.phone_no || "",
        email: editData.email || "",
        address: editData.address || "",
        state: editData.state || "",
        pincode: editData.pincode || "",
        gst_no: editData.gst_no || "",
        pan_no: editData.pan_no || "",
        status: editData.status || "ACTIVE",
      });
    } else {
      setForm({
        company_name: "",
        company_code: "",
        phone_no: "",
        email: "",
        address: "",
        state: "",
        pincode: "",
        gst_no: "",
        pan_no: "",
        status: "ACTIVE",
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.company_name || !form.company_code) {
      alert("Company Name and Company Code are required");
      return;
    }

    try {
      if (editData) {
        await api.put(`/api/companies/${editData.tenant_id}`, form);
      } else {
        await api.post("/api/companies/add", form);
      }

      refresh();
      onClose();
    } catch (error) {
      console.error("Save Company Error:", error);
      alert(error.response?.data?.message || "Operation failed");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {editData ? "Edit Company" : "Add Company"}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Basic Info */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Name"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Code"
              name="company_code"
              value={form.company_code}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              name="phone_no"
              value={form.phone_no}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              type="email"
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <TextField
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="State"
              name="state"
              value={form.state}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Pincode"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="INACTIVE">INACTIVE</MenuItem>
            </TextField>
          </Grid>

          {/* Tax Info */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="GST Number"
              name="gst_no"
              value={form.gst_no}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="PAN Number"
              name="pan_no"
              value={form.pan_no}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{ fontWeight: "bold", textTransform: "none" }}
        >
          {editData ? "Update Company" : "Add Company"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCompanyModal;
