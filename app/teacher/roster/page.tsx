"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Course = {
  id: string;
  course_code: string;
  course_title: string;
};

type RosterRow = {
  student_id: string;
  real_name: string;
};

export default function TeacherRosterPage() {
  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<Course | null>(null);

  const [bulkRosterText, setBulkRosterText] = useState("");
  const [rosterRows, setRosterRows] = useState<RosterRow[]>([
    { student_id: "", real_name: "" },
  ]);

  const [loadingCourse, setLoadingCourse] = useState(true);
  const [savingRoster, setSavingRoster] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("courseId") || "";
    setCourseId(id);
  }, []);

  useEffect(() => {
    if (!courseId) {
      setLoadingCourse(false);
      return;
    }

    const loadCourseAndRoster = async () => {
      setLoadingCourse(true);

      const { data: courseData, error: courseError } = await supabase
        .from("ew_courses")
        .select("id, course_code, course_title")
        .eq("id", courseId)
        .single();

      if (courseError) {
        console.error(courseError);
        setLoadingCourse(false);
        return;
      }

      setCourse(courseData as Course);

      const { data: rosterData, error: rosterError } = await supabase
        .from("ew_course_roster")
        .select("student_id, real_name")
        .eq("course_id", courseId)
        .order("student_id", { ascending: true });

      if (rosterError) {
        console.error(rosterError);
      } else if (rosterData && rosterData.length > 0) {
        setRosterRows(rosterData as RosterRow[]);
      }

      setLoadingCourse(false);
    };

    loadCourseAndRoster();
  }, [courseId]);

  const handleRosterChange = (
    index: number,
    field: keyof RosterRow,
    value: string
  ) => {
    const updated = [...rosterRows];
    updated[index][field] = value;
    setRosterRows(updated);
  };

  const handleAddRow = () => {
    setRosterRows([...rosterRows, { student_id: "", real_name: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = rosterRows.filter((_, i) => i !== index);
    setRosterRows(updated.length > 0 ? updated : [{ student_id: "", real_name: "" }]);
  };

  const handleImportRoster = () => {
    const lines = bulkRosterText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      alert("Please paste roster text first.");
      return;
    }

    const parsedRows: RosterRow[] = [];

    for (const line of lines) {
      let student_id = "";
      let real_name = "";

      if (line.includes("\t")) {
        const parts = line
          .split("\t")
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

        if (parts.length >= 2) {
          student_id = parts[0];
          real_name = parts.slice(1).join(" ");
        }
      } else if (line.includes(",")) {
        const parts = line.split(",").map((part) => part.trim());

        if (parts.length >= 2) {
          student_id = parts[0];
          real_name = parts.slice(1).join(", ");
        }
      } else {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (match) {
          student_id = match[1].trim();
          real_name = match[2].trim();
        }
      }

      if (student_id && real_name) {
        parsedRows.push({ student_id, real_name });
      }
    }

    if (parsedRows.length === 0) {
      alert("Could not parse roster. Use one student per line: Student ID, Real Name");
      return;
    }

    setRosterRows(parsedRows);
    alert(`Imported ${parsedRows.length} students.`);
  };

  const handleSaveRoster = async () => {
    if (!courseId) {
      alert("No course selected.");
      return;
    }

    const cleanedRows = rosterRows
      .map((row) => ({
        student_id: row.student_id.trim(),
        real_name: row.real_name.trim(),
      }))
      .filter((row) => row.student_id && row.real_name);

    if (cleanedRows.length === 0) {
      alert("Please enter at least one student.");
      return;
    }

    setSavingRoster(true);

    const { error: deleteError } = await supabase
      .from("ew_course_roster")
      .delete()
      .eq("course_id", courseId);

    if (deleteError) {
      console.error(deleteError);
      alert("Could not replace existing course roster.");
      setSavingRoster(false);
      return;
    }

    const rowsToInsert = cleanedRows.map((row) => ({
      course_id: courseId,
      student_id: row.student_id,
      real_name: row.real_name,
    }));

    const { error: insertError } = await supabase
      .from("ew_course_roster")
      .insert(rowsToInsert);

    setSavingRoster(false);

    if (insertError) {
      console.error(insertError);
      alert("Could not save roster.");
      return;
    }

    alert("Course roster saved successfully.");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl border bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Roster Management</h1>

            <Link
              href="/teacher/course"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </Link>
          </div>

          {loadingCourse ? (
            <p className="text-sm text-gray-500">Loading course...</p>
          ) : !course ? (
            <p className="text-sm text-red-600">Course not found.</p>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Course</p>
              <p className="mt-1 font-semibold text-gray-900">
                {course.course_title}
              </p>
              <p className="text-sm text-gray-600">{course.course_code}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Import Roster</h2>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Paste one student per line.
            </p>
            <p className="mt-2 text-sm text-gray-600">Accepted format:</p>

            <div className="mt-2 rounded-lg bg-white p-3 text-sm text-gray-700">
              <div>2401001, ABE ASUMI</div>
              <div>2401009, BASAKI HONOKA</div>
              <div>2301013, FUJIYA MUSASHI</div>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Tab-separated lines also work.
            </p>

            <textarea
              value={bulkRosterText}
              onChange={(e) => setBulkRosterText(e.target.value)}
              rows={8}
              className="mt-4 w-full rounded border p-3"
              placeholder={`2401001, ABE ASUMI\n2401009, BASAKI HONOKA\n2301013, FUJIYA MUSASHI`}
            />

            <button
              type="button"
              onClick={handleImportRoster}
              className="mt-3 rounded border px-4 py-2 hover:bg-white"
            >
              Import Roster
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Edit Roster</h2>

          <div className="space-y-3">
            {rosterRows.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 md:grid-cols-[180px_1fr_100px]"
              >
                <input
                  value={row.student_id}
                  onChange={(e) =>
                    handleRosterChange(index, "student_id", e.target.value)
                  }
                  className="rounded border p-2"
                  placeholder="2401001"
                />

                <input
                  value={row.real_name}
                  onChange={(e) =>
                    handleRosterChange(index, "real_name", e.target.value)
                  }
                  className="rounded border p-2"
                  placeholder="ABE ASUMI"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveRow(index)}
                  className="rounded border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="rounded border px-4 py-2 hover:bg-gray-50"
            >
              + Add Row
            </button>

            <button
              type="button"
              onClick={handleSaveRoster}
              disabled={savingRoster}
              className="rounded bg-black px-4 py-2 text-white disabled:bg-gray-400"
            >
              {savingRoster ? "Saving..." : "Save Roster"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}