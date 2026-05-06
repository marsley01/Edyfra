"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, ShieldAlert, GraduationCap, 
  MapPin, Clock, Star, ExternalLink,
  CheckCircle2, XCircle, Search, Loader2,
  FileText, Mail, Info, Trash2, AlertTriangle, Clock3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTutorApplicationsWithDetails, getAllTutorsWithDetails, approveTutorApplicationEnhanced, rejectTutorApplication } from "@/app/actions/admin-tutor";

export default function AdminTutorsPage() {
  type TutorApplication = {
    id: string;
    status: string;
    createdAt: string;
    subjects: string[];
    path: string;
    notes: string;
    userId: string;
    user?: {
      name: string;
      educationLevel?: string;
      email?: string;
    }
   };
   
   const [applications, setApplications] = useState<TutorApplication[]>([]);
   const [allTutors, setAllTutors] = useState<TutorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAllTutors, setShowAllTutors] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both pending applications and all tutors
      const [pendingApps, allTutorsData] = await Promise.all([
        getTutorApplicationsWithDetails(),
        getAllTutorsWithDetails()
      ]);
      
      setApplications(pendingApps || []);
      setAllTutors(allTutorsData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load tutor data.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error fetching tutor data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const result = await approveTutorApplicationEnhanced(id);
      if (result.success) {
        toast.success("Expert dashboard activated successfully!");
        fetchData();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Approval failed due to an unknown error.";
      toast.error("Approval failed: " + errorMessage);
      console.error("Error approving tutor:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const reason = prompt("Enter rejection reason (optional):") || undefined;
      const result = await rejectTutorApplication(id, reason);
      if (result.success) {
        toast.success("Application rejected.");
        fetchData();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Rejection failed due to an unknown error.";
      toast.error("Rejection failed: " + errorMessage);
      console.error("Error rejecting tutor:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const displayData = showAllTutors ? allTutors : applications;
  
  const filteredApps = displayData.filter(app => {
    const searchLower = search.toLowerCase();
    if (!search) return true;
    
    const nameMatch = app.user?.name?.toLowerCase().includes(searchLower);
    const subjectMatch = app.subjects?.some((s: string) => s.toLowerCase().includes(searchLower));
    const emailMatch = app.user?.email?.toLowerCase().includes(searchLower);
    
    return nameMatch || subjectMatch || emailMatch;
  });

  if (error) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">Verification Desk</h1>
            <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Audit and authorize educational experts for the community.</p>
          </div>
        </div>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="text-xl font-bold text-red-500">Connection Error</h3>
                <p className="text-muted-foreground mt-2">{error}</p>
                 <Button 
                   onClick={fetchData} 
                   className="mt-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                 >
                  <Loader2 className="h-4 w-4 mr-2" /> Retry Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter">Tutor Management</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">
            {showAllTutors ? "View all registered tutors" : "Audit and authorize educational experts"}
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={() => setShowAllTutors(!showAllTutors)}
            variant="outline"
            className="rounded-xl font-black text-xs tracking-widest"
          >
            {showAllTutors ? "Show Pending" : "Show All Tutors"} ({showAllTutors ? allTutors.length : applications.length})
          </Button>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search by name, subject, or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black tracking-widest uppercase text-muted-foreground">Syncing Applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem]">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold">{showAllTutors ? "No Tutors Found" : "No Pending Applications"}</h3>
            <p className="text-muted-foreground text-sm">
              {search ? "No results match your search." : showAllTutors ? "No tutors are currently registered." : "When tutors apply, they will appear here for review."}
            </p>
            {search && (
              <Button 
                onClick={() => setSearch("")} 
                variant="outline" 
                className="mt-4"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : filteredApps.map((app) => (
          <Card key={app.id} className={cn(
            "border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] overflow-hidden hover:border-primary/20 transition-all group",
            app.status === "APPROVED" && "opacity-60 grayscale-[0.5]",
            app.status === "REJECTED" && "opacity-40"
          )}>
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row lg:items-center">
                  {/* Profile Section */}
                  <div className="p-8 flex items-center gap-6 lg:border-r border-white/5 lg:min-w-[400px]">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl border border-primary/20 shadow-2xl shadow-primary/20">
                      {app.user?.name?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{app.user?.name || "Unknown Applicant"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black tracking-widest uppercase">
                          {app.user?.educationLevel?.replace("_", " ") || "N/A"}
                        </Badge>
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <Clock3 className="h-3 w-3" /> Applied {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {app.user?.email && (
                        <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" /> {app.user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="flex-1 p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {app.subjects?.map((s: string) => (
                          <Badge key={s} variant="outline" className="border-white/10 text-[9px] font-black tracking-widest">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Verification Path</p>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none text-[9px] font-black tracking-widest uppercase px-3">
                        {app.path}
                      </Badge>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Applicant Notes</p>
                      <p className="text-xs text-muted-foreground italic line-clamp-2">&quot;{app.notes || "No additional notes provided."}&quot;</p>
                    </div>
                  </div>

                  {/* Actions with Status Badge */}
                  <div className="p-8 bg-white/[0.01] flex flex-col items-stretch gap-3 lg:border-l border-white/5 lg:min-w-[220px]">
                    {/* Status Badge - Always Visible */}
                    <div className="mb-2">
                      {app.status === "PENDING" ? (
                        <Badge className="w-full justify-center bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[9px] font-black tracking-widest">
                          ⏳ PENDING REVIEW
                        </Badge>
                      ) : app.status === "APPROVED" ? (
                        <Badge className="w-full justify-center bg-green-500/20 text-green-500 border border-green-500/30 text-[9px] font-black tracking-widest">
                          ✓ APPROVED
                        </Badge>
                      ) : (
                        <Badge className="w-full justify-center bg-red-500/20 text-red-500 border border-red-500/30 text-[9px] font-black tracking-widest">
                          ✗ REJECTED
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {app.status === "PENDING" ? (
                      <>
                        <Button 
                          onClick={() => handleApprove(app.id)}
                          disabled={processingId === app.id}
                          className="rounded-xl font-black text-xs tracking-widest gap-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all px-4 py-5 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === app.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              PROCESSING...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              ACTIVATE
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleReject(app.id)}
                          disabled={processingId === app.id}
                          variant="outline"
                          className="rounded-xl font-black text-xs tracking-widest gap-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all px-4 py-5 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === app.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              PROCESSING...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              REJECT
                            </>
                          )}
                        </Button>
                      </>
                    ) : app.status === "APPROVED" ? (
                      <div className="flex items-center justify-center gap-2 text-green-500 font-black text-xs tracking-widest px-4 py-5 bg-green-500/10 rounded-lg border border-green-500/20">
                        <ShieldCheck className="h-4 w-4" /> ACTIVATED
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-500 font-black text-xs tracking-widest px-4 py-5 bg-red-500/10 rounded-lg border border-red-500/20">
                        <XCircle className="h-4 w-4" /> REJECTED
                      </div>
                    )}
                    
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-white/5">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
