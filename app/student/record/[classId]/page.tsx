"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

type Lane = {
  id: string;
  lane_key: string;
  lane_title: string;
  sort_order: number;
};

type Post = {
  id: string;
  lane_id: string;
  post_number: number;
  content: string;
  created_at: string;
};

type Student = {
  id: string;
  student_id: string;
  anonymous_label: string;
};

type LaneWithPosts = Lane & {
  posts: Post[];
};

type ClassInfo = {
  activity_title: string;
  class_code: string;
};

type VoiceOption = "female" | "male";

type ExpressionVariations = {
  casual: string;
  slightlyFormal: string;
  academic: string;
  completeParaphrase: string;
};

const laneColors: Record<string, { badge: string; dot: string }> = {
  A: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  B: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  C: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-400" },
  D: { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-400" },
};

const suggestionStyles = [
  {
    key: "casual" as const,
    label: "✨ AI Suggestions",
    headerBg: "bg-gradient-to-r from-teal-50 to-cyan-50",
    headerText: "text-teal-800",
    border: "border-teal-100",
    listenBtn: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  {
    key: "slightlyFormal" as const,
    label: "➕ A Little Formal",
    headerBg: "bg-gradient-to-r from-amber-50 to-yellow-50",
    headerText: "text-amber-700",
    border: "border-amber-100",
    listenBtn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  {
    key: "academic" as const,
    label: "➕ Academic",
    headerBg: "bg-gradient-to-r from-violet-50 to-purple-50",
    headerText: "text-violet-700",
    border: "border-violet-100",
    listenBtn: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  {
    key: "completeParaphrase" as const,
    label: "🔄 Complete Paraphrase",
    headerBg: "bg-gradient-to-r from-slate-50 to-gray-50",
    headerText: "text-slate-700",
    border: "border-slate-200",
    listenBtn: "bg-slate-600 hover:bg-slate-700 text-white",
  },
];

export default function StudentRecordPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const [classId, setClassId] = useState("");
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [laneGroups, setLaneGroups] = useState<LaneWithPosts[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("female");
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);

  const [expandedLearningPostId, setExpandedLearningPostId] = useState<string | null>(null);
  const [learningLoadingPostId, setLearningLoadingPostId] = useState<string | null>(null);
  const [learningErrorByPostId, setLearningErrorByPostId] = useState<Record<string, string>>({});
  const [learningByPostId, setLearningByPostId] = useState<Record<string, ExpressionVariations>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const loadParams = async () => {
      const resolved = await params;
      setClassId(resolved.classId);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!classId) return;

    const loadRecord = async () => {
      setLoading(true);
      setErrorMessage("");

      const stored = localStorage.getItem("ew_student");
      if (!stored) {
        setErrorMessage("Student information not found. Please join the class first.");
        setLoading(false);
        return;
      }

      const student = JSON.parse(stored) as Student;
      setCurrentStudent(student);

      const { data: classData, error: classError } = await supabase
        .from("ew_classes")
        .select("activity_title, class_code")
        .eq("id", classId)
        .single();

      if (classError) {
        console.error(classError);
        setErrorMessage("Could not load class information.");
        setLoading(false);
        return;
      }

      setClassInfo(classData as ClassInfo);

      const { data: laneData, error: laneError } = await supabase
        .from("ew_lanes")
        .select("id, lane_key, lane_title, sort_order")
        .eq("class_id", classId)
        .order("sort_order");

      if (laneError || !laneData) {
        console.error(laneError);
        setErrorMessage("Could not load lane information.");
        setLoading(false);
        return;
      }

      const { data: postData, error: postError } = await supabase
        .from("ew_posts")
        .select("id, lane_id, post_number, content, created_at")
        .eq("class_id", classId)
        .eq("student_id", student.id)
        .order("created_at", { ascending: true });

      if (postError) {
        console.error(postError);
        setErrorMessage("Could not load your posts.");
        setLoading(false);
        return;
      }

      const posts = (postData || []) as Post[];

      const grouped: LaneWithPosts[] = (laneData as Lane[]).map((lane) => ({
        ...lane,
        posts: posts.filter((post) => post.lane_id === lane.id),
      }));

      setLaneGroups(grouped);
      setLoading(false);
    };

    loadRecord();
  }, [classId]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const lanesWithPosts = laneGroups.filter((lane) => lane.posts.length > 0);

  const totalPosts = useMemo(
    () => laneGroups.reduce((sum, lane) => sum + lane.posts.length, 0),
    [laneGroups]
  );

  const totalWords = useMemo(
    () =>
      laneGroups.reduce(
        (sum, lane) =>
          sum +
          lane.posts.reduce(
            (laneSum, post) =>
              laneSum + post.content.trim().split(/\s+/).filter(Boolean).length,
            0
          ),
        0
      ),
    [laneGroups]
  );

  const activeLanes = lanesWithPosts.length;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const countWords = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  const handleListen = async (audioKey: string, text: string) => {
    if (!text.trim()) return;

    try {
      setErrorMessage("");
      setStatusMessage("");
      setPlayingPostId(audioKey);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      if (!response.ok) {
        let message = "Could not generate audio.";
        try {
          const errorData = await response.json();
          if (errorData?.error) message = errorData.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingPostId(null);
      audio.onerror = () => {
        setPlayingPostId(null);
        setErrorMessage("Audio playback failed.");
      };

      await audio.play();
      setStatusMessage(`Playing with ${selectedVoice === "female" ? "Female" : "Male"} voice.`);
    } catch (error) {
      console.error(error);
      setPlayingPostId(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not play audio.");
    }
  };

  const handleToggleLearning = async (post: Post, laneTitle: string) => {
    if (expandedLearningPostId === post.id) {
      setExpandedLearningPostId(null);
      return;
    }

    setExpandedLearningPostId(post.id);
    if (learningByPostId[post.id]) return;

    try {
      setLearningLoadingPostId(post.id);
      setLearningErrorByPostId((prev) => ({ ...prev, [post.id]: "" }));

      const response = await fetch("/api/expression-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: post.content,
          laneTitle,
          activityTitle: classInfo?.activity_title || "",
        }),
      });

      if (!response.ok) {
        let message = "Could not generate learning suggestions.";
        try {
          const errorData = await response.json();
          if (errorData?.error) message = errorData.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }

      const data = (await response.json()) as ExpressionVariations;
      setLearningByPostId((prev) => ({ ...prev, [post.id]: data }));
    } catch (error) {
      console.error(error);
      setLearningErrorByPostId((prev) => ({
        ...prev,
        [post.id]: error instanceof Error ? error.message : "Could not generate learning suggestions.",
      }));
    } finally {
      setLearningLoadingPostId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-base">Loading your record...</p>
      </div>
    );
  }

  if (errorMessage && !currentStudent && !classInfo && laneGroups.length === 0) {
    return <div className="p-8 text-lg text-black">{errorMessage}</div>;
  }

  if (!currentStudent) {
    return (
      <div className="p-8 text-lg text-black">
        Student information not found. Please join the class first.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 text-black md:p-6">
      <div className="mx-auto max-w-3xl space-y-4">

        {/* ── Header card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Student Record
          </p>

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {classInfo?.activity_title || "Class Record"}
                <span className="ml-2 text-xl font-normal text-slate-400">
                  · {classInfo?.class_code || "-"} · {currentStudent.anonymous_label}
                </span>
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  Posts <span className="font-bold text-slate-900">{totalPosts}</span>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Lanes <span className="font-bold text-slate-900">{activeLanes}</span>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Words <span className="font-bold text-slate-900">{totalWords}</span>
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <a
                href={`/student/discussion/${classId}`}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                ← Discussion
              </a>

              {/* Voice toggle */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["female", "male"] as VoiceOption[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVoice(v)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
                      selectedVoice === v
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:bg-white"
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Status / error banners ── */}
        {statusMessage && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {statusMessage}
          </div>
        )}
        {errorMessage && currentStudent && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ── Empty state ── */}
        {lanesWithPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            You have not posted anything in this class yet.
          </div>
        ) : (
          <div className="space-y-4">
            {lanesWithPosts.map((lane) => {
              const color = laneColors[lane.lane_key] || { badge: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };

              return (
                <div
                  key={lane.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  {/* Lane header bar */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${color.badge}`}>
                        Lane {lane.lane_key}
                      </span>
                      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                      <h2 className="text-base font-semibold text-slate-800">
                        {lane.lane_title}
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {lane.posts.length} post{lane.posts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Posts */}
                  <div className="divide-y divide-slate-100">
                    {lane.posts.map((post) => {
                      const learning = learningByPostId[post.id];
                      const learningError = learningErrorByPostId[post.id];
                      const isExpanded = expandedLearningPostId === post.id;
                      const isLearningLoading = learningLoadingPostId === post.id;
                      const isPlaying = playingPostId === post.id;

                      return (
                        <div key={post.id} className="px-5 py-4">

                          {/* Post meta row */}
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-slate-600">
                              Post #{post.post_number}
                            </span>
                            <span>·</span>
                            <span>{formatTime(post.created_at)}</span>
                            <span>·</span>
                            <span>{countWords(post.content)} words</span>
                          </div>

                          {/* Your sentence pill + text */}
                          <div className="mb-3">
                            <span className="mb-1.5 inline-block rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-600">
                              Your sentence:
                            </span>
                            <p className="text-[1rem] leading-relaxed text-slate-900">
                              {post.content}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleListen(post.id, post.content)}
                              disabled={isPlaying}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                              🎧 {isPlaying ? "Playing..." : "Listen"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleLearning(post, lane.lane_title)}
                              disabled={isLearningLoading}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold shadow-sm transition ${
                                isExpanded
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              } disabled:opacity-50`}
                            >
                              {isLearningLoading
                                ? "Loading..."
                                : isExpanded
                                ? "✨ Improve ▲"
                                : "✨ Improve ▼"}
                            </button>
                          </div>

                          {/* Suggestions panel */}
                          {isExpanded && (
                            <div className="mt-4 space-y-3">
                              {isLearningLoading && (
                                <p className="text-sm text-slate-400">Generating suggestions...</p>
                              )}
                              {learningError && !isLearningLoading && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                  {learningError}
                                </div>
                              )}
                              {learning && !isLearningLoading &&
                                suggestionStyles.map((style) => (
                                  <div
                                    key={style.key}
                                    className={`rounded-xl border ${style.border} overflow-hidden`}
                                  >
                                    {/* Suggestion header */}
                                    <div className={`flex items-center justify-between gap-3 px-4 py-2 ${style.headerBg}`}>
                                      <span className={`text-sm font-bold ${style.headerText}`}>
                                        {style.label}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleListen(
                                            `${post.id}-${style.key}`,
                                            learning[style.key]
                                          )
                                        }
                                        disabled={playingPostId === `${post.id}-${style.key}`}
                                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition ${style.listenBtn} disabled:opacity-50`}
                                      >
                                        🎧 {playingPostId === `${post.id}-${style.key}` ? "Playing..." : "Listen"}
                                      </button>
                                    </div>
                                    {/* Suggestion text */}
                                    <div className="bg-white px-4 py-3">
                                      <p className="text-sm leading-relaxed text-slate-800">
                                        {learning[style.key]}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
