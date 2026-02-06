import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AddToPhotosOutlinedIcon from "@mui/icons-material/AddToPhotosOutlined";
import api from "../../../context/Api";
import AddCompanyModal from "./AddCompanyModal";

const AddCompany = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/companies");
      setCompanies(res.data.data || []);
    } catch (err) {
      showSnackbar("Failed to fetch companies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter((c) => {
    const key = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(key) ||
      c.company_code?.toLowerCase().includes(key) ||
      c.email?.toLowerCase().includes(key) ||
      c.phone_no?.toLowerCase().includes(key) ||
      c.status?.toLowerCase().includes(key)
    );
  });

  return (
    <Box sx={{ px: 2, py: 4, minHeight: "100vh" }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={3}
      >
        <Typography variant="h5" fontWeight="bold" color={primaryColor}>
          Company Management
        </Typography>

        <Button
          variant="outlined"
          startIcon={<AddToPhotosOutlinedIcon />}
          onClick={() => setOpenModal(true)}
          sx={{
            borderRadius: 2,
            fontWeight: "bold",
            textTransform: "none",
            border: `2px solid ${primaryColor}`,
          }}
        >
          Add Company
        </Button>
      </Box>

      {/* Search */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          border: `2px solid ${primaryColor}`,
          borderRadius: "30px",
          px: 2,
          py: 1,
          mb: 2,
          maxWidth: 400,
        }}
      >
        <SearchIcon sx={{ color: primaryColor, mr: 1 }} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search company..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: theme.palette.text.primary,
          }}
        />
        {search && (
          <CloseIcon
            sx={{ cursor: "pointer" }}
            onClick={() => setSearch("")}
          />
        )}
      </Box>

      {/* Table */}
      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            border: `2px solid ${primaryColor}`,
            borderRadius: 2,
            overflowX: "auto",
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                {[
                  "ID",
                  "Company",
                  "Code",
                  "Contact",
                  "Email",
                  "State",
                  "GST",
                  "PAN",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontWeight: "bold", color: primaryColor }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredCompanies
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((c) => (
                  <TableRow key={c.tenant_id} hover>
                    <TableCell>{c.tenant_id}</TableCell>
                    <TableCell>{c.company_name}</TableCell>
                    <TableCell>{c.company_code}</TableCell>
                    <TableCell>{c.phone_no || "-"}</TableCell>
                    <TableCell>{c.email || "-"}</TableCell>
                    <TableCell>{c.state || "-"}</TableCell>
                    <TableCell>{c.gst_no || "-"}</TableCell>
                    <TableCell>{c.pan_no || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.status}
                        color={c.status === "ACTIVE" ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => {
                          setEditData(c);
                          setOpenModal(true);
                        }}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setCompanyToDelete(c);
                          setConfirmDeleteOpen(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={filteredCompanies.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) =>
              setRowsPerPage(parseInt(e.target.value, 10))
            }
            rowsPerPageOptions={[5, 10, 20]}
          />
        </TableContainer>
      )}

      {/* Modals */}
      <AddCompanyModal
        open={openModal}
        editData={editData}
        onClose={() => {
          setOpenModal(false);
          setEditData(null);
        }}
        refresh={fetchCompanies}
      />

      {/* Delete Dialog */}
      <Dialog open={confirmDeleteOpen}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete{" "}
          <strong>{companyToDelete?.company_name}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              await api.delete(`/api/companies/${companyToDelete.tenant_id}`);
              showSnackbar("Company deleted", "success");
              setConfirmDeleteOpen(false);
              fetchCompanies();
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AddCompany;
