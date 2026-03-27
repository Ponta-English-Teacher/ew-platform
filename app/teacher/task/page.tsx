"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Session = {
  id: string;
  class_code: string;
  activity_title: string;
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

const defaultLanes: LaneConfig[] = [
  { title: "", prompt: "" },
  { title: "", prompt: "" },
  { title: "", prompt: "" },
  { title: "", prompt: "" },
];

const languageLevelOptions = ["A1", "A2", "B1", "B2", "Advanced"];

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

  const [taskTitle, setTaskTitle] = useState("");
  const [languageLevel, setLanguageLevel] = useState("B1");
  const [maxTotalPosts, setMaxTotalPosts] = useState(80);
  const [lanes, setLanes] = useState<LaneConfig[]>(defaultLanes);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState<string | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
const [workspaceWidth, setWorkspaceWidth] = useState(1550);
  const [leftWidth, setLeftWidth] = useState(500);
  const isDragging = useRef(false);
  const isRightDragging = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("sessionId") || "";
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      const { data, error } = await supabase
        .from("ew_classes")
        .select("id, class_code, activity_title")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setSession(data as Session);
    };

    loadSession();
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

  const handleLaneChange = (
    index: number,
    field: keyof LaneConfig,
    value: string
  ) => {
    const updated = [...lanes];
    updated[index][field] = value;
    setLanes(updated);
  };

const handleMouseDown = () => {
  isDragging.current = true;
  document.body.style.userSelect = "none";
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.current || !splitRef.current) return;

  const rect = splitRef.current.getBoundingClientRect();
  const newWidth = e.clientX - rect.left;

  if (newWidth < 320 || newWidth > 820) return;

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

  if (newWidth < 1000 || newWidth > 2000) return;

  setWorkspaceWidth(newWidth);
};

const handleMouseUp = () => {
  isDragging.current = false;
  isRightDragging.current = false;
  document.body.style.userSelect = "";
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
        alert(`Fill Lane ${laneKeys[i]}`);
        return;
      }
    }

    const { data: taskData, error: taskError } = await supabase
      .from("ew_tasks")
      .insert({
        session_id: sessionId,
        task_title: taskTitle,
        language_level: languageLevel,
        max_total_posts: maxTotalPosts,
      })
      .select("id")
      .single();

    if (taskError || !taskData) {
      console.error(taskError);
      alert("Could not create task.");
      return;
    }

    const laneRows = lanes.map((lane, index) => ({
      class_id: sessionId,
      task_id: taskData.id,
      lane_key: laneKeys[index],
      title: lane.title,
      prompt: lane.prompt,
      max_posts: maxTotalPosts,
      sort_order: index + 1,
    }));

    const { error: laneError } = await supabase
      .from("ew_lanes")
      .insert(laneRows);

    if (laneError) {
      console.error(laneError);
      alert("Task created, but lanes failed.");
      return;
    }

    alert("Task and lanes created successfully.");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 md:px-6">
      <div
  ref={workspaceRef}
  style={{ width: workspaceWidth }}
  className="space-y-4"
>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Task Making</h1>
            <p className="mt-1 text-sm text-slate-500">
              Build a discussion task, generate ideas with AI, and finalize the
              lane prompts.
            </p>
          </div>

          <Link
            href="/teacher/course"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <div ref={splitRef} className="flex gap-4">
          <div style={{ width: leftWidth }} className="flex-shrink-0 space-y-4">
            <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Task Settings
              </h2>

              {!session ? (
                <p className="mt-3 text-sm text-slate-500">Loading session...</p>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Selected Session
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {session.activity_title}
                  </p>
                  <p className="text-sm text-slate-600">{session.class_code}</p>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Task Title
                  </label>
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    placeholder="Everyday Life"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Language Level
                    </label>
                    <select
                      value={languageLevel}
                      onChange={(e) => setLanguageLevel(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    >
                      {languageLevelOptions.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Maximum Total Posts
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxTotalPosts}
                      onChange={(e) => setMaxTotalPosts(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    AI Topic Assistant
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Chat, refine, then use the questions you like.
                  </p>
                </div>

                {lastAIResponse && (
                  <button
                    type="button"
                    onClick={handleApplyAISuggestion}
                    className="rounded-xl border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Use These Questions
                  </button>
                )}
              </div>

              <div
                ref={chatScrollRef}
                className="mt-4 h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                {chatMessages.length === 0 && (
                  <p className="text-sm text-slate-400">
                    No messages yet. Describe the kind of task you want.
                  </p>
                )}

                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                        msg.role === "teacher"
                          ? "ml-8 bg-slate-900 text-white"
                          : "mr-8 border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                        {msg.role === "teacher" ? "You" : "AI Assistant"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="mr-8 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                        AI Assistant
                      </div>
                      Thinking...
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="e.g. Icebreaking topics about themselves"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  onClick={handleSendChat}
                  disabled={chatLoading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
                >
                  {chatLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </section>
          </div>
         <div
            onMouseDown={handleMouseDown}
            className="w-2 self-stretch cursor-col-resize rounded-full bg-slate-300 hover:bg-slate-400 transition"
          />
          <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Lane Configuration
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review, adjust, and save the final lane titles and prompts.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {lanes.map((lane, index) => (
  <div
    key={index}
    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
  >
    <div className="mb-2 flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-800">
        Lane {laneKeys[index]}
      </p>
    </div>

    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Title
        </label>
        <input
          value={lane.title}
          onChange={(e) =>
            handleLaneChange(index, "title", e.target.value)
          }
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          placeholder={`Lane ${laneKeys[index]} title`}
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Prompt
        </label>
        <textarea
          value={lane.prompt}
          onChange={(e) =>
            handleLaneChange(index, "prompt", e.target.value)
          }
          rows={3}
          className="mt-1 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          placeholder={`Prompt for Lane ${laneKeys[index]}`}
        />
      </div>
    </div>
  </div>
))}
            </div>

            <button
              onClick={handleSaveTask}
              className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Save Task
            </button>
          </section>
          <div
            onMouseDown={handleRightMouseDown}
            className="w-2 self-stretch cursor-col-resize rounded-full bg-slate-300 hover:bg-slate-400 transition"
          />
        </div>
      </div>
    </div>
  );
}