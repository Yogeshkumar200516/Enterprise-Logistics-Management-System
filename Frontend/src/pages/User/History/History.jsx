// src/pages/DriverHistory.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Chip, Skeleton, alpha, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, Drawer, LinearProgress, Alert,
  Pagination, Tab, Tabs, Grid,
} from "@mui/material";
import {
  LocalShipping, RecyclingRounded,
  Refresh, Close, Visibility, HourglassEmpty,
  CheckCircle, Person, DirectionsCar,
  CalendarMonth, Place, Inventory, WarningAmber,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import api from "../../../context/Api";

const DELIVERY_STATUS_COLORS = {
  ASSIGNED: "#22fbff", IN_TRANSIT: "#ff9800",
  DELIVERED: "#4caf50", PARTIALLY_DELIVERED: "#9c27b0",
};
const SCRAP_STATUS_COLORS = {
  ASSIGNED: "#0891b2", IN_TRANSIT: "#ff9800",
  COMPLETED: "#4caf50", APPROVED: "#22c55e", REJECTED: "#f44336",
};
const ITEM_STATUS_COLORS = { PENDING: "#ff9800", DELIVERED: "#4caf50", DAMAGED: "#f44336" };

const PERIODS = [
  { value: "all", label: "All Time" }, { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" }, { value: "month", label: "Last 30 Days" },
  { value: "year", label: "Last Year" },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay = 0 }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }} style={{ height: "100%" }}>
      <Paper elevation={0} sx={{
        p: 2, height: "100%", borderRadius: 3,
        background: isDark
          ? `linear-gradient(135deg,${alpha(color, 0.15)} 0%,${alpha(color, 0.04)} 100%)`
          : `linear-gradient(135deg,${alpha(color, 0.09)} 0%,${alpha(color, 0.03)} 100%)`,
        border: `1px solid ${alpha(color, isDark ? 0.25 : 0.15)}`,
        display: "flex", alignItems: "center", gap: 1.5,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 22px ${alpha(color, 0.2)}` },
      }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2, flexShrink: 0,
          background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha(color, 0.35)}`,
        }}>
          {React.cloneElement(icon, { sx: { color: "#fff", fontSize: 20 } })}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", display: "block" }}>{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.1 }}>
            {value ?? <Skeleton width={32} />}
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
}

function Section({ title, icon, children }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper elevation={0} sx={{
      borderRadius: 3, overflow: "hidden",
      border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1)}`,
      background: isDark ? "linear-gradient(135deg,#1e2a32 0%,#162028 100%)" : "linear-gradient(135deg,#ffffff 0%,#f4f8ff 100%)",
    }}>
      <Box sx={{ px: 2.5, py: 1.8, background: isDark ? alpha("#024990", 0.2) : alpha("#024990", 0.06), borderBottom: `1px solid ${isDark ? alpha("#fff", 0.07) : alpha("#024990", 0.1)}`, display: "flex", alignItems: "center", gap: 1 }}>
        {React.cloneElement(icon, { sx: { color: isDark ? "#91eff1" : "#024990", fontSize: 20 } })}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDark ? "#91eff1" : "#024990" }}>{title}</Typography>
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Paper>
  );
}

function StatusChip({ status, colorMap }) {
  const color = colorMap[status] || "#888";
  return <Chip label={status?.replace(/_/g, " ")} size="small" sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10 }} />;
}

function InfoRow({ icon, label, value }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: 1.2 }}>
      {React.cloneElement(icon, { sx: { fontSize: 16, color: isDark ? "#91eff1" : "#024990", mt: 0.15, flexShrink: 0 } })}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600, lineHeight: 1 }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function DetailDrawer({ open, onClose, type, id }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    setLoading(true);
    setDetail(null);
    api.get(`/api/driver-history/${type}/${id}`)
      .then((r) => setDetail(r.data.data))
      .catch(() => toast.error("Failed to load details"))
      .finally(() => setLoading(false));
  }, [open, id, type]);

  const isDelivery = type === "delivery";

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, background: isDark ? "#0f2027" : "#f4f8ff", borderLeft: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1)}` } }}>
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1)}`, background: isDark ? alpha("#024990", 0.2) : alpha("#024990", 0.06) }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? "#91eff1" : "#024990" }}>
          {isDelivery ? "Delivery" : "Scrap"} #{id}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: isDark ? "#91eff1" : "#024990" }}><Close /></IconButton>
      </Box>
      <Box sx={{ p: 2.5, overflowY: "auto", height: "100%" }}>
        {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 1 }} />) : !detail ? null : (
          <>
            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: `1px solid ${isDark ? alpha("#fff", 0.07) : alpha("#024990", 0.1)}`, background: isDark ? alpha("#fff", 0.03) : alpha("#024990", 0.02) }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <StatusChip status={detail.status} colorMap={isDelivery ? DELIVERY_STATUS_COLORS : SCRAP_STATUS_COLORS} />
                <Typography variant="caption" color="text.secondary">
                  {new Date(detail.assigned_at || detail.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Typography>
              </Box>
              <InfoRow icon={<Person />}         label="Supervisor"   value={detail.supervisor_name} />
              <InfoRow icon={<DirectionsCar />}   label="Vehicle"      value={`${detail.vehicle_number} (${detail.vehicle_type || "—"})`} />
              {!isDelivery && (
                <>
                  <InfoRow icon={<Place />}         label="Pickup Address" value={detail.pickup_address} />
                  <InfoRow icon={<CalendarMonth />} label="Completed"      value={detail.completed_at ? new Date(detail.completed_at).toLocaleString("en-IN") : null} />
                </>
              )}
            </Paper>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.2, color: isDark ? "#91eff1" : "#024990" }}>
              {isDelivery ? "Items" : "Scrap Items"} ({detail.items?.length || 0})
            </Typography>
            {(detail.items || []).map((item, idx) => (
              <Paper key={idx} elevation={0} sx={{ p: 1.5, mb: 1, borderRadius: 2, border: `1px solid ${isDark ? alpha("#fff", 0.06) : alpha("#024990", 0.08)}`, background: isDark ? alpha("#fff", 0.02) : alpha("#024990", 0.02) }}>
                {isDelivery ? (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product_name}</Typography>
                      <StatusChip status={item.delivery_status} colorMap={ITEM_STATUS_COLORS} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Qty: {item.quantity} · {item.is_fragile ? "⚠ Fragile" : "Standard"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {item.customer_name} — {item.customer_address}
                    </Typography>
                    {item.delivered_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        ✓ {new Date(item.delivered_at).toLocaleString("en-IN")}
                      </Typography>
                    )}
                  </>
                ) : (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.item_description}</Typography>
                      <Chip label={item.collection_status} size="small" sx={{ bgcolor: alpha(ITEM_STATUS_COLORS[item.collection_status] || "#888", 0.15), color: ITEM_STATUS_COLORS[item.collection_status] || "#888", fontWeight: 700, fontSize: 10 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">Qty: {item.quantity}{item.notes ? ` · ${item.notes}` : ""}</Typography>
                  </>
                )}
              </Paper>
            ))}
          </>
        )}
      </Box>
    </Drawer>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserHistory() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [tab, setTab]         = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState(null);
  const [drawer,  setDrawer]  = useState({ open: false, type: null, id: null });
  const [error,   setError]   = useState(null);
  const [filters, setFilters] = useState({ period: "month", status: "", source: "", page: 1, limit: 15 });

  // Load personal stats once
  useEffect(() => {
    api.get("/api/driver-history/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, []);

  const endpoints = ["/api/driver-history/deliveries", "/api/driver-history/scraps"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== "") params.append(k, v); });
      const res = await api.get(`${endpoints[tab]}?${params.toString()}`);
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [tab, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTabChange = (_, v) => {
    setTab(v);
    setFilters((f) => ({ ...f, status: "", source: "", page: 1 }));
    setData([]);
  };

  const sx = { "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 13, bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#024990", 0.03) } };
  const hdr = (label) => <TableCell sx={{ fontWeight: 700, fontSize: 12, color: isDark ? "#91eff1" : "#024990", py: 1.2, whiteSpace: "nowrap" }}>{label}</TableCell>;
  const totalPages = Math.ceil(total / filters.limit);

  const deliveryPct = stats?.deliveryStats?.total_assignments > 0
    ? Math.round((stats.deliveryStats.completed / stats.deliveryStats.total_assignments) * 100)
    : 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", bgcolor: "background.default" }}>
      <Toaster position="top-right" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Box sx={{
          background: "linear-gradient(135deg, #1a3a5c 0%, #024990 50%, #0369c7 100%)",
          borderRadius: 3, p: { xs: 2.5, md: 3 }, mb: 3,
          position: "relative", overflow: "hidden",
          boxShadow: "0 10px 40px rgba(2,73,144,0.3)",
        }}>
          {[180, 110, 65].map((s, i) => (
            <Box key={i} sx={{ position: "absolute", right: 50 * i - 10, top: -s / 3, width: s, height: s, borderRadius: "50%", bgcolor: alpha("#22fbff", 0.06 - i * 0.01), pointerEvents: "none" }} />
          ))}
          <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: "#fff", fontWeight: 800, lineHeight: 1.1 }}>My History</Typography>
              <Typography variant="body2" sx={{ color: "#22fbff", mt: 0.5, fontWeight: 500 }}>
                Your complete delivery and scrap run record
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {stats && (
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body2" sx={{ color: alpha("#fff", 0.7) }}>Completion Rate</Typography>
                  <Typography variant="h6" sx={{ color: "#22fbff", fontWeight: 800 }}>{deliveryPct}%</Typography>
                </Box>
              )}
              <Tooltip title="Refresh"><span>
                <IconButton onClick={fetchData} disabled={loading} sx={{ bgcolor: alpha("#fff", 0.1), color: "#fff", "&:hover": { bgcolor: alpha("#fff", 0.2) }, "&.Mui-disabled": { bgcolor: alpha("#fff", 0.05), color: alpha("#fff", 0.3) } }}>
                  {loading ? <HourglassEmpty fontSize="small" /> : <Refresh />}
                </IconButton>
              </span></Tooltip>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── Stats Cards ───────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { icon: <LocalShipping />,   label: "Total Deliveries",  value: stats?.deliveryStats?.total_assignments, color: "#024990", delay: 0    },
          { icon: <CheckCircle />,     label: "Completed",         value: stats?.deliveryStats?.completed,         color: "#4caf50", delay: 0.06 },
          { icon: <HourglassEmpty />,  label: "In Transit",        value: stats?.deliveryStats?.in_transit,        color: "#ff9800", delay: 0.12 },
          { icon: <Inventory />,       label: "Items Delivered",   value: stats?.itemStats?.delivered_items,       color: "#0891b2", delay: 0.18 },
          { icon: <WarningAmber />,    label: "Items Damaged",     value: stats?.itemStats?.damaged_items,         color: "#f44336", delay: 0.24 },
          { icon: <RecyclingRounded />,label: "Scrap Runs",        value: stats?.scrapStats?.total_scraps,         color: "#9c27b0", delay: 0.30 },
        ].map((c) => (
          <Grid item xs={6} sm={4} md={2} key={c.label}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ mb: 2.5, borderRadius: 2, border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1)}`, background: isDark ? "#1e2a32" : "#fff" }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ "& .MuiTab-root": { fontWeight: 600, fontSize: 13, minHeight: 48 }, "& .Mui-selected": { color: isDark ? "#91eff1" : "#024990" }, "& .MuiTabs-indicator": { bgcolor: isDark ? "#91eff1" : "#024990" } }}>
          <Tab icon={<LocalShipping sx={{ fontSize: 18 }} />} iconPosition="start" label="Deliveries" />
          <Tab icon={<RecyclingRounded sx={{ fontSize: 18 }} />} iconPosition="start" label="Scrap Runs" />
        </Tabs>
      </Paper>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 130, ...sx }}>
          <InputLabel>Period</InputLabel>
          <Select value={filters.period} label="Period" onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value, page: 1 }))}>
            {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150, ...sx }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
            <MenuItem value="">All Statuses</MenuItem>
            {(tab === 0
              ? ["ASSIGNED","IN_TRANSIT","DELIVERED","PARTIALLY_DELIVERED"]
              : ["ASSIGNED","IN_TRANSIT","COMPLETED","APPROVED","REJECTED"]
            ).map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>)}
          </Select>
        </FormControl>

        {tab === 1 && (
          <FormControl size="small" sx={{ minWidth: 130, ...sx }}>
            <InputLabel>Source</InputLabel>
            <Select value={filters.source} label="Source" onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value, page: 1 }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="INTERNAL">Internal</MenuItem>
              <MenuItem value="CUSTOMER">Customer</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* ── Table ────────────────────────────────────────────────── */}
      <Section title={tab === 0 ? "My Deliveries" : "My Scrap Runs"} icon={tab === 0 ? <LocalShipping /> : <RecyclingRounded />}>
        {error ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert> : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {tab === 0 && [hdr("ID"), hdr("Supervisor"), hdr("Vehicle"), hdr("Orders"), hdr("Progress"), hdr("Damaged"), hdr("Status"), hdr("Date"), hdr("View")]}
                    {tab === 1 && [hdr("ID"), hdr("Supervisor"), hdr("Type"), hdr("Source"), hdr("Vehicle"), hdr("Items"), hdr("Status"), hdr("Date"), hdr("View")]}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton height={24} /></TableCell>)}
                        </TableRow>
                      ))
                    : data.length === 0
                      ? <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><Typography color="text.secondary" variant="body2">No records found</Typography></TableCell></TableRow>
                      : data.map((row) => {
                          const hover = { "&:hover": { bgcolor: isDark ? alpha("#024990", 0.1) : alpha("#024990", 0.03) } };
                          if (tab === 0) {
                            const pct = row.total_items > 0 ? Math.round((row.delivered_items / row.total_items) * 100) : 0;
                            return (
                              <TableRow key={row.delivery_id} sx={hover}>
                                <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: 12 }}>#{row.delivery_id}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{row.supervisor_name}</TableCell>
                                <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{row.vehicle_number}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{row.total_orders}</TableCell>
                                <TableCell sx={{ minWidth: 110 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                                    <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1), "& .MuiLinearProgress-bar": { bgcolor: pct === 100 ? "#4caf50" : "#ff9800", borderRadius: 3 } }} />
                                    <Typography variant="caption" color="text.secondary">{row.delivered_items}/{row.total_items}</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {row.damaged_items > 0
                                    ? <Chip label={row.damaged_items} size="small" sx={{ bgcolor: alpha("#f44336", 0.15), color: "#f44336", fontWeight: 700, fontSize: 10 }} />
                                    : <Typography variant="caption" color="text.disabled">—</Typography>}
                                </TableCell>
                                <TableCell><StatusChip status={row.status} colorMap={DELIVERY_STATUS_COLORS} /></TableCell>
                                <TableCell sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap" }}>
                                  {new Date(row.assigned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                </TableCell>
                                <TableCell>
                                  <Tooltip title="View Details">
                                    <IconButton size="small" onClick={() => setDrawer({ open: true, type: "delivery", id: row.delivery_id })} sx={{ color: isDark ? "#91eff1" : "#024990" }}>
                                      <Visibility fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return (
                            <TableRow key={row.scrap_id} sx={hover}>
                              <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: 12 }}>#{row.scrap_id}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{row.supervisor_name}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{row.scrap_type || "—"}</TableCell>
                              <TableCell>
                                <Chip label={row.source} size="small" sx={{ bgcolor: alpha(row.source === "INTERNAL" ? "#0891b2" : "#9c27b0", 0.15), color: row.source === "INTERNAL" ? "#0891b2" : "#9c27b0", fontWeight: 600, fontSize: 10 }} />
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{row.vehicle_number}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{row.total_items}</TableCell>
                              <TableCell><StatusChip status={row.status} colorMap={SCRAP_STATUS_COLORS} /></TableCell>
                              <TableCell sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap" }}>
                                {new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                              </TableCell>
                              <TableCell>
                                <Tooltip title="View Details">
                                  <IconButton size="small" onClick={() => setDrawer({ open: true, type: "scrap", id: row.scrap_id })} sx={{ color: isDark ? "#91eff1" : "#024990" }}>
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })
                  }
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2.5 }}>
                <Pagination count={totalPages} page={filters.page} onChange={(_, p) => setFilters((f) => ({ ...f, page: p }))} color="primary" shape="rounded" size="small" />
              </Box>
            )}
          </>
        )}
      </Section>

      <DetailDrawer open={drawer.open} onClose={() => setDrawer({ open: false, type: null, id: null })} type={drawer.type} id={drawer.id} />
    </Box>
  );
}