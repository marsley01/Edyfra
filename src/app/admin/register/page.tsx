"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, User, ShieldAlert, Loader2 } from "lucide-react";
import { registerAdmin } from "@/app/actions/admin";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    securityKey: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await registerAdmin(formData);

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Admin access granted. Redirecting to Command Center...");
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-primary/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/20">
               <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black tracking-tighter text-white">System Onboarding</CardTitle>
              <CardDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em]">Restricted Administrative Access</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    placeholder="Administrator Name" 
                    className="pl-12 h-14 rounded-2xl bg-white/5 border-white/5 focus:border-primary/50 text-white font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secure Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    type="email"
                    placeholder="admin@edyfra.com" 
                    className="pl-12 h-14 rounded-2xl bg-white/5 border-white/5 focus:border-primary/50 text-white font-bold"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">System Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    type="password"
                    placeholder="••••••••••••" 
                    className="pl-12 h-14 rounded-2xl bg-white/5 border-white/5 focus:border-primary/50 text-white font-bold"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Master Security Key</Label>
                   <ShieldAlert className="h-3 w-3 text-primary animate-pulse" />
                </div>
                <Input 
                  required
                  type="password"
                  placeholder="Enter System Secret" 
                  className="h-14 rounded-2xl bg-primary/5 border-primary/20 focus:border-primary text-primary font-black tracking-widest text-center"
                  value={formData.securityKey}
                  onChange={(e) => setFormData({ ...formData, securityKey: e.target.value })}
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm tracking-widest shadow-2xl shadow-primary/40"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "INITIALIZE ADMIN ACCOUNT"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="mt-8 text-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">
           Warning: Unauthorized access is strictly prohibited and logged.
        </p>
      </motion.div>
    </div>
  );
}
