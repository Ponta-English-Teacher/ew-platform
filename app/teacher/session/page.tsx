"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Course = {
  id: string;
  course_code: string;
  course_title: string;
};

export default function TeacherSessionPage() {
  const router = useRouter();

  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<Course | null>(null);

  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("courseId") || "";
    setCourseId(id);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    const loadCourse = async () => {
      const { data, error } = await supabase
        .from("ew_courses")
        .select("id, course_code, course_title")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setCourse(data as Course);
    };

    loadCourse();
  }, [courseId]);

  const handleCreateSession = async () => {
    if (!courseId) {
      alert("No course selected.");
      return;
    }

    if (!sessionTitle.trim() || !sessionCode.trim()) {
      alert("Please fill in Session Title and Session Code.");
      return;
    }

    setCreating(true);

const { data, error } = await supabase
  .from("ew_classes")
  .insert({
    activity_title: sessionTitle.trim(),
    class_code: sessionCode.trim(),
    join_password: "course-only",
    teacher_id: "eguchi",
    status: "active",
    min_words: 15,
    max_words: 40,
    max_posts_per_lane: 50,
    lane_count: 4,
    language_level: "B1",
    max_total_posts: 80,
    course_id: courseId,
  })
  .select("id")
  .single();

    setCreating(false);

    if (error || !data) {
      console.error(error);
      alert("Could not create session.");
      return;
    }

    alert("Session created successfully.");
    router.push(`/teacher/task?sessionId=${data.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-2xl border bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Session Making</h1>

            <Link
              href="/teacher/course"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </Link>
          </div>

          {!course ? (
            <p className="text-sm text-gray-500">Loading course...</p>
          ) : (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Selected Course</p>
              <p className="mt-1 font-semibold text-gray-900">
                {course.course_title}
              </p>
              <p className="text-sm text-gray-600">{course.course_code}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Session Title</label>
              <input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="1st Session"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Session Code</label>
              <input
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="HS2021001"
              />
            </div>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={creating}
            className="mt-6 w-full rounded bg-black py-2 text-white disabled:bg-gray-400"
          >
            {creating ? "Creating..." : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}