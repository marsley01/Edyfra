import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated with your study activity.</p>
        </div>
        <Button variant="outline">Mark all as read</Button>
      </div>

      <Card className="min-h-[300px] flex flex-col items-center justify-center text-center p-12">
        <div className="bg-muted p-6 rounded-full mb-6">
          <BellOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <CardTitle>You&apos;re all caught up!</CardTitle>
        <p className="text-muted-foreground mt-2">New notifications will appear here.</p>
      </Card>
    </div>
  );
}
