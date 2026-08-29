"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send } from "lucide-react";
import { toast } from "sonner";

interface CreatePostFormProps {
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export function CreatePostForm({ onSubmit, onCancel }: CreatePostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!user) return;

    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: content.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      setContent("");
      toast.success("Post created");
      await onSubmit();
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-medium">
              {user?.email?.charAt(0).toUpperCase() ?? "U"}
            </span>
          </div>
          <div>
            <p className="font-medium">Create a post</p>
            <p className="text-sm text-muted-foreground">Share updates with your team</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="size-5" />
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's happening?"
        rows={4}
        maxLength={2000}
        disabled={submitting}
      />

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">{content.length}/2000</span>
        <Button type="submit" disabled={submitting || !content.trim()} className="gap-2">
          <Send className="size-4" /> Post
        </Button>
      </div>
    </form>
  );
}
