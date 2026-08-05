"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import Papa from "papaparse";

type PreviewRow = {
  studentName?: string;
  studentEmail?: string;
  subject?: string;
  score?: string;
  marks?: string;
  grade?: string;
  term?: string;
  year?: string;
  [key: string]: any;
};

export default function CsvUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const REQUIRED_COLS = ["studentName", "subject", "score"];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);

    // Generate preview
    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      preview: 3, // Just show first 3 rows
      complete: (results) => {
        setColumns(results.meta.fields || []);
        setPreview(results.data as PreviewRow[]);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/institution/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Successfully processed ${data.processedRows} rows! The file has been archived.` });
        setFile(null);
        setPreview([]);
      } else {
        setResult({ success: false, message: data.error || "Failed to upload file." });
      }
    } catch {
      setResult({ success: false, message: "A network error occurred." });
    } finally {
      setUploading(false);
    }
  };

  const missingCols = REQUIRED_COLS.filter((c) => !columns.includes(c));

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Data Pipeline</p>
        <h1 className="text-3xl font-black tracking-tightest text-foreground">Upload Results</h1>
        <p className="text-muted-foreground font-medium text-sm">
          Import student performance data securely. Files are processed in real-time and archived.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-12 text-center min-h-[300px] ${
              isDragActive
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
            }`}
          >
            <input {...getInputProps()} />
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 ${isDragActive ? "bg-primary text-white scale-110 shadow-xl shadow-primary/20 -translate-y-2" : "bg-primary/10 text-primary"}`}>
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black tracking-tight">
              {isDragActive ? "Drop your CSV here" : "Drag & drop your CSV"}
            </h3>
            <p className="text-muted-foreground text-sm font-medium mt-2 max-w-[250px]">
              or click to browse from your computer. Must be a .csv file.
            </p>

            <AnimatePresence>
              {file && !isDragActive && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-6 left-6 right-6 bg-background border border-border shadow-sm rounded-xl p-3 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()} // Prevent triggering file dialog when clicking the file card
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold truncate">{file.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setPreview([]); setResult(null); }}
                    className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Result Alert */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-4 rounded-2xl flex items-start gap-3 mt-4 border ${
                  result.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
                }`}>
                  {result.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div>
                    <h4 className="font-bold">{result.success ? "Upload Complete" : "Upload Failed"}</h4>
                    <p className="text-sm opacity-90 leading-relaxed mt-1">{result.message}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation & Preview */}
          <AnimatePresence>
            {file && preview.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg tracking-tight">Data Preview</h3>
                  {missingCols.length > 0 ? (
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" /> Missing required columns
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Schema valid
                    </span>
                  )}
                </div>

                <div className="border border-border rounded-2xl overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/50 text-xs uppercase font-black text-muted-foreground border-b border-border">
                        <tr>
                          {columns.slice(0, 5).map((col) => (
                            <th key={col} className="px-4 py-3 whitespace-nowrap">
                              {col}
                              {REQUIRED_COLS.includes(col) && <span className="text-red-500 ml-1">*</span>}
                            </th>
                          ))}
                          {columns.length > 5 && <th className="px-4 py-3">...</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-secondary/30 transition-colors">
                            {columns.slice(0, 5).map((col) => (
                              <td key={col} className="px-4 py-3 truncate max-w-[150px] font-medium">
                                {row[col]}
                              </td>
                            ))}
                            {columns.length > 5 && <td className="px-4 py-3 text-muted-foreground">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading || missingCols.length > 0}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black text-xs tracking-widest uppercase hover:bg-primary/90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Rows...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Upload to Database
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-secondary/40 rounded-[2rem] p-6 space-y-6 border border-border">
            <h3 className="font-black tracking-tight flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-primary" /> Format Guide
            </h3>
            
            <div className="space-y-4 text-sm font-medium">
              <p className="text-muted-foreground">Your CSV file must include a header row with these required columns:</p>
              
              <ul className="space-y-3">
                {REQUIRED_COLS.map(col => (
                  <li key={col} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <code className="bg-background border border-border px-1.5 py-0.5 rounded text-xs text-foreground font-black tracking-wider">
                      {col}
                    </code>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-muted-foreground">Optional but recommended columns:</p>
                <div className="flex flex-wrap gap-2">
                  {["studentEmail", "grade", "term", "year"].map(col => (
                    <code key={col} className="bg-background border border-border px-1.5 py-0.5 rounded text-[10px] text-muted-foreground font-bold tracking-wider">
                      {col}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
