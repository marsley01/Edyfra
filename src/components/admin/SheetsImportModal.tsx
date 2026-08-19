"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Loader2, Info, AlertCircle, CheckCircle2 } from "lucide-react";

interface SheetsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SheetsImportModal({ open, onOpenChange }: SheetsImportModalProps) {
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [importType, setImportType] = useState<"students" | "tutors" | "subjects">("students");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    setResult(null);

    if (!sheetsUrl) {
      setError("Please provide a Google Sheets URL.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/sheets-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets_url: sheetsUrl, import_type: importType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import sheet.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!result?.errors || result.errors.length === 0) return;
    const blob = new Blob([result.errors.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${importType}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSheetsUrl("");
    setImportType("students");
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setTimeout(handleReset, 300);
    }}>
      <DialogContent className="font-sans max-w-lg rounded-xl border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
            <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            Import Google Sheet
          </DialogTitle>
          <DialogDescription className="text-sm">
            Batch import data from a public Google Sheets URL.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Import Type</label>
                <Select value={importType} onValueChange={(val: any) => setImportType(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">Students (Profiles)</SelectItem>
                    <SelectItem value="tutors">Tutors (Profiles + Tutor Role)</SelectItem>
                    <SelectItem value="subjects">Subjects (Reference)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Google Sheet URL</label>
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/..." 
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  disabled={isLoading}
                />
                <div className="flex items-start gap-1.5 mt-1.5 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-500" />
                  <p>
                    <strong>Important:</strong> The sheet must be set to <em>"Anyone with the link - Viewer"</em>. Private sheets will fail to import.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isLoading || !sheetsUrl}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Start Import"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4 text-center">
            <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Import Completed</h3>
              <p className="text-sm text-muted-foreground mt-1">Processed {importType} from Google Sheets.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-slate-50/50">
                <p className="text-sm font-medium text-muted-foreground">Imported</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{result.imported}</p>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50/50">
                <p className="text-sm font-medium text-muted-foreground">Errors / Skipped</p>
                <p className="text-3xl font-bold tracking-tight text-red-600 mt-1">{result.skipped}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg flex flex-col gap-2 items-center">
                <p className="text-sm text-red-800 font-medium">
                  {result.errors.length} rows encountered issues.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadErrors}
                  className="text-red-700 border-red-200 hover:bg-red-100 w-full"
                >
                  Download Error Report
                </Button>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-4">
              <Button onClick={() => onOpenChange(false)} className="bg-violet-600 hover:bg-violet-700 text-white">
                Close
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Import Another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
