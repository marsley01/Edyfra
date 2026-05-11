"use client";

import { useState } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Star, 
  FileText, 
  ShoppingBag, 
  Smartphone,
  Shield,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Mock data for initial UI build
const initialResources = [
  {
    id: "1",
    title: "KCSE Mathematics Revision Guide",
    subject: "Mathematics",
    level: "High School",
    price: 150,
    rating: 4.8,
    downloads: 120,
    seller: "Tutor Maina",
    description: "Complete guide covering all topics from Form 1 to 4 with worked examples."
  },
  {
    id: "2",
    title: "Organic Chemistry Summary Notes",
    subject: "Chemistry",
    level: "University",
    price: 300,
    rating: 4.9,
    downloads: 45,
    seller: "Dr. Kamau",
    description: "Concise summary of organic chemistry mechanisms and reactions."
  },
  {
    id: "3",
    title: "Physics Paper 2 Predictions 2024",
    subject: "Physics",
    level: "High School",
    price: 100,
    rating: 4.5,
    downloads: 300,
    seller: "Physics Pro",
    description: "Predicted topics and questions based on previous trends."
  }
];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [isPaying, setIsPaying] = useState(false);

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
          <p className="text-muted-foreground font-medium">Verified study materials from top tutors and students.</p>
        </div>
        <Button className="h-12 px-6 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
          Sell Resources
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for subjects, topics, or sellers..." 
            className="pl-11 h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background transition-all"
          />
        </div>
        <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest gap-2">
          <Filter className="h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialResources.map((resource) => (
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
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{resource.level}</span>
              </div>
              <h3 className="text-lg font-black tracking-tightest leading-tight group-hover:text-primary transition-colors">{resource.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 font-medium">{resource.description}</p>
            <div className="pt-4 flex items-center justify-between border-t border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {resource.rating}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  <Download className="h-3 w-3" /> {resource.downloads}
                </div>
              </div>
              <span className="text-lg font-black tracking-tightest text-foreground">KES {resource.price}</span>
            </div>
          </motion.div>
        ))}
      </div>

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
