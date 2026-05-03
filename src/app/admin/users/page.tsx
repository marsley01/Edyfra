"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Filter, MoreVertical, 
  Mail, Phone, Shield, ShieldAlert,
  GraduationCap, User as UserIcon, Loader2,
  ChevronRight, ArrowUpRight
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function UserManagementPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .order("createdAt", { ascending: false });

    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">Scholar Directory</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Oversee the entire student and expert ecosystem.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all" 
              placeholder="Search by identity..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-2xl px-8 border-white/10 bg-white/5 font-bold h-16"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
        </div>
      </div>

      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Scholar Identity</th>
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Role & Tier</th>
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Academic Level</th>
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Score</th>
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                   [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-10 py-10" />
                      </tr>
                   ))
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center font-black text-lg border border-white/10 group-hover:border-primary/40 transition-colors">
                           {user.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-lg tracking-tight">{user.name}</p>
                          <p className="text-xs font-bold text-muted-foreground tracking-tight opacity-60">
                             {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="space-y-1.5">
                        <Badge className={`border-none font-black text-[9px] tracking-widest ${user.role === "ADMIN" ? "bg-red-500/10 text-red-400" : user.role === "TUTOR" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-400"}`}>
                           {user.role}
                        </Badge>
                        <p className="text-[10px] font-black text-muted-foreground tracking-widest block opacity-40 uppercase">{user.tier}</p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <p className="text-sm font-black text-slate-300 tracking-tight">{user.educationLevel?.replace("_", " ")}</p>
                    </td>
                    <td className="px-10 py-8">
                       <p className="text-lg font-black text-primary tracking-tighter">{user.points.toLocaleString()}</p>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Total Points</p>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-white/10 text-muted-foreground">
                          <ArrowUpRight className="h-5 w-5" />
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
