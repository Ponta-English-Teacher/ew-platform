"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Course = {
  id: string;
  course_code: string;
  course_title: string;
  created_at: string;
};

export default function TeacherCoursePage() {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const loadCourses = async () => {
    setLoadingCourses(true);

    const { data, error } = await supabase
      .from("ew_courses")
      .select("id, course_code, course_title, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setCourses((data || []) as Course[]);
    }

    setLoadingCourses(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreate = async () => {
    if (!courseTitle.trim() || !courseCode.trim()) {
      alert("Please fill in Course Name and Course Code.");
      return;
    }

    setCreating(true);

    const { error } = await supabase.from("ew_courses").insert({
      course_title: courseTitle.trim(),
      course_code: courseCode.trim(),
    });

    setCreating(false);

    if (error) {
      console.error(error);
      alert("Could not create course. The course code may already be taken.");
      return;
    }

    alert("Course created successfully.");
    setCourseTitle("");
    setCourseCode("");
    setPassword("");
    await loadCourses();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-2xl border bg-white p-6 shadow">
          <h1 className="mb-6 text-2xl font-bold">Course Making</h1>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Course Name</label>
              <input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="English Workshop 2026"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Course Code</label>
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="EW2026"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="course password"
              type="text"
            />
            <p className="mt-1 text-xs text-gray-400">
              Password is reserved for future use and is not stored yet.
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-6 w-full rounded bg-black py-2 text-white disabled:bg-gray-400"
          >
            {creating ? "Creating..." : "Create Course"}
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Existing Courses</h2>

          {loadingCourses ? (
            <p className="text-sm text-gray-400">Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-gray-400">No courses created yet.</p>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {course.course_title}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {course.course_code} · Created {formatDate(course.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/teacher/session?courseId=${course.id}`}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Sessions
                    </Link>

                   <Link
  href={`/teacher/roster?courseId=${course.id}`}
  className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
>
  Roster
</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}