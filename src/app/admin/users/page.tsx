"use client";

import { useState, useEffect } from "react";
import { getAllUsers, deleteUser, updateUserRoleAdmin } from "@/app/actions/admin";
import {
  Users, Search, Trash2, Shield,
  MoreVertical, Mail, Calendar, MapPin,
  Loader2, ArrowUpDown, Filter, GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Role } from "@/generated/client";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      toast.error("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This will wipe their Prisma record.")) return;
    try {
      const result = await deleteUser(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("User deleted successfully.");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to delete user.");
    }
  };

  const handleRoleUpdate = async (id: string, role: Role) => {
    try {
      await updateUserRoleAdmin(id, role);
      toast.success(`Role updated to ${role}`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update role.");
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter">Scholars Directory</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Global User Control OS</p>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by identity or email..."
            className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-white/10 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Active Population
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest">
              {filteredUsers.length} Nodes Detected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Records...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="p-6">User Identity</th>
                    <th className="p-6">Role</th>
                    <th className="p-6">Origin</th>
                    <th className="p-6">Telemetry</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <AvatarPremium seed={u.id} src={u.avatar} name={u.name} size="md" />
                          <div className="min-w-0">
                            <p className="font-black text-sm text-white truncate">{u.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge className={cn(
                          "font-black text-[9px] uppercase tracking-widest px-3 py-1",
                          u.role === "ADMIN" ? "bg-red-500/10 text-red-500" :
                            u.role === "TUTOR" ? "bg-teal-500/10 text-teal-500" :
                              "bg-blue-500/10 text-blue-500"
                        )}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary" />
                          {u.county || "Nairobi"}, KE
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-tighter text-white">Points: {u.points}</span>
                          <span className="text-[9px] font-bold text-muted-foreground">Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10 rounded-2xl p-2 shadow-2xl">
                            <DropdownMenuItem onClick={() => handleRoleUpdate(u.id, Role.ADMIN)} className="rounded-xl font-bold text-xs p-3 cursor-pointer">
                              <Shield className="h-4 w-4 mr-3 text-red-500" /> Promote to Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleUpdate(u.id, Role.TUTOR)} className="rounded-xl font-bold text-xs p-3 cursor-pointer">
                              <GraduationCap className="h-4 w-4 mr-3 text-teal-500" /> Set as Tutor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleUpdate(u.id, Role.STUDENT)} className="rounded-xl font-bold text-xs p-3 cursor-pointer">
                              <Users className="h-4 w-4 mr-3 text-blue-500" /> Set as Student
                            </DropdownMenuItem>
                            <div className="h-px bg-white/5 my-2" />
                            <DropdownMenuItem onClick={() => handleDelete(u.id)} className="rounded-xl font-bold text-xs p-3 cursor-pointer text-red-500 hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4 mr-3" /> Terminate Node
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
