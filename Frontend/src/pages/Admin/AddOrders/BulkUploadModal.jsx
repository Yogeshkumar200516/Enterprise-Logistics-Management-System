// src/components/orders/BulkUploadModal.jsx
import React, { useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton,
  LinearProgress, alpha, useTheme, List, ListItem, ListItemText,
  Chip, Divider,
} from "@mui/material";
import {
  Close, CloudUpload, Download, CheckCircle,
  ErrorOutline, TableChart, InsertDriveFile,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import readXlsxFile from "read-excel-file";
import api from "../../../context/Api";

const TEMPLATE_COLUMNS = [
  "order_reference",
  "customer_name",
  "customer_address",
  "pincode",
  "product_name",
  "quantity",
  "is_fragile",
];

export default function BulkUploadModal({ open, onClose, onSuccess }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const fileInputRef = useRef(null);

  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [dragOver, setDragOver]   = useState(false);

  // ─── Download template ────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const res = await api.get("/api/orders/template/download", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "orders_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download template");
    }
  };

  // ─── File selected ────────────────────────────────────────────────
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }
    setFile(selectedFile);

    // Preview first 5 rows
    try {
      const rows = await readXlsxFile(selectedFile);
      setPreview(rows.slice(0, 6)); // header + 5
    } catch {
      setPreview([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Upload ───────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/orders/bulk/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      toast.success(res.data.message || "Orders uploaded successfully");
      clearFile();
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────
  const dropzoneBg = dragOver
    ? isDark ? alpha("#91eff1", 0.1) : alpha("#024990", 0.08)
    : isDark ? alpha("#fff", 0.04) : alpha("#024990", 0.02);

  return (
    <Dialog
      open={open}
      onClose={!uploading ? onClose : undefined}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: isDark
            ? "linear-gradient(135deg, #1e2a32 0%, #162028 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
          border: `1px solid ${isDark ? alpha("#91eff1", 0.12) : alpha("#024990", 0.12)}`,
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.5)"
            : "0 24px 80px rgba(2,73,144,0.15)",
        },
      }}
    >
      {/* ── Title ──────────────────────────────────────────────────── */}
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TableChart sx={{ color: "#22fbff", fontSize: 26 }} />
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                Bulk Upload Orders
              </Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.65) }}>
                Upload orders via Excel spreadsheet
              </Typography>
            </Box>
          </Box>
          {!uploading && (
            <IconButton onClick={onClose} sx={{ color: alpha("#fff", 0.7), "&:hover": { color: "#fff" } }}>
              <Close />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      {/* ── Content ────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 3 }}>
        {/* Step 1 — Download Template */}
        <Box
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2.5,
            border: `1px solid ${isDark ? alpha("#22fbff", 0.2) : alpha("#024990", 0.15)}`,
            background: isDark ? alpha("#22fbff", 0.05) : alpha("#024990", 0.04),
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Step 1 — Download Template
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the official template to ensure correct formatting. Each row with the same{" "}
                <strong>order_reference</strong> will be grouped as one order.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={downloadTemplate}
              sx={{
                background: isDark
                  ? "linear-gradient(135deg, #22fbff 0%, #00e5e9 100%)"
                  : "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
                color: isDark ? "#024990" : "#fff",
                fontWeight: 700,
                borderRadius: 2,
                flexShrink: 0,
                "&:hover": { opacity: 0.9 },
              }}
            >
              Download Template
            </Button>
          </Box>

          {/* Column list */}
          <Box sx={{ mt: 1.5, display: "flex", gap: 0.8, flexWrap: "wrap" }}>
            {TEMPLATE_COLUMNS.map((col) => (
              <Chip
                key={col}
                label={col}
                size="small"
                sx={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#024990", 0.1),
                  color: isDark ? "#91eff1" : "#024990",
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Step 2 — Upload File */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Step 2 — Upload Your File
        </Typography>

        {/* Dropzone */}
        <Box
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${dragOver
              ? (isDark ? "#91eff1" : "#024990")
              : (isDark ? alpha("#fff", 0.15) : alpha("#024990", 0.2))}`,
            borderRadius: 2.5,
            p: 4,
            textAlign: "center",
            background: dropzoneBg,
            cursor: file ? "default" : "pointer",
            transition: "all 0.25s",
            "&:hover": file ? {} : {
              borderColor: isDark ? "#91eff1" : "#024990",
              background: isDark ? alpha("#91eff1", 0.07) : alpha("#024990", 0.05),
            },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CloudUpload
                  sx={{
                    fontSize: 56,
                    color: isDark ? alpha("#91eff1", 0.4) : alpha("#024990", 0.3),
                    mb: 1,
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Drop your Excel file here
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse — .xlsx or .xls only
                </Typography>
              </motion.div>
            ) : (
              <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <InsertDriveFile sx={{ color: "success.main", fontSize: 44 }} />
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(1)} KB • Ready to upload
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* Upload progress */}
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Uploading...</Typography>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>{progress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ borderRadius: 1, height: 6 }}
            />
          </Box>
        )}

        {/* ── Preview Table ─────────────────────────────────────────── */}
        {preview.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Preview (first 5 rows)
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              >
                {preview.map((row, rIdx) => (
                  <Box
                    key={rIdx}
                    component="tr"
                    sx={{
                      background: rIdx === 0
                        ? isDark ? alpha("#024990", 0.4) : alpha("#024990", 0.1)
                        : rIdx % 2 === 0
                          ? isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02)
                          : "transparent",
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <Box
                        key={cIdx}
                        component={rIdx === 0 ? "th" : "td"}
                        sx={{
                          p: "6px 10px",
                          textAlign: "left",
                          borderBottom: `1px solid ${isDark ? alpha("#fff", 0.07) : alpha("#000", 0.07)}`,
                          fontWeight: rIdx === 0 ? 700 : 400,
                          color: rIdx === 0 ? (isDark ? "#91eff1" : "#024990") : "text.primary",
                          whiteSpace: "nowrap",
                          maxWidth: 150,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cell !== null && cell !== undefined ? String(cell) : "—"}
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <DialogActions sx={{ p: 3, pt: 1, gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={uploading}
          sx={{ borderRadius: 2, fontWeight: 600, flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={<CloudUpload />}
          sx={{
            flex: 2,
            borderRadius: 2,
            fontWeight: 700,
            background: "linear-gradient(135deg, #024990 0%, #0369c7 100%)",
            boxShadow: "0 4px 14px rgba(2,73,144,0.35)",
            "&:hover": { background: "linear-gradient(135deg, #023570 0%, #024990 100%)" },
            "&.Mui-disabled": { opacity: 0.5 },
          }}
        >
          {uploading ? `Uploading ${progress}%...` : "Upload Orders"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}