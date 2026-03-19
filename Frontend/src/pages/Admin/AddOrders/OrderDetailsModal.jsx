// src/components/orders/OrderDetailsModal.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent,
  Box, Typography, IconButton, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Paper, Skeleton, alpha, useTheme,
} from "@mui/material";
import {
  Close, ReceiptLong, Person, LocationOn,
  Inventory2, LocalShipping, CheckCircle, PendingActions,
  CalendarToday, Warning,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import api from "../../../context/Api";

const STATUS_CONFIG = {
  NOT_ASSIGNED: { label: "Not Assigned", color: "warning", icon: <PendingActions /> },
  IN_PROGRESS:  { label: "In Progress",  color: "info",    icon: <LocalShipping /> },
  DELIVERED:    { label: "Delivered",    color: "success", icon: <CheckCircle /> },
};

function InfoRow({ icon, label, value, mono }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        py: 1.2,
        px: 2,
        borderRadius: 2,
        "&:hover": { bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#024990", 0.03) },
        transition: "background 0.2s",
      }}
    >
      <Box sx={{ color: "primary.main", mt: 0.2, flexShrink: 0 }}>
        {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, display: "block" }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            wordBreak: "break-word",
            fontFamily: mono ? "monospace" : "inherit",
          }}
        >
          {value || <span style={{ opacity: 0.4 }}>—</span>}
        </Typography>
      </Box>
    </Box>
  );
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && order?.order_id) {
      setLoading(true);
      api.get(`/api/orders/${order.order_id}`)
        .then((res) => setDetails(res.data.data))
        .catch(() => setDetails(null))
        .finally(() => setLoading(false));
    } else {
      setDetails(null);
    }
  }, [open, order]);

  if (!order) return null;
  const sc = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.NOT_ASSIGNED;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={motion.div}
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: '90vh',
          background: isDark
            ? "linear-gradient(135deg, #1e2a32 0%, #162028 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
          border: `1px solid ${isDark ? alpha("#91eff1", 0.12) : alpha("#024990", 0.12)}`,
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.55)"
            : "0 24px 80px rgba(2,73,144,0.18)",
        },
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
            p: 2.5,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: alpha("#22fbff", 0.15),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${alpha("#22fbff", 0.3)}`,
              }}
            >
              <ReceiptLong sx={{ color: "#22fbff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>
                Order Details
              </Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.65) }}>
                ID: #{order.order_id}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={React.cloneElement(sc.icon, { sx: { fontSize: "14px !important" } })}
              label={sc.label}
              color={sc.color}
              size="small"
              sx={{ fontWeight: 700, fontSize: 12 }}
            />
            <IconButton onClick={onClose} sx={{ color: alpha("#fff", 0.7), "&:hover": { color: "#fff" } }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* ── Content ────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" height={48} sx={{ mb: 0.5, borderRadius: 1 }} />
            ))}
          </Box>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* ── Order Info ─────────────────────────────────────── */}
            <Box sx={{ px: 1, pt: 1 }}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.5 }}>
                  Order Information
                </Typography>
              </Box>
              <InfoRow
                icon={<ReceiptLong />}
                label="ORDER REFERENCE"
                value={details?.order_reference}
                mono
              />
              <InfoRow
                icon={<CalendarToday />}
                label="CREATED AT"
                value={details?.created_at
                  ? new Date(details.created_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : null}
              />
              {details?.delivered_at && (
                <InfoRow
                  icon={<CheckCircle />}
                  label="DELIVERED AT"
                  value={new Date(details.delivered_at).toLocaleString("en-IN")}
                />
              )}
            </Box>

            <Divider sx={{ mx: 2, my: 0.5 }} />

            {/* ── Customer ───────────────────────────────────────── */}
            <Box sx={{ px: 1 }}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.5 }}>
                  Customer Information
                </Typography>
              </Box>
              <InfoRow icon={<Person />} label="NAME" value={details?.customer_name} />
              <InfoRow icon={<LocationOn />} label="ADDRESS" value={details?.customer_address} />
              <InfoRow icon={<LocationOn />} label="PINCODE" value={details?.pincode} mono />
            </Box>

            <Divider sx={{ mx: 2, my: 0.5 }} />

            {/* ── Items ─────────────────────────────────────────── */}
            <Box sx={{ px: 1, pb: 2 }}>
              <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.5 }}>
                  Order Items
                </Typography>
                <Chip
                  label={`${details?.items?.length || 0} items`}
                  size="small"
                  sx={{
                    bgcolor: isDark ? alpha("#22fbff", 0.12) : alpha("#024990", 0.1),
                    color: isDark ? "#22fbff" : "#024990",
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                />
              </Box>

              <Box sx={{ px: 2 }}>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1)}`,
                    background: isDark ? alpha("#fff", 0.03) : alpha("#024990", 0.02),
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {["#", "Product", "Qty", "Fragile"].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              fontWeight: 700,
                              fontSize: 12,
                              color: isDark ? "#91eff1" : "#024990",
                              py: 1.2,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(details?.items || []).map((item, i) => (
                        <TableRow key={item.item_id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                          <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{i + 1}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                              <Inventory2 sx={{ fontSize: 15, color: "text.disabled" }} />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {item.product_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.quantity}
                              size="small"
                              sx={{
                                bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.08),
                                fontWeight: 600,
                                fontSize: 12,
                                height: 22,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {item.is_fragile ? (
                              <Chip
                                icon={<Warning sx={{ fontSize: "13px !important" }} />}
                                label="Fragile"
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 600, fontSize: 11, height: 22 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}