"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fmtDateTime } from "@/lib/fsm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    author_id: string;
    profiles: { full_name: string; employee_code: string | null; avatar_url: string | null } | null;
    comments: {
      id: string;
      content: string;
      created_at: string;
      author_id: string;
      profiles: {
        full_name: string;
        employee_code: string | null;
        avatar_url: string | null;
      } | null;
    }[];
  };
  currentUserId: string | undefined;
  onCommentAdded: (postId: string) => Promise<void>;
}

export function PostCard({ post, currentUserId, onCommentAdded }: PostCardProps) {
  const isAuthor = post.author_id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = async () => {
    const { error } = await supabase
      .from("posts")
      .update({ content: editContent })
      .eq("id", post.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Post updated");
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Post deleted");
      window.location.reload();
    }
    setDeleting(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!currentUserId) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: currentUserId,
      content: newComment.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      setNewComment("");
      toast.success("Comment added");
      await onCommentAdded(post.id);
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Comment deleted");
      await onCommentAdded(post.id);
    }
  };

  const author = post.profiles;
  const timeAgo = fmtDateTime(post.created_at);

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarImage src={author?.avatar_url ?? undefined} />
          <AvatarFallback>{author?.full_name?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{author?.full_name ?? "Unknown"}</p>
            {author?.employee_code && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {author.employee_code}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
        </div>
        {isAuthor && (
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleEdit} disabled={submitting}>
                  <Edit className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                  <Edit className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={3}
          className="min-h-[80px]"
        />
      ) : (
        <p className="whitespace-pre-wrap">{post.content}</p>
      )}

      <div className="flex items-center gap-4 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare className="size-4" />
          {post.comments.length > 0 && (
            <span className="bg-muted rounded-full px-2 py-0.5 text-xs">
              {post.comments.length}
            </span>
          )}
        </Button>
      </div>

      {showComments && (
        <div className="space-y-3 pt-3 border-t">
          {post.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onDelete={handleDeleteComment}
            />
          ))}
          <CommentForm
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleAddComment}
            disabled={submitting}
            placeholder="Write a comment..."
          />
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: {
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    profiles: { full_name: string; employee_code: string | null; avatar_url: string | null } | null;
  };
  currentUserId: string | undefined;
  onDelete: (id: string) => void;
}) {
  const isAuthor = comment.author_id === currentUserId;
  const author = comment.profiles;

  return (
    <div className="flex gap-3">
      <Avatar className="size-8">
        <AvatarImage src={author?.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs">
          {author?.full_name?.charAt(0).toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{author?.full_name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{fmtDateTime(comment.created_at)}</p>
        </div>
        <p className="text-sm mt-0.5">{comment.content}</p>
        {isAuthor && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1"
            onClick={() => onDelete(comment.id)}
          >
            <Trash2 className="size-3 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CommentForm({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <div className="flex-1 flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className="min-h-[44px] flex-1 resize-none"
          disabled={disabled}
        />
        <Button type="submit" size="sm" disabled={disabled || !value.trim()}>
          Post
        </Button>
      </div>
    </form>
  );
}
