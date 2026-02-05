import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
import axios from "axios";
import api from "../../../context/Api";

const AddCompanyModal = ({ open, onClose, refresh, editData }) => {
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    if (editData) {
      setCompanyName(editData.company_name);
      setCompanyCode(editData.company_code);
      setStatus(editData.status);
    } else {
      setCompanyName("");
      setCompanyCode("");
      setStatus("ACTIVE");
    }
  }, [editData]);

  const handleSubmit = async () => {
    try {
      if (editData) {
        await api.put(
          `/api/companies/${editData.tenant_id}`,
          { company_name: companyName, company_code: companyCode, status }
        );
      } else {
        await api.post("/api/companies/add", {
          company_name: companyName,
          company_code: companyCode,
          status,
        });
      }

      refresh();
      onClose();
    } catch (err) {
      alert("Operation failed");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {editData ? "Edit Company" : "Add Company"}
      </DialogTitle>

      <DialogContent>
        <TextField
          fullWidth
          label="Company Name"
          margin="normal"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <TextField
          fullWidth
          label="Company Code"
          margin="normal"
          value={companyCode}
          onChange={(e) => setCompanyCode(e.target.value)}
        />

        <TextField
          fullWidth
          select
          label="Status"
          margin="normal"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <MenuItem value="ACTIVE">ACTIVE</MenuItem>
          <MenuItem value="INACTIVE">INACTIVE</MenuItem>
        </TextField>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {editData ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCompanyModal;
