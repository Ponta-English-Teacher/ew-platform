"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Task = {
  id: string;
  task_title: string;
};

type Lane = {
  id: string;
  lane_key: string;
  title: string;
  sort_order: number;
};

type LaneStat = {
  lane_key: string;
  lane_title: string;
  post_count: number;
};

type StudentRow = {
  student_id: string;
  real_name: string;
  post_count: number;
  word_count: number;
  lanes_used: string[];
};

type JoinedStudentRow = {
  id: string; // internal UUID used by ew_posts.student_id
  student_id: string; // real student ID like 2401001
  real_name: string;
};

type PostRow = {
  student_id: string; // actually ew_students.id
  lane_id: string;
  content: string;
};

function TaskRecordContent() {
  const routeParams = useParams();
  const courseId = routeParams.courseId as string;
  const sessionId = routeParams.sessionId as string;
  const taskId = routeParams.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [laneStats, setLaneStats] = useState<LaneStat[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"id" | "posts" | "words">("id");

  useEffect(() => {
    if (!taskId || !sessionId) return;

    const load = async () => {
      setLoading(true);

      const { data: taskData } = await supabase
        .from("ew_tasks")
        .select("id, task_title")
        .eq("id", taskId)
        .single();

      if (!taskData) {
        setLoading(false);
        return;
      }

      setTask(taskData as Task);

      const { data: laneData } = await supabase
        .from("ew_lanes")
        .select("id, lane_key, title, sort_order")
        .eq("task_id", taskId)
        .eq("class_id", sessionId)
        .order("sort_order", { ascending: true });

      const lanes = (laneData || []) as Lane[];
      const laneIds = lanes.map((l) => l.id);

      if (laneIds.length === 0) {
        setLaneStats([]);
        setTotalPosts(0);
        setStudentRows([]);
        setLoading(false);
        return;
      }

      const { data: postsData } = await supabase
        .from("ew_posts")
        .select("student_id, lane_id, content")
        .eq("class_id", sessionId)
        .in("lane_id", laneIds);

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

      const students = (studentsData || []) as JoinedStudentRow[];

      const internalIdToRealStudentId = new Map<string, string>();
      students.forEach((s) => {
        internalIdToRealStudentId.set(s.id, s.student_id);
      });

      const laneKeyMap: Record<string, string> = {};
      lanes.forEach((l) => {
        laneKeyMap[l.id] = l.lane_key;
      });

      const rows: StudentRow[] = students.map((s) => {
        const studentPosts = posts.filter((p) => {
          const realStudentId = internalIdToRealStudentId.get(p.student_id);
          return realStudentId === s.student_id;
        });

        const wordCount = studentPosts.reduce((sum, p) => {
          if (!p.content || !p.content.trim()) return sum;
          return sum + p.content.trim().split(/\s+/).length;
        }, 0);

        const lanesUsed = [
          ...new Set(
            studentPosts
              .map((p) => laneKeyMap[p.lane_id])
              .filter((v): v is string => !!v)
          ),
        ].sort((a, b) => a.localeCompare(b));

        return {
          student_id: s.student_id,
          real_name: s.real_name,
          post_count: studentPosts.length,
          word_count: wordCount,
          lanes_used: lanesUsed,
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
  }, [taskId, sessionId, sortBy]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading task record...</div>;
  }

  if (!task) {
    return <div className="p-8 text-gray-500">Task not found.</div>;
  }

  const participants = studentRows.filter((r) => r.post_count > 0).length;
    const handleExportCsv = () => {
    const headers = ["Student ID", "Name", "Posts", "Words", "Lanes Used"];

    const rows = studentRows.map((row) => [
      row.student_id,
      row.real_name,
      String(row.post_count),
      String(row.word_count),
      row.lanes_used.join(" "),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${task.task_title}-task-record.csv`);
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
              href={`/teacher/record/${courseId}/${sessionId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Session Record
            </a>
            <p className="mt-2 text-sm text-gray-500">Task Record</p>
            <h1 className="mt-1 text-3xl font-bold">{task.task_title}</h1>
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

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-2xl font-semibold">Posts per Lane</h2>
          </div>
          <table className="w-full text-lg">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-6 py-4 font-semibold">Lane</th>
                <th className="px-6 py-4 font-semibold">Topic</th>
                <th className="px-6 py-4 text-center font-semibold">Posts</th>
              </tr>
            </thead>
            <tbody>
              {laneStats.map((stat) => (
                <tr
                  key={`${stat.lane_key}-${stat.lane_title}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-6 py-5 font-medium">Lane {stat.lane_key}</td>
                  <td className="px-6 py-5">{stat.lane_title}</td>
                  <td className="px-6 py-5 text-center text-2xl font-semibold">
                    {stat.post_count}
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
                <th className="px-6 py-4 text-center font-semibold">Lanes Used</th>
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
                  <td className="px-6 py-5 text-center">
                    {row.lanes_used.length > 0 ? row.lanes_used.join(" ") : "—"}
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

export default function TaskRecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <TaskRecordContent />
    </Suspense>
  );
}