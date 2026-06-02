"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, Users, Star, Globe, ShieldCheck, 
  Loader2, UserCheck, Sparkles, Trophy, Flame,
  Zap, ArrowRight, Crown, Medal, Target
} from "lucide-react";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import Link from "next/link";
import { getCommunityScholars } from "@/app/actions/user";
import { Badge } from "@/components/ui/badge";
import { CommunityFeed } from "@/components/community/CommunityFeed";

interface Scholar {
  id: string;
  name: string;
  county: string;
  points: number;
  tier: string;
}

export default function CommunityPage() {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTopScholars();
  }, []);

  const fetchTopScholars = async () => {
    try {
      const data = await getCommunityScholars();
      setScholars(
        data.map((row) => ({
          ...row,
          tier: String(row.tier),
        }))
      );
    } catch (e) {
      console.error("Error fetching scholars:", e);
    } finally {
      setLoading(false);
    }
  };

  // Render the real forum UI on this route.
  // This removes the marketing/demo layout from the community experience.
  return <CommunityFeed />;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-background" />
        <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
        
        <div className="container-max relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                <Users className="h-4 w-4" />
                Your Study Circle
              </div>
              
               <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-none">
                 Find people <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">learning with you.</span>
               </h1>
               
               <p className="text-lg md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                 Meet students working through the same pressure, topics, and exams. Ask, share, and build momentum together.
               </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                <Link href="/signup">
                  <Button className="h-14 px-10 rounded-full bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95">
                    Create My Profile
                  </Button>
                </Link>
                <Link href="/dashboard/feed">
                  <Button variant="ghost" className="h-14 px-10 rounded-full font-black text-xs tracking-widest uppercase group">
                    See Student Posts <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-y border-border/50 bg-secondary/30">
        <div className="container-max py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Students", value: "Growing", icon: Users },
              { label: "Points Earned", value: "Every Day", icon: Trophy },
              { label: "Study Help", value: "Live", icon: Zap },
              { label: "Reach", value: "Kenya", icon: Globe },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-6 bg-background/50 rounded-2xl border border-border/50"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tightest">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Scholars Section */}
      <div className="py-32">
        <div className="container-max space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <Crown className="h-8 w-8 text-primary" />
                 <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Students showing up.</h2>
               </div>
               <p className="text-lg text-muted-foreground font-medium max-w-xl">
                 A quick look at students building points through consistency, sessions, and daily effort.
               </p>
            </div>
            <Link href="/dashboard/leaderboard">
              <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase text-primary hover:text-primary group">
                See Full Leaderboard <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : scholars.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {scholars.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-6 bg-background rounded-[2rem] border transition-all duration-500 hover:shadow-xl hover:translate-y-[-4px] ${
                    i === 0 ? "border-primary/50 shadow-lg shadow-primary/5" : "border-border/50"
                  }`}
                >
                  {i === 0 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white text-[8px] font-black uppercase tracking-widest shadow-lg">
                      #1 Scholar
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-black text-muted-foreground/30 w-8">
                        #{i + 1}
                      </div>
                      <AvatarPremium seed={s.id} name={s.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-base tracking-tight truncate">{s.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase truncate">
                            {s.county}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase border-primary/30 text-primary">
                            {s.tier}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Points</span>
                      <span className="text-lg font-black tracking-tightest text-primary">{s.points.toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-6 bg-secondary/20 rounded-[2rem] border border-border/50">
               <UserCheck className="h-12 w-12 text-muted-foreground/20 mx-auto" />
               <div className="space-y-2">
                 <p className="text-xl font-black tracking-tightest">No rankings yet</p>
                 <p className="text-muted-foreground">Start learning, earn points, and help set the pace for everyone else.</p>
               </div>
               <Link href="/signup">
                 <Button className="rounded-full bg-primary">
                   Get Started <Zap className="ml-2 h-4 w-4" />
                 </Button>
               </Link>
             </div>
          )}
        </div>
      </div>

      {/* Community Feed Preview */}
      <div className="py-32 bg-secondary/20">
        <div className="container-max space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                <h2 className="text-4xl md:text-5xl font-black tracking-tightest">What students are sharing.</h2>
              </div>
              <p className="text-lg text-muted-foreground font-medium max-w-xl">
                Questions, wins, study notes, and honest progress from the Edyfra community.
              </p>
            </div>
            <Link href="/dashboard/feed">
              <Button className="h-12 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] tracking-widest uppercase shadow-lg transition-all">
                Open Student Feed <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="py-20 text-center space-y-6 bg-background rounded-[3rem] border border-border/50">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
              <Users className="h-10 w-10 text-muted-foreground/20" />
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <h3 className="text-2xl font-black tracking-tightest">No one has posted yet.</h3>
              <p className="text-muted-foreground">
                Share the question you are working on, a topic you finally understood, or a win from today.
              </p>
            </div>
            <Link href="/dashboard/feed">
              <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest uppercase">
                Share My First Update <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-32">
        <div className="container-max">
          <div className="relative p-16 md:p-24 rounded-[4rem] bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white text-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%22.05%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%223%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10 space-y-8"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tightest">
                Ready to find your people?
              </h2>
              <p className="text-xl md:text-2xl font-medium opacity-90 max-w-2xl mx-auto">
                Build a profile, join the feed, and make studying feel less lonely.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button className="h-14 px-12 rounded-full bg-white text-primary hover:bg-white/90 font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/onboarding">
                  <Button variant="ghost" className="h-14 px-12 rounded-full text-white border border-white/30 hover:bg-white/10 font-black text-xs tracking-widest uppercase">
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
