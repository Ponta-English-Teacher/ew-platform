"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

type Lane = {
  id: string;
  class_id: string;
  lane_key: string;
  lane_title: string;
  head_post: string;
  max_posts: number;
  sort_order: number;
};

type Post = {
  id: string;
  class_id: string;
  lane_id: string;
  student_id: string;
  anonymous_label_snapshot: string;
  post_number: number;
  reply_to_post_id: string | null;
  content: string;
  created_at: string;
};

type Student = {
  id: string;
  class_id: string;
  student_id: string;
  anonymous_label: string;
};

export default function StudentDiscussionPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const [classId, setClassId] = useState("");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [selectedLaneId, setSelectedLaneId] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [newPost, setNewPost] = useState("");
  const [replyToPostId, setReplyToPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  
  useEffect(() => {
  const loadLanes = async () => {
    const { data, error } = await supabase
      .from("ew_lanes")
      .select("*")
      .eq("class_id", classId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setLanes((data || []) as Lane[]);

    if (data && data.length > 0) {
      setSelectedLaneId(data[0].id);
    }
  };

  if (classId) {
    loadLanes();
  }
}, [classId]);

  useEffect(() => {
    const loadParams = async () => {
      const resolved = await params;
      setClassId(resolved.classId);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!classId) return;

    const loadInitialData = async () => {
      setLoading(true);

      const { data: laneData, error: laneError } = await supabase
        .from("ew_lanes")
        .select("*")
        .eq("class_id", classId)
        .order("sort_order");

      if (laneError) {
        console.error(laneError);
        setLoading(false);
        return;
      }

      const lanesResult = (laneData || []) as Lane[];
      setLanes(lanesResult);

      if (lanesResult.length > 0) {
        setSelectedLaneId(lanesResult[0].id);
      }

      const stored = localStorage.getItem("ew_student");

      if (stored) {
        const student = JSON.parse(stored) as Student;
        setCurrentStudent(student);
      }

      setLoading(false);
    };

    loadInitialData();
  }, [classId]);

  useEffect(() => {
    if (!selectedLaneId) return;

    const loadPosts = async () => {
      const { data, error } = await supabase
        .from("ew_posts")
        .select("*")
        .eq("lane_id", selectedLaneId)
        .order("post_number");

      if (error) {
        console.error(error);
        return;
      }

      setPosts((data || []) as Post[]);
    };

    loadPosts();

    const channel = supabase
      .channel(`posts-live-${selectedLaneId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ew_posts",
        },
        () => {
          loadPosts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ew_posts",
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLaneId]);

  useEffect(() => {
    if (!highlightedPostId) return;

    const timer = setTimeout(() => {
      setHighlightedPostId(null);
    }, 1800);

    return () => clearTimeout(timer);
  }, [highlightedPostId]);

  const selectedLane = lanes.find((lane) => lane.id === selectedLaneId);
  const replyTargetPost = posts.find((post) => post.id === replyToPostId);

  const refreshPosts = async () => {
    if (!selectedLaneId) return;

    const { data, error } = await supabase
      .from("ew_posts")
      .select("*")
      .eq("lane_id", selectedLaneId)
      .order("post_number");

    if (error) {
      console.error(error);
      return;
    }

    setPosts((data || []) as Post[]);
  };

  const handlePost = async () => {
    if (!newPost.trim()) {
      alert("Please write a post.");
      return;
    }

    if (!currentStudent) {
      alert("Student information not found.");
      return;
    }

    if (!selectedLaneId) {
      alert("Please select a lane.");
      return;
    }

    setPosting(true);

    const { data: existingPosts, error: countError } = await supabase
      .from("ew_posts")
      .select("id")
      .eq("lane_id", selectedLaneId);

    if (countError) {
      console.error(countError);
      alert("Could not count posts.");
      setPosting(false);
      return;
    }

    const nextPostNumber = (existingPosts?.length || 0) + 1;

    const { error: insertError } = await supabase.from("ew_posts").insert({
      class_id: classId,
      lane_id: selectedLaneId,
      student_id: currentStudent.id,
      anonymous_label_snapshot: currentStudent.anonymous_label,
      post_number: nextPostNumber,
      reply_to_post_id: replyToPostId,
      content: newPost.trim(),
    });

    if (insertError) {
      console.error(insertError);
      alert("Could not post.");
      setPosting(false);
      return;
    }

    await refreshPosts();

    setNewPost("");
    setReplyToPostId(null);
    setPosting(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentStudent) {
      alert("Student information not found.");
      return;
    }

    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    const { error } = await supabase
      .from("ew_posts")
      .delete()
      .eq("id", postId)
      .eq("student_id", currentStudent.id);

    if (error) {
      console.error(error);
      alert("Could not delete post.");
      return;
    }

    if (replyToPostId === postId) {
      setReplyToPostId(null);
    }

    await refreshPosts();
  };

  const jumpToPost = (postId: string) => {
    const el = document.querySelector(`[data-post-id="${postId}"]`);
    if (el) {
      setHighlightedPostId(postId);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const compactPreview = (text: string) => {
    if (text.length <= 90) return text;
    return text.slice(0, 90) + "...";
  };

  if (loading) {
    return <div className="p-8 text-lg text-black">Loading discussion...</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 p-6 text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          EW Discussion Platform
        </h1>
        <p className="mt-2 break-all text-sm text-gray-600">Class ID: {classId}</p>
        {currentStudent && (
          <p className="mt-1 text-sm font-medium text-gray-700">
            You are {currentStudent.anonymous_label}
          </p>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Lanes</h2>

          <div className="space-y-3">
            {lanes.map((lane) => {
              const isSelected = lane.id === selectedLaneId;

              return (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => {
                    setSelectedLaneId(lane.id);
                    setReplyToPostId(null);
                  }}
                  className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-black bg-gray-100"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="text-sm font-bold text-gray-500">
                    Lane {lane.lane_key}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {lane.lane_title}
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm text-gray-600">
                    Head: {lane.head_post}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 overflow-x-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {!selectedLane ? (
            <div className="text-gray-600">No lane selected.</div>
          ) : (
            <>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-bold text-gray-500">
                  Lane {selectedLane.lane_key}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {selectedLane.lane_title}
                </h2>
                <p className="mt-3 text-gray-700">{selectedLane.head_post}</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900">Posts</h3>

                {posts.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                    No posts yet in this lane.
                  </div>
                ) : (
                  <div className="mt-4 min-w-0 space-y-4">
                    {posts.map((post) => {
                      const isMyPost = post.student_id === currentStudent?.id;
                      const repliedTo = post.reply_to_post_id
                        ? posts.find((p) => p.id === post.reply_to_post_id)
                        : null;
                      const isSelectedReplyTarget = replyToPostId === post.id;
                      const hasReply = posts.some(
                        (p) => p.reply_to_post_id === post.id
                      );
                      const canDelete = isMyPost && !hasReply;
                      const isHighlighted = highlightedPostId === post.id;

                      return (
                        <div
                          key={post.id}
                          data-post-id={post.id}
                          onClick={() => setReplyToPostId(post.id)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            isSelectedReplyTarget
                              ? "border-orange-400 bg-orange-50"
                              : isHighlighted
                              ? "border-yellow-400 bg-yellow-50"
                              : isMyPost
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                <span className="font-semibold">
                                  #{post.post_number}
                                </span>
                                <span>{post.anonymous_label_snapshot}</span>
                                {repliedTo && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      jumpToPost(repliedTo.id);
                                    }}
                                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                                  >
                                    Reply to #{repliedTo.post_number}
                                  </button>
                                )}
                              </div>

                              {repliedTo && (
                                <div className="mt-3 max-w-xl rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      jumpToPost(repliedTo.id);
                                    }}
                                    className="font-semibold hover:underline"
                                  >
                                    ↳ #{repliedTo.post_number}{" "}
                                    {repliedTo.anonymous_label_snapshot}
                                  </button>
                                  <p className="mt-1 line-clamp-2 break-words">
                                    {compactPreview(repliedTo.content)}
                                  </p>
                                </div>
                              )}

                              <p className="mt-3 break-words text-gray-900">
                                {post.content}
                              </p>
                            </div>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePost(post.id);
                                }}
                                className="shrink-0 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  Write your post
                </h3>

                {replyTargetPost ? (
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 break-words">
                      Replying to #{replyTargetPost.post_number} (
                      {replyTargetPost.anonymous_label_snapshot})
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyToPostId(null)}
                      className="shrink-0 cursor-pointer rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-white"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                    Click a post above if you want to reply to it.
                  </div>
                )}

                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Write your answer here..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none focus:border-gray-500"
                />

                <button
                  type="button"
                  onClick={handlePost}
                  disabled={posting}
                  className="mt-3 cursor-pointer rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}