"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Session = {
  id: string;
  class_code: string;
  activity_title: string;
  course_id?: string;
};

type Task = {
  id: string;
  task_title: string;
};

type LaneConfig = {
  title: string;
  prompt: string;
};

type ChatMessage = {
  role: "teacher" | "ai";
  content: string;
};

const laneKeys = ["A", "B", "C", "D"] as const;
const languageLevelOptions = ["A1", "A2", "B1", "B2", "Advanced"];

function createEmptyLanes(): LaneConfig[] {
  return [
    { title: "", prompt: "" },
    { title: "", prompt: "" },
    { title: "", prompt: "" },
    { title: "", prompt: "" },
  ];
}

function parseAIResponse(text: string): LaneConfig[] | null {
  const result: LaneConfig[] = [];

  for (const key of laneKeys) {
    const titleMatch = text.match(new RegExp(`Lane ${key} Title:\\s*(.+)`));
    const promptMatch = text.match(new RegExp(`Lane ${key} Prompt:\\s*(.+)`));

    if (!titleMatch || !promptMatch) return null;

    result.push({
      title: titleMatch[1].trim(),
      prompt: promptMatch[1].trim(),
    });
  }

  return result;
}

export default function TeacherTaskPage() {
  const [sessionId, setSessionId] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [taskTitle, setTaskTitle] = useState("");
  const [languageLevel, setLanguageLevel] = useState("B1");
  const [maxTotalPosts, setMaxTotalPosts] = useState(80);
  const [lanes, setLanes] = useState<LaneConfig[]>(createEmptyLanes());
  const [saving, setSaving] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState<string | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isRightDragging = useRef(false);

  const [workspaceWidth, setWorkspaceWidth] = useState(1550);
  const [leftWidth, setLeftWidth] = useState(620);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("sessionId") || "";
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const loadPageData = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from("ew_classes")
        .select("id, class_code, activity_title, course_id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error(sessionError);
        return;
      }

      setSession(sessionData as Session);

      if (sessionData.course_id) {
        const { data: allSessions, error: allSessionsError } = await supabase
          .from("ew_classes")
          .select("id, class_code, activity_title")
          .eq("course_id", sessionData.course_id)
          .order("created_at", { ascending: true });

        if (allSessionsError) {
          console.error(allSessionsError);
        } else {
          setSessions((allSessions || []) as Session[]);
        }
      }

      const { data: existingTasks, error: tasksError } = await supabase
        .from("ew_tasks")
        .select("id, task_title")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (tasksError) {
        console.error(tasksError);
      } else {
        setTasks((existingTasks || []) as Task[]);
      }
    };

    loadPageData();
  }, [sessionId]);

  useEffect(() => {
    const box = chatScrollRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
      handleRightMouseMove(e);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;

    if (newWidth < 430 || newWidth > 840) return;
    setLeftWidth(newWidth);
  };

  const handleRightMouseDown = () => {
    isRightDragging.current = true;
    document.body.style.userSelect = "none";
  };

  const handleRightMouseMove = (e: MouseEvent) => {
    if (!isRightDragging.current || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;

    if (newWidth < 1200 || newWidth > 2200) return;
    setWorkspaceWidth(newWidth);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isRightDragging.current = false;
    document.body.style.userSelect = "";
  };

  const handleLaneChange = (
    index: number,
    field: keyof LaneConfig,
    value: string
  ) => {
    const updated = lanes.map((lane, i) =>
      i === index ? { ...lane, [field]: value } : lane
    );
    setLanes(updated);
  };

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    const updated: ChatMessage[] = [
      ...chatMessages,
      { role: "teacher", content: message },
    ];

    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/topic-discussion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherMessage: message,
          languageLevel,
          chatMessages: updated,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setChatMessages([
          ...updated,
          { role: "ai", content: "Error: " + data.error },
        ]);
        setChatLoading(false);
        return;
      }

      const aiText: string = data.result || "";
      setChatMessages([...updated, { role: "ai", content: aiText }]);
      setLastAIResponse(aiText);
    } catch {
      setChatMessages([
        ...updated,
        { role: "ai", content: "Error: Could not reach the AI assistant." },
      ]);
    }

    setChatLoading(false);
  };

  const handleApplyAISuggestion = () => {
    if (!lastAIResponse) return;

    const parsed = parseAIResponse(lastAIResponse);

    if (!parsed) {
      alert("Could not parse AI suggestion. Please try again.");
      return;
    }

    setLanes(parsed);
    alert("Lane titles and prompts have been applied.");
  };

  const handleSaveTask = async () => {
    if (!sessionId) {
      alert("No session selected.");
      return;
    }

    if (!taskTitle.trim()) {
      alert("Please enter a task title.");
      return;
    }

    for (let i = 0; i < lanes.length; i++) {
      if (!lanes[i].title.trim() || !lanes[i].prompt.trim()) {
        alert(`Please fill in Lane ${laneKeys[i]}.`);
        return;
      }
    }

    setSaving(true);

    const { data: taskData, error: taskError } = await supabase
      .from("ew_tasks")
      .insert({
        session_id: sessionId,
        task_title: taskTitle.trim(),
        language_level: languageLevel,
        max_total_posts: maxTotalPosts,
      })
      .select("id")
      .single();

    if (taskError || !taskData) {
      console.error(taskError);
      alert("Could not create task.");
      setSaving(false);
      return;
    }

    const laneRows = lanes.map((lane, index) => ({
      class_id: sessionId,
      task_id: taskData.id,
      lane_key: laneKeys[index],
      title: lane.title.trim(),
      prompt: lane.prompt.trim(),
      max_posts: maxTotalPosts,
      sort_order: index + 1,
    }));

    const { error: laneError } = await supabase
      .from("ew_lanes")
      .insert(laneRows);

    setSaving(false);

    if (laneError) {
      console.error(laneError);
      alert("Task created, but lanes could not be saved.");
      return;
    }

    alert("Task and lanes created successfully.");

    const { data: refreshedTasks, error: refreshedTasksError } = await supabase
      .from("ew_tasks")
      .select("id, task_title")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (refreshedTasksError) {
      console.error(refreshedTasksError);
    } else {
      setTasks((refreshedTasks || []) as Task[]);
    }

    setTaskTitle("");
    setLanes(createEmptyLanes());
    setLastAIResponse(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 md:px-6">
      <div
        ref={workspaceRef}
        style={{ width: workspaceWidth, maxWidth: "100%" }}
        className="mr-auto ml-0 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Setup</h1>
            <p className="mt-1 text-base text-slate-500">
              {session
                ? `${session.activity_title}`
                : "Loading session..."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sessionId && (
              <Link
                href={`/teacher/record?sessionId=${sessionId}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Record
              </Link>
            )}
            <Link
              href="/teacher/course"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div ref={splitRef} className="flex gap-4">
          {/* Left side */}
          <div style={{ width: leftWidth }} className="flex-shrink-0 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold uppercase tracking-wide text-slate-500">
                Sessions
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sessions.length === 0 && (
                  <p className="text-sm text-slate-400">No sessions found.</p>
                )}
                {sessions.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      window.location.href = `/teacher/task?sessionId=${s.id}`;
                    }}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                      s.id === sessionId
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}. {s.activity_title}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold uppercase tracking-wide text-slate-500">
                Existing Tasks
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tasks.length === 0 && (
                  <p className="text-sm text-slate-400">No tasks yet.</p>
                )}
                {tasks.map((task, i) => (
                  <div
                    key={task.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                  >
                    {i + 1}. {task.task_title}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold uppercase tracking-wide text-slate-500">
                New Task
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Task Title
                  </label>
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-600"
                    placeholder="e.g. Everyday Life"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Language Level
                  </label>
                  <select
                    value={languageLevel}
                    onChange={(e) => setLanguageLevel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-600"
                  >
                    {languageLevelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Maximum Total Posts
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxTotalPosts}
                    onChange={(e) => setMaxTotalPosts(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    AI Topic Assistant
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Chat with AI to generate lane titles and prompts below.
                  </p>
                </div>

                {lastAIResponse && (
                  <button
                    type="button"
                    onClick={handleApplyAISuggestion}
                    className="shrink-0 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Use These
                  </button>
                )}
              </div>

              <div
                ref={chatScrollRef}
                className="mt-4 min-h-[220px] max-h-[42vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-slate-400">
                      No messages yet. Describe the kind of task you want to
                      create.
                    </p>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === "teacher"
                          ? "ml-8 bg-slate-900 text-white"
                          : "mr-8 border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide opacity-50">
                        {msg.role === "teacher" ? "You" : "AI Assistant"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="mr-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-50">
                        AI Assistant
                      </div>
                      Thinking...
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="e.g. Icebreaker topics about their hobbies, school, and interests"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-slate-600"
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  onClick={handleSendChat}
                  disabled={chatLoading}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
                >
                  {chatLoading ? "..." : "Send"}
                </button>
              </div>
            </section>
          </div>

          {/* Divider */}
          <div
            onMouseDown={handleMouseDown}
            className="w-2 self-stretch cursor-col-resize rounded-full bg-slate-300 transition hover:bg-slate-400"
          />

          {/* Right side */}
          <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900">
                Lane Configuration
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Review and adjust lane titles and prompts before saving.
              </p>
            </div>

            <div className="max-h-[72vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                {lanes.map((lane, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="mb-3 text-lg font-bold text-slate-700">
                      Lane {laneKeys[index]}
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Title
                        </label>
                        <input
                          value={lane.title}
                          onChange={(e) =>
                            handleLaneChange(index, "title", e.target.value)
                          }
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-600"
                          placeholder={`Lane ${laneKeys[index]} title`}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Prompt
                        </label>
                        <textarea
                          value={lane.prompt}
                          onChange={(e) =>
                            handleLaneChange(index, "prompt", e.target.value)
                          }
                          rows={2}
                          className="mt-1 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-600"
                          placeholder={`Discussion prompt for Lane ${laneKeys[index]}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveTask}
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
            >
              {saving ? "Saving..." : "Save Task"}
            </button>
          </section>

          {/* Right expansion bar */}
          <div
            onMouseDown={handleRightMouseDown}
            className="w-2 self-stretch cursor-col-resize rounded-full bg-slate-300 transition hover:bg-slate-400"
          />
        </div>
      </div>
    </div>
  );
}