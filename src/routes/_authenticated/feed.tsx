import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare } from "lucide-react";
import { PostFeed } from "@/components/fsm/post-feed";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient px-4 pt-8 pb-10 text-primary-foreground">
        <div className="container-main">
          <h1 className="text-2xl font-bold">Team Feed</h1>
          <p className="text-sm opacity-80 mt-1">Posts and comments from your team</p>
        </div>
      </header>

      <div className="container-main py-6">
        <PostFeed />
      </div>

      <BottomNav />
    </div>
  );
}
