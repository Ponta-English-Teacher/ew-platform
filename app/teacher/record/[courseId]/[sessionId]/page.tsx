"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Session = {
  id: string;
  activity_title: string;
  class_code: string;
};

type Task = {
  id: string;
  task_title: string;
};

type LaneStat = {
  lane_key: string;
  lane_title: string;
  post_count: number;
};

type StudentRow = {
  id: string; // internal ew_students.id
  student_id: string; // real student ID
  real_name: string;
  post_count: number;
  word_count: number;
};

type PostRow = {
  id: string;
  student_id: string; // actually ew_students.id
  lane_id: string;
  content: string;
};

function SessionRecordContent() {
  const routeParams = useParams();
  const courseId = routeParams.courseId as string;
  const sessionId = routeParams.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [laneStats, setLaneStats] = useState<LaneStat[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"id" | "posts" | "words">("id");

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      setLoading(true);

      const { data: sessionData } = await supabase
        .from("ew_classes")
        .select("id, activity_title, class_code")
        .eq("id", sessionId)
        .single();

      if (!sessionData) {
        setLoading(false);
        return;
      }

      setSession(sessionData as Session);

      const { data: taskData } = await supabase
        .from("ew_tasks")
        .select("id, task_title")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      setTasks((taskData || []) as Task[]);

      const { data: laneData } = await supabase
        .from("ew_lanes")
        .select("id, lane_key, title")
        .eq("class_id", sessionId)
        .order("sort_order", { ascending: true });

      const lanes = laneData || [];

      const { data: postsData } = await supabase
        .from("ew_posts")
        .select("id, student_id, lane_id, content")
        .eq("class_id", sessionId);

      const posts = (postsData || []) as PostRow[];
      setTotalPosts(posts.length);

      const stats: LaneStat[] = lanes.map((lane) => ({
        lane_key: lane.lane_key,
        lane_title: lane.title,
        post_count: posts.filter((p) => p.lane_id === lane.id).length,
      }));
      setLaneStats(stats);

      const { data: studentsData } = await supabase
        .from("ew_students")
        .select("id, student_id, real_name")
        .eq("class_id", sessionId);

      const students = studentsData || [];

      const rows: StudentRow[] = students.map((s) => {
        const studentPosts = posts.filter((p) => p.student_id === s.id);

        const wordCount = studentPosts.reduce((sum, p) => {
          if (!p.content || !p.content.trim()) return sum;
          return sum + p.content.trim().split(/\s+/).length;
        }, 0);

        return {
          id: s.id,
          student_id: s.student_id,
          real_name: s.real_name,
          post_count: studentPosts.length,
          word_count: wordCount,
        };
      });

      rows.sort((a, b) => {
        if (sortBy === "id") {
          return a.student_id.localeCompare(b.student_id);
        }
        if (sortBy === "posts") {
          return b.post_count - a.post_count;
        }
        return b.word_count - a.word_count;
      });

      setStudentRows(rows);
      setLoading(false);
    };

    load();
  }, [sessionId, sortBy]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading session record...</div>;
  }

  if (!session) {
    return <div className="p-8 text-gray-500">Session not found.</div>;
  }

  const participants = studentRows.filter((r) => r.post_count > 0).length;

  const handleExportCsv = () => {
    const headers = ["Student ID", "Name", "Posts", "Words"];

    const rows = studentRows.map((row) => [
      row.student_id,
      row.real_name,
      String(row.post_count),
      String(row.word_count),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const safeTitle = session.activity_title.replace(/[\\/:*?"<>|]/g, "_");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safeTitle}-session-record.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a
              href={`/teacher/record/${courseId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Course Record
            </a>
            <p className="mt-2 text-sm text-gray-500">Session Record</p>
            <h1 className="mt-1 text-3xl font-bold">{session.activity_title}</h1>
            <p className="text-base text-gray-500">{session.class_code}</p>
          </div>

          <button
            onClick={handleExportCsv}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-green-50 p-6 shadow-sm">
            <p className="text-lg text-green-700">Participants</p>
            <p className="mt-2 text-5xl font-bold text-green-900">{participants}</p>
          </div>
          <div className="rounded-2xl bg-gray-100 p-6 shadow-sm">
            <p className="text-lg text-gray-700">Total Posts</p>
            <p className="mt-2 text-5xl font-bold text-gray-900">{totalPosts}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Posts per Lane</h2>

          <div className="flex flex-wrap gap-4">
            {laneStats.map((stat) => (
              <div
                key={`${stat.lane_key}-${stat.lane_title}`}
                className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-2"
              >
                <span className="text-sm font-medium text-slate-600">
                  {stat.lane_key}
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {stat.post_count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-2xl font-semibold">Tasks</h2>
          </div>
          <table className="w-full text-lg">
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-5">{task.task_title}</td>
                  <td className="px-6 py-5 text-right">
                    <a
                      href={`/teacher/record/${courseId}/${sessionId}/${task.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Students</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "id" | "posts" | "words")
                  }
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="id">Student ID</option>
                  <option value="posts">Posts</option>
                  <option value="words">Word Count</option>
                </select>
              </div>
            </div>
          </div>
          <table className="w-full text-lg">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-6 py-4 font-semibold">Student ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 text-center font-semibold">Posts</th>
                <th className="px-6 py-4 text-center font-semibold">Words</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map((row) => (
                <tr key={row.student_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-5 font-medium">{row.student_id}</td>
                  <td className="px-6 py-5">{row.real_name}</td>
                  <td className="px-6 py-5 text-center text-2xl font-semibold">
                    {row.post_count}
                  </td>
                  <td className="px-6 py-5 text-center text-2xl font-semibold">
                    {row.word_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SessionRecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <SessionRecordContent />
    </Suspense>
  );
}