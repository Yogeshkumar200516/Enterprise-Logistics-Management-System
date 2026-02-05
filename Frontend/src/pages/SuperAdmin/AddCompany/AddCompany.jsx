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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AddToPhotosOutlinedIcon from "@mui/icons-material/AddToPhotosOutlined";
import axios from "axios";
import AddCompanyModal from "./AddCompanyModal";
import api from "../../../context/Api";

const AddCompany = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });
  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [search, setSearch] = useState("");

  // For confirmation dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/companies");
      setCompanies(res.data.data || []);
    } catch (error) {
      console.error("Fetch Companies Error:", error);
      showSnackbar(
        error.response?.data?.message || "Unauthorized access",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenModal = (company = null) => {
    setEditData(company);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditData(null);
  };

  // Open confirmation dialog on delete icon click
  const handleDeleteClick = (company) => {
    setCompanyToDelete(company);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteOpen(false);
    setCompanyToDelete(null);
  };

  // Confirm delete action
  const handleDeleteConfirm = async () => {
    if (!companyToDelete?.tenant_id) return;
    
    try {
      await api.delete(`/api/companies/${companyToDelete.tenant_id}`);
      showSnackbar("Company deleted successfully", "success");
      fetchCompanies();
    } catch (error) {
      console.error("Delete Error:", error);
      showSnackbar("Failed to delete company", "error");
    } finally {
      setConfirmDeleteOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Search filter
  const filteredCompanies = companies.filter((c) => {
    const keyword = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(keyword) ||
      c.company_code?.toLowerCase().includes(keyword) ||
      c.status?.toLowerCase().includes(keyword)
    );
  });

  return (
    <Box
      sx={{
        px: isMobile ? 2 : 2,
        py: isMobile ? 4 : 4,
        minHeight: "100vh",
        color: theme.palette.text.primary,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        mb={4}
        flexDirection={isMobile ? "column" : "row"}
        gap={isMobile ? 2 : 0}
      >
        <Typography variant="h5" fontWeight="bold" color={primaryColor}>
          Add Companies
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "center" },
          justifyContent: "space-between",
          mb: 2,
          width: "100%",
        }}
      >
        {/* Search Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: (theme) => theme.palette.background.paper,
            borderRadius: "40px",
            p: "8px 14px",
            width: { xs: "90%", sm: "auto" },
            maxWidth: 400,
            minWidth: "280px",
            boxShadow: `0 0 6px ${primaryColor}33`,
            border: `2px solid ${primaryColor}`,
            transition: "all 0.3s ease",
          }}
        >
          <SearchIcon sx={{ color: primaryColor, fontSize: "1.2rem", mr: 1 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by company name, code, or status"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: (theme) => theme.palette.text.primary,
              fontSize: "1rem",
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {search && (
            <CloseIcon
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
              sx={{ color: "gray", fontSize: "20px", cursor: "pointer" }}
            />
          )}
        </Box>

        {/* Add Company Button */}
        <Button
          variant="outlined"
          startIcon={<AddToPhotosOutlinedIcon />}
          onClick={() => handleOpenModal(null)}
          sx={{
            color: primaryColor,
            border: `2px solid ${primaryColor}`,
            fontWeight: "bold",
            borderRadius: "10px",
            whiteSpace: "nowrap",
            alignSelf: { xs: "flex-end", sm: "auto" },
            textTransform: "none",
            mt: { xs: 2, sm: 0 },
            "&:hover": {
              boxShadow: `0 0 8px ${primaryColor}`,
            },
          }}
        >
          Add Company
        </Button>
      </Box>

      {loading ? (
        <Box textAlign="center" mt={6}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            border: `2px solid ${primaryColor}`,
            borderRadius: 2,
            boxShadow: `0 0 10px ${primaryColor}66`,
            overflowX: "auto",
            "&::-webkit-scrollbar": {
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: primaryColor,
              borderRadius: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: isDark ? "#212121" : "#eee",
            },
            scrollbarColor: `${primaryColor} ${isDark ? "#212121" : "#eee"}`,
            scrollbarWidth: "thin",
          }}
        >
          <Table size={isMobile ? "small" : "medium"} stickyHeader sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: isDark ? "#27273d" : "#f7f9fc" }}>
                {[
                  "Company ID",
                  "Name",
                  "Code",
                  "Status",
                  "Actions",
                ].map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      color: primaryColor,
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      fontSize: { xs: "0.95rem", sm: "1rem" },
                      py: 2,
                      textAlign: header === "Actions" ? "center" : "left",
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No companies found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((company) => (
                    <TableRow key={company.tenant_id} hover>
                      <TableCell sx={{ fontWeight: "bold", textAlign: 'center' }}>
                        {company.tenant_id}
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{company.company_name}</TableCell>
                      <TableCell>{company.company_code}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 3,
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "0.9em",
                            backgroundColor: company.status?.toLowerCase() === "active" ? "#0D6310" : "#e74c3c",
                            textAlign: "center",
                            textTransform: "capitalize",
                          }}
                        >
                          {company.status || "Inactive"}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <IconButton
                          onClick={() => handleOpenModal(company)}
                          aria-label={`Edit ${company.company_name}`}
                          sx={{
                            borderRadius: "50%",
                            border: `1px solid ${primaryColor}`,
                            color: primaryColor,
                            "&:hover": { boxShadow: `0 0 8px ${primaryColor}` },
                            mr: 1,
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteClick(company)}
                          aria-label={`Delete ${company.company_name}`}
                          sx={{
                            borderRadius: "50%",
                            border: `1px solid ${theme.palette.error.main}`,
                            color: theme.palette.error.main,
                            "&:hover": { boxShadow: `0 0 8px ${theme.palette.error.main}` },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredCompanies.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
            sx={{ 
              backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9" 
            }}
          />
        </TableContainer>
      )}

      <AddCompanyModal
        open={openModal}
        onClose={handleCloseModal}
        refresh={fetchCompanies}
        editData={editData}
      />

      <Dialog
        open={confirmDeleteOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="confirm-delete-title"
        PaperProps={{
          sx: {
            backgroundColor: isDark ? "#000000" : "#ffffff",
            color: isDark ? "#ffffff" : "#000000",
            border: `2px solid ${primaryColor}`,
            boxShadow: `0 0 8px ${primaryColor}`,
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            color: primaryColor,
            pr: 1,
          }}
          id="confirm-delete-title"
        >
          Confirm Delete
          <IconButton
            aria-label="close"
            onClick={handleDeleteCancel}
            sx={{
              color: isDark ? "#AAAAAD" : "gray",
              p: 0,
              ml: -2,
            }}
            size="small"
          >
            <CloseIcon sx={{ mr: 1 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            {companyToDelete ? (
              <>Are you sure you want to delete <strong>{companyToDelete.company_name}</strong> with Code: <strong>{companyToDelete.company_code}</strong>?</>
            ) : (
              "Are you sure you want to delete this company?"
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{ color: isDark ? "#AAAAAD" : "gray", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ fontWeight: "bold", textTransform: "none", borderRadius: "50px" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddCompany;
