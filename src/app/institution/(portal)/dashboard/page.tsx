"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  BookOpen,
  Users,
  Settings,
  Building2,
  GraduationCap,
  BrainCircuit,
  Trophy,
  TrendingUp,
  Upload,
  FileText,
  Trash2,
  Search,
  Shield,
  Mail,
  MapPin,
  Globe,
  Phone,
  Save,
  Loader2,
  CircleCheck,
  Clock,
  X,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  getInstitutionDashboard,
  getInstitutionMembers,
  getInstitutionDocuments,
  updateInstitutionProfile,
  updateMemberRole,
  removeMember,
  uploadInstitutionDocument,
  deleteInstitutionDocument,
} from "@/app/actions/institution";
import { getUserInstitution } from "@/app/actions/institution-data";

type DashboardData = {
  institution: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
    location: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    verified: boolean;
    plan: string;
    allowedDomains: string[];
  };
  stats: {
    totalStudents: number;
    totalInstructors: number;
    totalAdmins: number;
    recentSessions: number;
    aiConversations: number;
    aiTokensUsed: number;
    completionRate: number;
  };
};

type MemberType = {
  id: string;
  institutionId: string;
  userId: string;
  role: "INSTITUTION_ADMIN" | "DEPARTMENT_HEAD" | "INSTRUCTOR" | "STUDENT";
  status: string;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    tier: string;
    createdAt: Date;
  };
};

type DocumentType = {
  id: string;
  institutionId: string;
  title: string;
  description: string | null;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: Date;
  uploader: { id: string; name: string; avatar: string | null };
};

const ROLE_COLORS: Record<string, string> = {
  INSTITUTION_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  DEPARTMENT_HEAD: "bg-blue-100 text-blue-700 border-blue-200",
  INSTRUCTOR: "bg-amber-100 text-amber-700 border-amber-200",
  STUDENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function InstitutionDashboardPage() {
  const [activeTab, setActiveTab] = useState("insights");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberType[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("");

  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    location: "",
    email: "",
    phone: "",
    website: "",
    allowedDomains: "",
  });
  const [saving, setSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const membership = await getUserInstitution();
      if (!membership) {
        setLoading(false);
        return;
      }
      const instId = membership.institution.id;
      setInstitutionId(instId);

      const result = await getInstitutionDashboard(instId);
      if (result) {
        setData(result as DashboardData);
        setProfileForm({
          name: result.institution.name,
          description: result.institution.description ?? "",
          location: result.institution.location ?? "",
          email: result.institution.email ?? "",
          phone: result.institution.phone ?? "",
          website: result.institution.website ?? "",
          allowedDomains: result.institution.allowedDomains.join(", "),
        });
      }
    } catch {
      toast.error("Failed to load institution dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async (instId: string) => {
    setMembersLoading(true);
    try {
      const result = await getInstitutionMembers(instId, {
        search: memberSearch || undefined,
        role: memberRoleFilter || undefined,
      });
      setMembers(result as unknown as MemberType[]);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, [memberSearch, memberRoleFilter]);

  const loadDocuments = useCallback(async (instId: string) => {
    setDocsLoading(true);
    try {
      const result = await getInstitutionDocuments(instId);
      setDocuments(result as unknown as DocumentType[]);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === "roster" && institutionId) loadMembers(institutionId);
  }, [activeTab, loadMembers, institutionId]);

  useEffect(() => {
    if (activeTab === "knowledge" && institutionId) loadDocuments(institutionId);
  }, [activeTab, loadDocuments, institutionId]);

  async function handleSaveProfile() {
    if (!institutionId) return;
    setSaving(true);
    try {
      await updateInstitutionProfile(institutionId, {
        name: profileForm.name,
        description: profileForm.description,
        location: profileForm.location,
        email: profileForm.email,
        phone: profileForm.phone,
        website: profileForm.website,
        allowedDomains: profileForm.allowedDomains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      });
      toast.success("Institution profile updated");
      loadDashboard();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(memberId: string, role: "INSTITUTION_ADMIN" | "DEPARTMENT_HEAD" | "INSTRUCTOR" | "STUDENT") {
    try {
      await updateMemberRole(memberId, role);
      toast.success("Member role updated");
      if (institutionId) loadMembers(institutionId);
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await removeMember(memberId);
      toast.success("Member removed");
      if (institutionId) loadMembers(institutionId);
    } catch {
      toast.error("Failed to remove member");
    }
  }

  async function handleUploadDocument(formData: FormData) {
    if (!institutionId) return;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File;
    if (!title || !file || !file.name) {
      toast.error("Title and file are required");
      return;
    }
    try {
      await uploadInstitutionDocument(institutionId, {
        title,
        description: description || undefined,
        filePath: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: "system",
      });
      toast.success("Document uploaded");
      loadDocuments(institutionId);
    } catch {
      toast.error("Failed to upload document");
    }
  }

  async function handleDeleteDocument(docId: string) {
    try {
      await deleteInstitutionDocument(docId);
      toast.success("Document deleted");
      if (institutionId) loadDocuments(institutionId);
    } catch {
      toast.error("Failed to delete document");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="mb-4 h-16 w-16 text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-900">No institution found</h2>
        <p className="mt-2 text-sm text-gray-500">
          Create or connect an institution to get started.
        </p>
      </div>
    );
  }

  const { institution, stats } = data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-[#3730A3]/5 to-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#3730A3] text-xl font-bold text-white shadow-sm">
            {getInitials(institution.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">{institution.name}</h2>
              {institution.verified && (
                <CircleCheck className="h-4 w-4 text-blue-500" />
              )}
              <Badge variant="outline" className="border-[#3730A3]/20 bg-[#3730A3]/5 text-[#3730A3] text-[10px]">
                {institution.plan}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {institution.location && `${institution.location} · `}
              Code: <span className="font-mono font-medium text-gray-700">{institution.code}</span>
              · {stats.totalStudents + stats.totalInstructors + stats.totalAdmins} total members
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full justify-start gap-0 border-b border-gray-200 bg-transparent pb-0">
          <TabsTrigger
            value="insights"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium data-active:border-[#3730A3] data-active:text-[#3730A3] data-active:bg-transparent data-active:shadow-none"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Insights & Analytics
          </TabsTrigger>
          <TabsTrigger
            value="knowledge"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium data-active:border-[#3730A3] data-active:text-[#3730A3] data-active:bg-transparent data-active:shadow-none"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            AI Knowledge Base
          </TabsTrigger>
          <TabsTrigger
            value="roster"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium data-active:border-[#3730A3] data-active:text-[#3730A3] data-active:bg-transparent data-active:shadow-none"
          >
            <Users className="mr-2 h-4 w-4" />
            Roster & Roles
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium data-active:border-[#3730A3] data-active:text-[#3730A3] data-active:bg-transparent data-active:shadow-none"
          >
            <Settings className="mr-2 h-4 w-4" />
            Branding & Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Users}
              label="Enrolled Students"
              value={stats.totalStudents.toLocaleString()}
              trend="Active learners"
              color="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon={GraduationCap}
              label="Active Instructors"
              value={stats.totalInstructors.toLocaleString()}
              trend={`${stats.totalAdmins} admins`}
              color="bg-amber-50 text-amber-600"
            />
            <MetricCard
              icon={Trophy}
              label="Completion Rate"
              value={`${stats.completionRate}%`}
              trend="Session completion"
              color="bg-emerald-50 text-emerald-600"
            />
            <MetricCard
              icon={BrainCircuit}
              label="AI Tutor Interactions"
              value={stats.aiConversations.toLocaleString()}
              trend={`${stats.aiTokensUsed.toLocaleString()} tokens used`}
              color="bg-purple-50 text-purple-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  Weekly Activity
                </CardTitle>
                <CardDescription>Sessions conducted in the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-center gap-3 py-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#3730A3]">{stats.recentSessions}</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">sessions</div>
                  </div>
                  <div className="mx-4 h-12 w-px bg-gray-200" />
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-500">{stats.aiConversations}</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">AI interactions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  Institution Overview
                </CardTitle>
                <CardDescription>Membership and system status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="font-semibold text-gray-900">{stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Instructors</span>
                    <span className="font-semibold text-gray-900">{stats.totalInstructors}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Department Heads</span>
                    <span className="font-semibold text-gray-900">
                      {members.filter((m) => m.role === "DEPARTMENT_HEAD").length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan</span>
                    <Badge variant="outline" className="border-[#3730A3]/20 bg-[#3730A3]/5 text-[#3730A3]">
                      {institution.plan}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Verified</span>
                    {institution.verified ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        <CircleCheck className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-200 text-gray-500">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-gray-400" />
                Upload Academic Asset
              </CardTitle>
              <CardDescription>
                Upload syllabi, curriculums, textbooks, or handbooks. These documents become
                ground-truth context for AI tutoring sessions under this institution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUploadDocument(new FormData(e.currentTarget));
                  (e.target as HTMLFormElement).reset();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Document Title</label>
                    <Input name="title" required placeholder="e.g. Form 4 Biology Syllabus" className="border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">File</label>
                    <Input name="file" type="file" required accept=".pdf,.docx,.txt" className="border-gray-200 file:mr-3 file:rounded-md file:border-0 file:bg-[#3730A3]/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#3730A3]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Description (optional)</label>
                  <Textarea name="description" placeholder="Briefly describe what this document covers..." className="border-gray-200" rows={2} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Documents are processed and indexed for AI-powered tutoring sessions.
                  </div>
                </div>
                <Button type="submit" className="bg-[#3730A3] hover:bg-[#3730A3]/90">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to Knowledge Base
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                Knowledge Base Assets
              </CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? "s" : ""} indexed for AI context
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileText className="mb-2 h-10 w-10 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">No documents uploaded yet</p>
                  <p className="text-xs text-gray-400">Upload academic assets to power AI tutoring context.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3730A3]/10">
                        <FileText className="h-5 w-5 text-[#3730A3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{doc.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{doc.fileType.toUpperCase()}</span>
                          <span>·</span>
                          <span>{formatBytes(doc.fileSize)}</span>
                          {doc.description && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[200px]">{doc.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                          <CircleCheck className="mr-1 h-2.5 w-2.5" />
                          Indexed
                        </Badge>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                Member Directory
              </CardTitle>
              <CardDescription>Manage institution members and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search members by name or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="border-gray-200 pl-9"
                  />
                </div>
                <Select value={memberRoleFilter} onValueChange={(v) => setMemberRoleFilter(v ?? "")}>
                  <SelectTrigger className="w-[160px] border-gray-200">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    <SelectItem value="INSTITUTION_ADMIN">Admin</SelectItem>
                    <SelectItem value="DEPARTMENT_HEAD">Dept. Head</SelectItem>
                    <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {membersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Users className="mb-2 h-10 w-10 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">No members found</p>
                  <p className="text-xs text-gray-400">
                    {memberSearch || memberRoleFilter
                      ? "Try adjusting your search or filters."
                      : "Invite members to get started."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.user.avatar ?? undefined} />
                        <AvatarFallback className="bg-[#3730A3]/10 text-xs font-medium text-[#3730A3]">
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{member.user.name}</span>
                          {member.status === "PENDING" && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                              <Clock className="mr-1 h-2.5 w-2.5" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{member.user.email}</div>
                      </div>
                      <Select
                        value={member.role}
                        onValueChange={(val) => val && handleRoleChange(member.id, val as "INSTITUTION_ADMIN" | "DEPARTMENT_HEAD" | "INSTRUCTOR" | "STUDENT")}
                      >
                        <SelectTrigger className={`h-7 border px-2 text-xs font-medium ${ROLE_COLORS[member.role] || ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INSTITUTION_ADMIN">Admin</SelectItem>
                          <SelectItem value="DEPARTMENT_HEAD">Dept. Head</SelectItem>
                          <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                          <SelectItem value="STUDENT">Student</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog>
                        <DialogTrigger render={<button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"><X className="h-4 w-4" /></button>} />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Member</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {member.user.name} from {institution.name}? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose render={<Button variant="outline">Cancel</Button>} />
                            <Button
                              variant="destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              Remove Member
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Tenant boundary enforced
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                Institution Profile
              </CardTitle>
              <CardDescription>Manage your institution&apos;s public identity and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500">Institution Name</label>
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500">Description</label>
                    <Textarea
                      value={profileForm.description}
                      onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
                      className="border-gray-200"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      Location
                    </label>
                    <Input
                      value={profileForm.location}
                      onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="Nairobi, Kenya"
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">
                      <Mail className="mr-1 inline h-3 w-3" />
                      Contact Email
                    </label>
                    <Input
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                      type="email"
                      placeholder="admin@school.edu"
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">
                      <Phone className="mr-1 inline h-3 w-3" />
                      Phone Number
                    </label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+254 700 000 000"
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">
                      <Globe className="mr-1 inline h-3 w-3" />
                      Website
                    </label>
                    <Input
                      value={profileForm.website}
                      onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))}
                      placeholder="https://school.edu"
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500">
                      Allowed Email Domains
                    </label>
                    <Input
                      value={profileForm.allowedDomains}
                      onChange={(e) => setProfileForm((p) => ({ ...p, allowedDomains: e.target.value }))}
                      placeholder="@school.edu, @student.school.edu"
                      className="border-gray-200"
                    />
                    <p className="text-xs text-gray-400">
                      Comma-separated email domains that can register under this institution.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-[#3730A3] hover:bg-[#3730A3]/90"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-gray-900">{value}</div>
      </div>
      <div className="mt-1 text-xs text-gray-400">{trend}</div>
    </div>
  );
}
