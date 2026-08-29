"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PostCard } from "./post-card";
import { CreatePostForm } from "./create-post-form";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Plus } from "lucide-react";

type PostWithProfile = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  profiles: { full_name: string; employee_code: string | null; avatar_url: string | null } | null;
};

type CommentWithProfile = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: { full_name: string; employee_code: string | null; avatar_url: string | null } | null;
};

type PostWithComments = PostWithProfile & { comments: CommentWithProfile[] };

export function PostFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithComments[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(
        `
        id, content, created_at, updated_at, author_id,
        profiles!posts_author_id_fkey (full_name, employee_code, avatar_url)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const postsWithComments = await Promise.all(
        (data as PostWithProfile[]).map(async (post) => {
          const { data: comments } = await supabase
            .from("comments")
            .select(
              `
              id, content, created_at, author_id,
              profiles!comments_author_id_fkey (full_name, employee_code, avatar_url)
            `,
            )
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

          return { ...post, comments: comments || [] };
        }),
      );
      setPosts(postsWithComments);
    }
    setLoading(false);
  };

  const handlePostCreated = async () => {
    setShowCreate(false);
    await loadPosts();
  };

  const handleCommentAdded = async (postId: string) => {
    await loadPosts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Team Feed</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" /> New Post
        </Button>
      </div>

      {showCreate && (
        <CreatePostForm onSubmit={handlePostCreated} onCancel={() => setShowCreate(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <MessageSquare className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
