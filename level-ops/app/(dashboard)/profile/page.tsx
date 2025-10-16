"use client";

import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="container-xl space-y-5 pb-20 animate-fade-in">
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
        </div>
      </header>

      <Card className="p-16 flex flex-col items-center justify-center text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <p className="text-lg font-medium text-muted-foreground mb-2">Profile coming soon</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Edit your profile information, avatar, and personal preferences
        </p>
      </Card>
    </div>
  );
}
