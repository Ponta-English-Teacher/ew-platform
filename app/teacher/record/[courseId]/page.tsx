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

type RosterRow = {
  student_id: string;
  real_name: string;
};

type JoinedStudentRow = {
  id: string; // ew_students.id (UUID used by ew_posts.student_id)
  class_id: string;
  student_id: string; // real student ID like 2401001
  real_name?: string;
};

type PostRow = {
  class_id: string;
  student_id: string; // actually ew_students.id
  content: string;
};

type TaskRow = {
  id: string;
  session_id: string;
};

type StudentContributionRow = {
  student_id: string;
  real_name: string;
  sessions_joined: number;
  attendance_rate: number;
  total_posts: number;
  total_words: number;
};

type SessionSummaryRow = {
  id: string;
  activity_title: string;
  class_code: string;
  participants: number;
  attendance_rate: number;
  total_posts: number;
};

function CourseRecordContent() {
  const routeParams = useParams();
  const courseId = routeParams.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const [registeredStudents, setRegisteredStudents] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [numberOfSessions, setNumberOfSessions] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);

  const [studentRows, setStudentRows] = useState<StudentContributionRow[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionSummaryRow[]>([]);
  const [sortBy, setSortBy] = useState<"id" | "posts" | "words">("id");

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

      const { data: rosterData } = await supabase
        .from("ew_course_roster")
        .select("student_id, real_name")
        .eq("course_id", courseId);

      const roster = (rosterData || []) as RosterRow[];
      setRegisteredStudents(roster.length);

      const { data: sessionData } = await supabase
        .from("ew_classes")
        .select("id, activity_title, class_code")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      const sessions = (sessionData || []) as Session[];
      setNumberOfSessions(sessions.length);

      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length === 0) {
        setActiveStudents(0);
        setAttendanceRate(0);
        setTotalTasks(0);
        setTotalPosts(0);
        setStudentRows([]);
        setSessionRows([]);
        setLoading(false);
        return;
      }

      const { data: joinedStudentData } = await supabase
        .from("ew_students")
        .select("id, class_id, student_id, real_name")
        .in("class_id", sessionIds);

      const joinedStudents = (joinedStudentData || []) as JoinedStudentRow[];

      const { data: taskData } = await supabase
        .from("ew_tasks")
        .select("id, session_id")
        .in("session_id", sessionIds);

      const tasks = (taskData || []) as TaskRow[];
      setTotalTasks(tasks.length);

      const { data: postData } = await supabase
        .from("ew_posts")
        .select("class_id, student_id, content")
        .in("class_id", sessionIds);

      const posts = (postData || []) as PostRow[];
      setTotalPosts(posts.length);

      const internalIdToRealStudentId = new Map<string, string>();
      joinedStudents.forEach((row) => {
        internalIdToRealStudentId.set(row.id, row.student_id);
      });

      const activeRealStudentIds = new Set<string>();
      posts.forEach((post) => {
        const realStudentId = internalIdToRealStudentId.get(post.student_id);
        if (realStudentId) activeRealStudentIds.add(realStudentId);
      });
      setActiveStudents(activeRealStudentIds.size);

      const sessionSummaryRows: SessionSummaryRow[] = sessions.map((session) => {
        const joinedInSession = joinedStudents.filter(
          (j) => j.class_id === session.id
        );

        const uniqueParticipants = new Set(
          joinedInSession.map((j) => j.student_id)
        ).size;

        const sessionPosts = posts.filter((p) => p.class_id === session.id);

        const sessionAttendanceRate =
          roster.length > 0
            ? Math.round((uniqueParticipants / roster.length) * 100)
            : 0;

        return {
          id: session.id,
          activity_title: session.activity_title,
          class_code: session.class_code,
          participants: uniqueParticipants,
          attendance_rate: sessionAttendanceRate,
          total_posts: sessionPosts.length,
        };
      });

      setSessionRows(sessionSummaryRows);

      const averageAttendanceRate =
        sessionSummaryRows.length > 0
          ? Math.round(
              sessionSummaryRows.reduce(
                (sum, row) => sum + row.attendance_rate,
                0
              ) / sessionSummaryRows.length
            )
          : 0;

      setAttendanceRate(averageAttendanceRate);

      const contributionRows: StudentContributionRow[] = roster.map((student) => {
        const sessionsJoined = new Set(
          joinedStudents
            .filter((j) => j.student_id === student.student_id)
            .map((j) => j.class_id)
        ).size;

        const studentPosts = posts.filter((post) => {
          const realStudentId = internalIdToRealStudentId.get(post.student_id);
          return realStudentId === student.student_id;
        });

        const totalWords = studentPosts.reduce((sum, post) => {
          if (!post.content || !post.content.trim()) return sum;
          return sum + post.content.trim().split(/\s+/).length;
        }, 0);

        const studentAttendanceRate =
          sessions.length > 0
            ? Math.round((sessionsJoined / sessions.length) * 100)
            : 0;

        return {
          student_id: student.student_id,
          real_name: student.real_name,
          sessions_joined: sessionsJoined,
          attendance_rate: studentAttendanceRate,
          total_posts: studentPosts.length,
          total_words: totalWords,
        };
      });

      contributionRows.sort((a, b) => {
        if (sortBy === "id") {
          return a.student_id.localeCompare(b.student_id);
        }
        if (sortBy === "posts") {
          if (b.total_posts !== a.total_posts) return b.total_posts - a.total_posts;
          return a.student_id.localeCompare(b.student_id);
        }
        if (b.total_words !== a.total_words) return b.total_words - a.total_words;
        return a.student_id.localeCompare(b.student_id);
      });

      setStudentRows(contributionRows);
      setLoading(false);
    };

    load();
  }, [courseId, sortBy]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading course record...</div>;
  }

  if (!course) {
    return <div className="p-8 text-gray-500">Course not found.</div>;
  }

  const handleExportCsv = () => {
    const headers = [
      "Student ID",
      "Name",
      "Sessions Joined",
      "Attendance Rate",
      "Total Posts",
      "Total Words",
    ];

    const rows = studentRows.map((row) => [
      row.student_id,
      row.real_name,
      String(row.sessions_joined),
      `${row.attendance_rate}%`,
      String(row.total_posts),
      String(row.total_words),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const safeTitle = course.course_title.replace(/[\\/:*?"<>|]/g, "_");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safeTitle}-course-record.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base text-gray-500">Course Performance Record</p>
            <h1 className="mt-2 text-4xl font-bold">{course.course_title}</h1>
            <p className="mt-2 text-2xl text-gray-500">{course.course_code}</p>
          </div>

          <button
            onClick={handleExportCsv}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 xl:grid-cols-6">
          <div className="rounded-2xl bg-blue-50 p-6 shadow-sm">
            <p className="text-lg text-blue-700">Registered Students</p>
            <p className="mt-2 text-6xl font-bold text-blue-900">
              {registeredStudents}
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-6 shadow-sm">
            <p className="text-lg text-green-700">Active Students</p>
            <p className="mt-2 text-6xl font-bold text-green-900">
              {activeStudents}
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-6 shadow-sm">
            <p className="text-lg text-purple-700">Attendance</p>
            <p className="mt-2 text-6xl font-bold text-purple-900">
              {attendanceRate}%
            </p>
          </div>

          <div className="rounded-2xl bg-orange-50 p-6 shadow-sm">
            <p className="text-lg text-orange-700">Sessions</p>
            <p className="mt-2 text-6xl font-bold text-orange-900">
              {numberOfSessions}
            </p>
          </div>

          <div className="rounded-2xl bg-pink-50 p-6 shadow-sm">
            <p className="text-lg text-pink-700">Tasks</p>
            <p className="mt-2 text-6xl font-bold text-pink-900">
              {totalTasks}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-100 p-6 shadow-sm">
            <p className="text-lg text-gray-700">Posts</p>
            <p className="mt-2 text-6xl font-bold text-gray-900">
              {totalPosts}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Course Student Contributions</h2>
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
                  <option value="posts">Total Posts</option>
                  <option value="words">Total Words</option>
                </select>
              </div>
            </div>
          </div>

          {studentRows.length === 0 ? (
            <p className="px-6 py-6 text-base text-gray-400">
              No student contribution data yet.
            </p>
          ) : (
            <table className="w-full text-xl">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50 text-left text-base text-slate-600">
                  <th className="px-6 py-4 font-semibold">Student ID</th>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Sessions Joined
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Attendance Rate
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Total Posts
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Total Words
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((row, index) => (
                  <tr
                    key={row.student_id}
                    className={`border-b border-gray-100 last:border-0 ${
                      index === 0 && sortBy !== "id" ? "bg-amber-50" : "bg-white"
                    }`}
                  >
                    <td className="px-6 py-5 font-semibold">{row.student_id}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {index === 0 && sortBy !== "id" && (
                          <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-900">
                            Top
                          </span>
                        )}
                        <span>{row.real_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-2xl">
                      {row.sessions_joined}
                    </td>
                    <td className="px-6 py-5 text-center text-2xl">
                      {row.attendance_rate}%
                    </td>
                    <td className="px-6 py-5 text-center text-3xl font-bold">
                      {row.total_posts}
                    </td>
                    <td className="px-6 py-5 text-center text-3xl font-bold">
                      {row.total_words}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-2xl font-semibold">Sessions</h2>
          </div>

          {sessionRows.length === 0 ? (
            <p className="px-6 py-6 text-base text-gray-400">No sessions found.</p>
          ) : (
            <table className="w-full text-lg">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">Session</th>
                  <th className="px-6 py-4 font-medium">Code</th>
                  <th className="px-6 py-4 text-center font-medium">
                    Participants
                  </th>
                  <th className="px-6 py-4 text-center font-medium">
                    Attendance
                  </th>
                  <th className="px-6 py-4 text-center font-medium">Posts</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-6 py-5 font-medium">
                      {row.activity_title}
                    </td>
                    <td className="px-6 py-5 text-gray-500">{row.class_code}</td>
                    <td className="px-6 py-5 text-center">{row.participants}</td>
                    <td className="px-6 py-5 text-center">
                      {row.attendance_rate}%
                    </td>
                    <td className="px-6 py-5 text-center text-xl font-semibold">
                      {row.total_posts}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <a
                        href={`/teacher/record/${courseId}/${row.id}`}
                        className="font-medium text-blue-600 hover:underline"
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