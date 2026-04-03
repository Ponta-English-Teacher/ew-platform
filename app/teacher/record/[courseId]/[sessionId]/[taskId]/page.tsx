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
  lane_title: string;
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
  anonymous_label: string;
  post_count: number;
  lanes_used: string[];
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
        .select("id, lane_key, lane_title, sort_order")
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
        .select("student_id, lane_id")
        .eq("class_id", sessionId)
        .in("lane_id", laneIds);

      const posts = postsData || [];
      setTotalPosts(posts.length);

      const stats: LaneStat[] = lanes.map((lane) => ({
        lane_key: lane.lane_key,
        lane_title: lane.lane_title,
        post_count: posts.filter((p) => p.lane_id === lane.id).length,
      }));
      setLaneStats(stats);

      const { data: studentsData } = await supabase
        .from("ew_students")
        .select("student_id, real_name, anonymous_label")
        .eq("class_id", sessionId);

      const students = studentsData || [];

      const laneKeyMap: Record<string, string> = {};
      lanes.forEach((l) => {
        laneKeyMap[l.id] = l.lane_key;
      });

      const rows: StudentRow[] = students.map((s) => {
        const studentPosts = posts.filter((p) => p.student_id === s.student_id);

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
          anonymous_label: s.anonymous_label,
          post_count: studentPosts.length,
          lanes_used: lanesUsed,
        };
      });

      rows.sort((a, b) => a.anonymous_label.localeCompare(b.anonymous_label));
      setStudentRows(rows);

      setLoading(false);
    };

    load();
  }, [taskId, sessionId]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading task record...</div>;
  }

  if (!task) {
    return <div className="p-8 text-gray-500">Task not found.</div>;
  }

  const participants = studentRows.filter((r) => r.post_count > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <a
            href={`/teacher/record/${courseId}/${sessionId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Session Record
          </a>
          <p className="mt-2 text-sm text-gray-500">Task Record</p>
          <h1 className="mt-1 text-2xl font-bold">{task.task_title}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Participants</p>
            <p className="mt-1 text-2xl font-bold">{participants}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Total posts</p>
            <p className="mt-1 text-2xl font-bold">{totalPosts}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="font-semibold">Posts per lane</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {laneStats.map((stat) => (
                <tr key={stat.lane_key} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3 font-medium">Lane {stat.lane_key}</td>
                  <td className="px-5 py-3">{stat.lane_title}</td>
                  <td className="px-5 py-3 text-center">{stat.post_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="font-semibold">Students</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {studentRows.map((row) => (
                <tr key={row.student_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3 font-medium">{row.anonymous_label}</td>
                  <td className="px-5 py-3">{row.real_name}</td>
                  <td className="px-5 py-3 text-center">{row.post_count}</td>
                  <td className="px-5 py-3 text-center">
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