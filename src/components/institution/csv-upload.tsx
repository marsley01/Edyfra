"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvUploadProps {
  onParsed: (text: string, fileName: string) => void;
  className?: string;
}

export function CsvUpload({ onParsed, className }: CsvUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setError(null);
      const file = accepted[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv") && !file.type.includes("csv")) {
        setError("Please upload a .csv file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File must be smaller than 5 MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFileName(file.name);
        onParsed(String(reader.result ?? ""), file.name);
      };
      reader.onerror = () => setError("Could not read the file");
      reader.readAsText(file);
    },
    [onParsed],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    multiple: false,
  });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
          isDragActive
            ? "border-indigo-400 bg-indigo-50/40"
            : "border-gray-200 bg-gray-50/40 hover:border-indigo-300 hover:bg-indigo-50/20",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-indigo-500">
          {fileName ? <FileSpreadsheet className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
        </div>
        {fileName ? (
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <span>{fileName}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFileName(null);
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-gray-800">
              {isDragActive ? "Drop your CSV here" : "Drag & drop your CSV here"}
            </p>
            <p className="text-xs text-gray-500">or click to browse · max 5 MB</p>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}
