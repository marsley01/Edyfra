"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Star, 
  FileText, 
  ShoppingBag, 
  Smartphone,
  Shield,
  Loader2,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

const SUBJECTS = [
  "All", "Mathematics", "English", "Kiswahili", "Physics", "Chemistry",
  "Biology", "History", "Geography", "CRE", "IRE", "Business Studies",
  "Computer Studies", "Agriculture"
];

const LEVELS = ["All", "High School", "University"];
const PRICE_FILTERS = ["All", "Free", "Paid"];
const TYPE_FILTERS = ["All", "Notes", "Past Paper", "Revision Guide", "Reference Book", "Curriculum Book"];

export default function MarketplacePage() {
  const [resources, setResources] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "my-purchases">("browse");
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (tab === "browse") {
      fetchResources();
    } else {
      fetchPurchases();
    }
  }, [tab]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("resource_purchases")
        .select("*, resource:resources(*)")
        .eq("user_id", user.id)
        .order("paid_at", { ascending: false });

      if (data) setPurchases(data);
    } catch {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject !== "All") params.set("subject", selectedSubject);
      if (selectedLevel !== "All") params.set("level", selectedLevel);
      if (selectedPrice !== "All") params.set("price", selectedPrice.toLowerCase());
      if (selectedType !== "All") params.set("type", selectedType);
      if (search) params.set("search", search);

      const res = await fetch(`/api/resources?${params.toString()}`);
      const data = await res.json();
      if (data.resources) {
        setResources(data.resources);
      }
    } catch (error) {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const handlePurchase = async () => {
    setIsPaying(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedResource.price,
          type: "resource",
          id: selectedResource.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.authorization_url) {
        toast.success("Redirecting to secure checkout...");
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* ... previous content ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tightest">Resource <span className="text-primary">Marketplace</span></h1>
          <p className="text-muted-foreground font-medium">Verified study materials from top tutors.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-secondary/50 border border-border w-fit">
        <button
          onClick={() => setTab("browse")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "browse" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setTab("my-purchases")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "my-purchases" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Purchases
        </button>
      </div>

      {tab === "browse" ? (
      <>
      {/* Search & Filter */}
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for subjects, topics, or sellers..." 
            className="pl-11 h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background transition-all"
          />
        </div>
        <Button 
          type="button"
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          className="h-14 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest gap-2"
        >
          <Filter className="h-4 w-4" /> {showFilters ? "Hide Filters" : "Filters"}
        </Button>
      </form>

      {/* Filter dropdowns */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</label>
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Level</label>
                <select 
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price</label>
                <select 
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                >
                  {PRICE_FILTERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                >
                  {TYPE_FILTERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">No resources found matching your filters.</p>
          <Button variant="outline" onClick={() => {
            setSearch("");
            setSelectedSubject("All");
            setSelectedLevel("All");
            setSelectedPrice("All");
            setSelectedType("All");
            fetchResources();
          }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <motion.div 
              layoutId={resource.id}
              key={resource.id}
              onClick={() => setSelectedResource(resource)}
              className="p-6 rounded-[2rem] border border-border bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer group space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">{resource.subject}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{resource.education_level || resource.level}</span>
                </div>
                <h3 className="text-lg font-black tracking-tightest leading-tight group-hover:text-primary transition-colors">{resource.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 font-medium">{resource.description || ""}</p>
              <div className="pt-4 flex items-center justify-between border-t border-border/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {resource.rating || 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <Download className="h-3 w-3" /> {resource.downloads || 0}
                  </div>
                </div>
                <span className="text-lg font-black tracking-tightest text-foreground">
                  {resource.price === 0 ? "Free" : `KES ${resource.price}`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      </>
      ) : (
      <div className="space-y-6">
        <h2 className="text-2xl font-black tracking-tightest">My <span className="text-primary">Purchases</span></h2>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">You haven't purchased any resources yet.</p>
            <Button onClick={() => setTab("browse")} className="h-12 px-6 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest">
              Browse Resources
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase: any) => (
              <div key={purchase.id} className="p-6 rounded-[2rem] border border-border bg-secondary/20 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center shadow-sm">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tightest">{purchase.resource?.title || "Resource"}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Purchased on {new Date(purchase.paid_at).toLocaleDateString()}</p>
                </div>
                <Button 
                  onClick={() => window.open(purchase.resource?.file_path, "_blank")}
                  className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 font-black text-xs uppercase tracking-widest"
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Purchase Modal */}
      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResource(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              layoutId={selectedResource.id}
              className="relative w-full max-w-lg bg-background rounded-[2.5rem] border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tightest">{selectedResource.title}</h2>
                    <p className="text-muted-foreground font-medium">By {selectedResource.seller}</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-secondary/50 border border-border space-y-4 text-center">
                   <p className="text-sm font-medium text-muted-foreground">Secure payment to unlock access</p>
                   <div className="text-3xl font-black tracking-tightest">KES {selectedResource.price}</div>
                   
                   <div className="space-y-4 pt-2">
                      <Button 
                        onClick={handlePurchase}
                        disabled={isPaying}
                        className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock Resource"}
                      </Button>
                   </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
                  <Shield className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Secure Checkout • Instant Access</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
