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
  student_id: string;
  real_name: string;
  anonymous_label: string;
  post_count: number;
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
        .select("id, lane_key, lane_title, sort_order")
        .eq("class_id", sessionId)
        .order("sort_order", { ascending: true });

      const lanes = laneData || [];

      const { data: postsData } = await supabase
        .from("ew_posts")
        .select("id, student_id, lane_id")
        .eq("class_id", sessionId);

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

      const rows: StudentRow[] = students.map((s) => ({
        student_id: s.student_id,
        real_name: s.real_name,
        anonymous_label: s.anonymous_label,
        post_count: posts.filter((p) => p.student_id === s.student_id).length,
      }));

      rows.sort((a, b) => a.anonymous_label.localeCompare(b.anonymous_label));
      setStudentRows(rows);

      setLoading(false);
    };

    load();
  }, [sessionId]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading session record...</div>;
  }

  if (!session) {
    return <div className="p-8 text-gray-500">Session not found.</div>;
  }

  const participants = studentRows.filter((r) => r.post_count > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <a
            href={`/teacher/record/${courseId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Course Record
          </a>
          <p className="mt-2 text-sm text-gray-500">Session Record</p>
          <h1 className="mt-1 text-2xl font-bold">{session.activity_title}</h1>
          <p className="text-sm text-gray-500">{session.class_code}</p>
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
            <h2 className="font-semibold">Tasks</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3">{task.task_title}</td>
                  <td className="px-5 py-3 text-right">
                    <a
                      href={`/teacher/record/${courseId}/${sessionId}/${task.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View →
                    </a>
                  </td>
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