"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Search, Loader2, UserPlus, GraduationCap, MapPin, SearchX, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchStudents, Student } from "@/app/actions/search";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await searchStudents(query);
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4 text-center py-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter"
        >
          Find Your <span className="text-primary">People</span>
        </motion.h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium">
           Find students by name, school, or what they study.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto group">
        <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex items-center px-6 py-2">
          <Search className="h-6 w-6 text-muted-foreground" />
          <Input 
            placeholder="Search by name, school, or subject..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none focus-visible:ring-0 text-lg h-14 font-medium bg-transparent"
          />
          {loading && <Loader2 className="h-6 w-6 animate-spin text-primary ml-2" />}
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 space-y-4"
            >
              <div className="bg-destructive/10 text-destructive p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                 <SearchX className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Search failed</h3>
               <p className="text-muted-foreground max-w-xs mx-auto">Something went wrong. Please try again.</p>
              <Button onClick={() => setQuery(query)} variant="outline" className="gap-2">
                <RefreshCcw className="h-4 w-4" /> Retry Search
              </Button>
            </motion.div>
          ) : loading ? (
            <motion.div 
              key="loading"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {[1, 2, 4, 5, 6].map((i) => (
                <div key={i} className="p-6 border border-border rounded-3xl space-y-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </motion.div>
          ) : hasSearched && results.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 space-y-4"
            >
               <div className="bg-secondary p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                 <SearchX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold">No results found</h3>
               <p className="text-muted-foreground">Try a different name, school, or subject.</p>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {results.map((student) => (
                <Card key={student.id} className="border-border hover:border-primary/50 transition-all group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="relative">
                          <Image 
                            src={student.avatar_url || "/default-avatar.png"} 
                            alt={student.name} 
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-2xl bg-secondary object-cover ring-1 ring-border group-hover:ring-primary/30 transition-all"
                          />
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-black text-lg tracking-tight group-hover:text-primary transition-colors">{student.name}</h3>
                          <div className="flex flex-col gap-1 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><GraduationCap className="h-3 w-3" /> {student.school || ""}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {student.course?.replace("_", " ")}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary">
                        <UserPlus className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Link href={`/profile/${student.id}`} className="flex-1">
                        <Button className="w-full rounded-xl font-black text-xs tracking-widest h-11 bg-foreground text-background hover:bg-foreground/90 uppercase">
                          View Profile
                        </Button>
                      </Link>
                      <Button variant="outline" className="rounded-xl font-black text-xs tracking-widest h-11 uppercase border-border">
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <motion.div 
               key="initial"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
               {["Mathematics", "Physics", "Computer Science", "Biology", "Literature", "Chemistry"].map((tag) => (
                 <div 
                   key={tag}
                   onClick={() => setQuery(tag)}
                   className="p-6 bg-secondary/50 border border-border rounded-3xl text-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all space-y-3"
                 >
                    <div className="w-10 h-10 bg-background border border-border rounded-xl flex items-center justify-center mx-auto text-primary">
                       <Search className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{tag}</p>
                 </div>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
