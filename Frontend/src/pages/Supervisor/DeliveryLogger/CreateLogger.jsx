import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import api from "../../../context/Api";
import SelectOrders from "./SelectOrders";

const CreateLogger = ({ open, onClose, onCreated }) => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [orders, setOrders] = useState([]);

  const [openOrders, setOpenOrders] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDrivers();
      fetchVehicles();
    }
  }, [open]);

  const fetchDrivers = async () => {
    const res = await api.get("/api/delivery-logger/delivery/drivers");
    setDrivers(res.data.data);
  };

  const fetchVehicles = async () => {
    const res = await api.get("/api/delivery-logger/delivery/vehicles");
    setVehicles(res.data.data);
  };

  const handleCreate = async () => {
    await api.post("/api/delivery-logger/delivery", {
      driver_id: driverId,
      vehicle_id: vehicleId,
      order_ids: orders.map((o) => o.order_id),
    });

    onCreated();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create Delivery Logger</DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Select Driver"
              select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              fullWidth
            >
              {drivers.map((d) => (
                <MenuItem key={d.user_id} value={d.user_id}>
                  {d.full_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Select Vehicle"
              select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              fullWidth
            >
              {vehicles.map((v) => (
                <MenuItem key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_number}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="outlined"
              onClick={() => setOpenOrders(true)}
            >
              Select Orders ({orders.length})
            </Button>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!driverId || !vehicleId || orders.length === 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <SelectOrders
        open={openOrders}
        onClose={() => setOpenOrders(false)}
        selectedOrders={orders}
        setSelectedOrders={setOrders}
      />
    </>
  );
};

export default CreateLogger;
