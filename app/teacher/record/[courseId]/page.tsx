"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Course = {
  id: string;
  course_title: string;
  course_code: string;
};

type Session = {
  id: string;
  activity_title: string;
  class_code: string;
};

function CourseRecordContent() {
  const routeParams = useParams();
  const courseId = routeParams.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;

    const load = async () => {
      setLoading(true);

      const { data: courseData } = await supabase
        .from("ew_courses")
        .select("id, course_title, course_code")
        .eq("id", courseId)
        .single();

      if (!courseData) {
        setLoading(false);
        return;
      }

      setCourse(courseData as Course);

      const { data: sessionData } = await supabase
        .from("ew_classes")
        .select("id, activity_title, class_code")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      setSessions((sessionData || []) as Session[]);
      setLoading(false);
    };

    load();
  }, [courseId]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading course record...</div>;
  }

  if (!course) {
    return <div className="p-8 text-gray-500">Course not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm text-gray-500">Course Record</p>
          <h1 className="mt-1 text-2xl font-bold">{course.course_title}</h1>
          <p className="text-sm text-gray-500">{course.course_code}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="font-semibold">Sessions</h2>
          </div>

          {sessions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No sessions found.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3 font-medium">{s.activity_title}</td>
                    <td className="px-5 py-3 text-gray-500">{s.class_code}</td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={`/teacher/record/${courseId}/${s.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseRecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <CourseRecordContent />
    </Suspense>
  );
}