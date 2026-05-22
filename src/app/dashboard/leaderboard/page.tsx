"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, TrendingUp, Search, Loader2, Award } from "lucide-react";
import { getUserData, getLeaderboard } from "@/app/actions/user";

import { User } from "@/generated/client";

interface Leader {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  educationLevel: string;
  tier: string;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setLoading(true);
    const user = await getUserData();
    setUserData(user);

    if (user?.educationLevel) {
      const data = await getLeaderboard(user.educationLevel);

      setLeaders(
        data.map((row) => ({
          ...row,
          educationLevel: row.educationLevel ?? "",
          tier: String(row.tier),
        }))
      );
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const podium = leaders.slice(0, 3);
  const others = leaders.slice(3);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-primary flex items-center justify-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500 fill-yellow-500" />
          {userData?.educationLevel?.replace("_", " ")} Rankings
        </h1>
        <p className="text-muted-foreground text-lg italic">See how you stack up against your peers.</p>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10">
        {/* 2nd Place */}
        {podium[1] && (
          <Card className="order-2 md:order-1 border-2 border-slate-300/20 bg-slate-500/5 relative overflow-visible transform hover:scale-105 transition-all">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="bg-slate-400 p-2 rounded-full border-4 border-background">
                <Medal className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardContent className="pt-10 pb-6 text-center space-y-3">
              <Avatar className="h-20 w-20 mx-auto border-4 border-slate-400">
                <AvatarImage src={podium[1].avatar || undefined} />
                <AvatarFallback>{podium[1].name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg truncate">{podium[1].name}</h3>
                <p className="text-sm font-black text-slate-500">{podium[1].points.toLocaleString()} PTS</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 1st Place */}
        {podium[0] && (
          <Card className="order-1 md:order-2 border-4 border-yellow-500/30 bg-yellow-500/5 relative overflow-visible scale-110 shadow-2xl z-10 transform hover:scale-115 transition-all">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <div className="bg-yellow-500 p-3 rounded-full border-4 border-background animate-bounce">
                <Crown className="h-8 w-8 text-white fill-current" />
              </div>
            </div>
            <CardContent className="pt-12 pb-8 text-center space-y-4">
              <Avatar className="h-24 w-24 mx-auto border-4 border-yellow-500 shadow-xl">
                <AvatarImage src={podium[0].avatar || undefined} />
                <AvatarFallback className="text-2xl font-bold">{podium[0].name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-black text-2xl truncate">{podium[0].name}</h3>
                <Badge className="bg-yellow-500 text-white border-none px-4 py-1">Top Scholar</Badge>
                <p className="text-xl font-black text-yellow-600 mt-2">{podium[0].points.toLocaleString()} PTS</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3rd Place */}
        {podium[2] && (
          <Card className="order-3 md:order-3 border-2 border-orange-300/20 bg-orange-500/5 relative overflow-visible transform hover:scale-105 transition-all">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="bg-orange-600 p-2 rounded-full border-4 border-background">
                <Medal className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardContent className="pt-10 pb-6 text-center space-y-3">
              <Avatar className="h-20 w-20 mx-auto border-4 border-orange-400">
                <AvatarImage src={podium[2].avatar || undefined} />
                <AvatarFallback>{podium[2].name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg truncate">{podium[2].name}</h3>
                <p className="text-sm font-black text-orange-600">{podium[2].points.toLocaleString()} PTS</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Others Table */}
      <Card className="border-2 border-primary/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center justify-between">
            <h2 className="font-bold text-lg">Leaderboard</h2>
           <Award className="h-5 w-5 text-primary" />
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-primary/5">
            {others.map((scholar, index) => (
              <div key={scholar.id} className={`flex items-center justify-between p-4 transition-colors hover:bg-primary/[0.02] ${scholar.id === userData?.id ? "bg-primary/[0.03] border-l-4 border-primary" : ""}`}>
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center font-black text-muted-foreground">{index + 4}</span>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={scholar.avatar || undefined} />
                    <AvatarFallback>{scholar.name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm">{scholar.name}</p>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{scholar.tier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-right">
                      <p className="font-black text-sm text-primary">{scholar.points.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">POINTS</p>
                   </div>
                   <div className="h-8 w-1 bg-primary/10 rounded-full ml-4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
