"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type SessionRow = {
  id: string;
  activity_title: string;
  class_code: string;
  status: string;
  created_at: string;
};

export default function StudentSessionsPage() {
  const [courseId, setCourseId] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("courseId") || "";
    setCourseId(id);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    const loadSessions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ew_classes")
        .select("id, activity_title, class_code, status, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setSessions([]);
        setLoading(false);
        return;
      }

      setSessions((data || []) as SessionRow[]);
      setLoading(false);
    };

    loadSessions();
  }, [courseId]);

  return (
    <div className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Choose Session</h1>

        <p className="mt-2 text-sm text-gray-600">
          Select a session to enter the discussion.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No sessions found.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/student/discussion/${session.id}`}
                className="block rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {session.activity_title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {session.class_code}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
                    {session.status || "active"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
