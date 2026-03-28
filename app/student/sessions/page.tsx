"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type SessionRow = {
  id: string;
  activity_title: string;
  class_code: string;
  status: string;
  created_at: string;
};

type JoinedCourse = {
  course_id: string;
  course_code: string;
  student_id: string;
  real_name: string;
};

export default function StudentSessionsPage() {
  const [courseId, setCourseId] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enteringSessionId, setEnteringSessionId] = useState<string | null>(null);

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

  const handleEnterSession = async (sessionId: string) => {
    const stored = localStorage.getItem("ew_join_course");

    if (!stored) {
      alert("Course join information not found.");
      return;
    }

    const joinedCourse = JSON.parse(stored) as JoinedCourse;

    setEnteringSessionId(sessionId);

    const { data: existingStudent, error: existingError } = await supabase
      .from("ew_students")
      .select("*")
      .eq("class_id", sessionId)
      .eq("student_id", joinedCourse.student_id)
      .single();

    if (existingStudent) {
      const studentRecord = {
        id: existingStudent.id,
        class_id: existingStudent.class_id,
        student_id: existingStudent.student_id,
        anonymous_label: existingStudent.anonymous_label,
        real_name: existingStudent.real_name,
      };

      localStorage.setItem("ew_student", JSON.stringify(studentRecord));
      window.location.href = `/student/discussion/${sessionId}`;
      return;
    }

    if (existingError && existingError.code !== "PGRST116") {
      console.error(existingError);
      alert("Could not check existing student.");
      setEnteringSessionId(null);
      return;
    }

    const { data: existingStudents, error: countError } = await supabase
      .from("ew_students")
      .select("id")
      .eq("class_id", sessionId);

    if (countError) {
      console.error(countError);
      alert("Could not count students.");
      setEnteringSessionId(null);
      return;
    }

    const nextNumber = (existingStudents?.length || 0) + 1;
    const anonymousLabel = `S${String(nextNumber).padStart(2, "0")}`;

    const { data: insertedStudent, error: insertError } = await supabase
      .from("ew_students")
      .insert({
        class_id: sessionId,
        student_id: joinedCourse.student_id,
        real_name: joinedCourse.real_name,
        anonymous_label: anonymousLabel,
      })
      .select()
      .single();

    if (insertError || !insertedStudent) {
      console.error(insertError);
      alert("Could not enter session.");
      setEnteringSessionId(null);
      return;
    }

    const studentRecord = {
      id: insertedStudent.id,
      class_id: insertedStudent.class_id,
      student_id: insertedStudent.student_id,
      anonymous_label: insertedStudent.anonymous_label,
      real_name: insertedStudent.real_name,
    };

    localStorage.setItem("ew_student", JSON.stringify(studentRecord));
    window.location.href = `/student/discussion/${sessionId}`;
  };

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
              <button
                key={session.id}
                type="button"
                onClick={() => handleEnterSession(session.id)}
                disabled={enteringSessionId === session.id}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left hover:bg-gray-100 disabled:bg-gray-100"
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

                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
                      {session.status || "active"}
                    </div>
                    {enteringSessionId === session.id && (
                      <div className="text-xs text-gray-500">Entering...</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}