import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  TextField,
} from "@mui/material";
import api from "../../../context/Api";

const SelectOrders = ({
  open,
  onClose,
  selectedOrders,
  setSelectedOrders,
}) => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) fetchOrders();
  }, [open]);

  const fetchOrders = async () => {
    const res = await api.get("/api/delivery-logger/delivery/orders", {
      params: { search },
    });
    setOrders(res.data.data);
  };

  const toggleOrder = (order) => {
    const exists = selectedOrders.find(
      (o) => o.order_id === order.order_id
    );

    if (exists) {
      setSelectedOrders(
        selectedOrders.filter((o) => o.order_id !== order.order_id)
      );
    } else {
      setSelectedOrders([...selectedOrders, order]);
    }
  };

  const selectAll = () => {
    setSelectedOrders(orders);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Orders</DialogTitle>

      <DialogContent>
        <TextField
          label="Search Orders"
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={fetchOrders}
        />

        <Button onClick={selectAll} size="small">
          Select All
        </Button>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Order Ref</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Pincode</TableCell>
              <TableCell>Items</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.order_id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.some(
                      (s) => s.order_id === o.order_id
                    )}
                    onChange={() => toggleOrder(o)}
                  />
                </TableCell>
                <TableCell>{o.order_reference}</TableCell>
                <TableCell>{o.customer_name}</TableCell>
                <TableCell>{o.customer_address}</TableCell>
                <TableCell>{o.pincode}</TableCell>
                <TableCell>{o.total_items}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectOrders;
