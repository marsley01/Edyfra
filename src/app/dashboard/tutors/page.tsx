"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Search, Star, MessageSquare, Clock, MapPin, Filter, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";

import { getVerifiedTutors } from "@/app/actions/tutor";

export default function TutorsPage() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");

  useEffect(() => {
    getUserData().then(setUserData);
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const data = await getVerifiedTutors();
      setTutors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subjects = getSubjectsByLevel(userData?.educationLevel);

  const filteredTutors = tutors.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) &&
    (subject === "all" || t.tutorProfile?.subjects?.includes(subject))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-primary">Academic Experts</h1>
          <p className="text-muted-foreground text-lg">Connect with verified scholars specialized in your field.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 rounded-xl border-primary/10" 
              placeholder="Search experts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={subject} onValueChange={(v) => setSubject(v || "all")}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl border-primary/10">
              <SelectValue placeholder="Focus Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-xl border-primary/10"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-[320px] animate-pulse bg-muted/30 rounded-2xl" />
          ))}
        </div>
      ) : filteredTutors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutors.map((tutor) => (
            <Card key={tutor.id} className="group hover:shadow-2xl transition-all border-2 border-primary/5 hover:border-primary/20 overflow-hidden rounded-2xl bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4 relative">
                 <div className="absolute top-4 right-4 flex gap-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <Star className="h-3 w-3 fill-current mr-1" />
                      {tutor.tutorProfile?.rating?.toFixed(1) || "New"}
                    </Badge>
                 </div>
                 <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-md">
                      <AvatarImage src={tutor.avatar} />
                      <AvatarFallback className="bg-primary text-white font-bold">
                        {tutor.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl font-bold">{tutor.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 font-medium">
                        <GraduationCap className="h-3 w-3" />
                        {tutor.educationLevel?.replace("_", " ")} Scholar
                      </CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {tutor.tutorProfile?.subjects?.map((s: string) => (
                    <Badge key={s} variant="outline" className="bg-primary/5 border-primary/10 text-primary-foreground/70">{s}</Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 italic leading-relaxed">
                  &quot;{tutor.tutorProfile?.bio || "Committed to academic excellence through structured peer-to-peer mentoring."}&quot;
                </p>
                <div className="flex justify-between items-center text-sm font-bold">
                  <div className="flex items-center gap-1 text-primary">
                    <Clock className="h-4 w-4" />
                    Ksh {tutor.tutorProfile?.hourlyRate || "500"}/hr
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {tutor.county || "Kenya"}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-primary/[0.03] border-t border-primary/5 p-4 flex gap-2">
                <Button className="flex-1 gap-2 rounded-xl bg-primary hover:bg-primary/90 font-bold">Request Session</Button>
                <Button variant="outline" size="icon" className="rounded-xl border-primary/10 text-primary hover:bg-primary/10"><MessageSquare className="h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 space-y-6">
          <div className="bg-primary/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto border-2 border-primary/10">
            <Search className="h-10 w-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">No Scholars Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">There are currently no active experts in the {userData?.educationLevel?.replace("_", " ")} category matching your search.</p>
          </div>
          <Button onClick={() => { setSearch(""); setSubject("all"); }} variant="outline" className="rounded-xl border-primary/20">Reset Search Parameters</Button>
        </div>
      )}
    </div>
  );
}
