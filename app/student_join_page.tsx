"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function StudentJoinPage() {
  const [classCode, setClassCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [officialName, setOfficialName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [joining, setJoining] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const lookupRosterName = async () => {
    setOfficialName("");

    if (!classCode.trim() || !studentId.trim()) {
      return;
    }

    setLookingUp(true);

    const { data: classData, error: classError } = await supabase
      .from("ew_classes")
      .select("id, course_id")
      .eq("class_code", classCode.trim())
      .single();

    if (classError || !classData) {
      setLookingUp(false);
      return;
    }

    if (!classData.course_id) {
      setLookingUp(false);
      setOfficialName("");
      return;
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from("ew_course_roster")
      .select("real_name")
      .eq("course_id", classData.course_id)
      .eq("student_id", studentId.trim())
      .single();

    setLookingUp(false);

    if (rosterError || !rosterData) {
      setOfficialName("");
      return;
    }

    setOfficialName(rosterData.real_name);
  };

  const handleJoin = async () => {
    if (!classCode.trim() || !joinPassword.trim() || !studentId.trim()) {
      alert("Please enter Class Code, Join Password, and Student ID.");
      return;
    }

    setJoining(true);
    setOfficialName("");

    const { data: classData, error: classError } = await supabase
      .from("ew_classes")
      .select("*")
      .eq("class_code", classCode.trim())
      .single();

    if (classError || !classData) {
      console.error(classError);
      alert("Class not found.");
      setJoining(false);
      return;
    }

    if (classData.join_password !== joinPassword.trim()) {
      alert("Incorrect password.");
      setJoining(false);
      return;
    }

    if (!classData.course_id) {
      alert("This session is not connected to a course roster yet.");
      setJoining(false);
      return;
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from("ew_course_roster")
      .select("*")
      .eq("course_id", classData.course_id)
      .eq("student_id", studentId.trim())
      .single();

    if (rosterError || !rosterData) {
      console.error(rosterError);
      alert("Student ID not found in the course roster.");
      setJoining(false);
      return;
    }

    setOfficialName(rosterData.real_name);

    const { data: existingStudent, error: existingError } = await supabase
      .from("ew_students")
      .select("*")
      .eq("class_id", classData.id)
      .eq("student_id", studentId.trim())
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
      window.location.href = `/student/discussion/${classData.id}`;
      return;
    }

    if (existingError && existingError.code !== "PGRST116") {
      console.error(existingError);
      alert("Could not check existing student.");
      setJoining(false);
      return;
    }

    const { data: existingStudents, error: countError } = await supabase
      .from("ew_students")
      .select("id")
      .eq("class_id", classData.id);

    if (countError) {
      console.error(countError);
      alert("Could not count students.");
      setJoining(false);
      return;
    }

    const nextNumber = (existingStudents?.length || 0) + 1;
    const anonymousLabel = `S${String(nextNumber).padStart(2, "0")}`;

    const { data: insertedStudent, error: studentError } = await supabase
      .from("ew_students")
      .insert({
        class_id: classData.id,
        student_id: studentId.trim(),
        real_name: rosterData.real_name,
        anonymous_label: anonymousLabel,
      })
      .select()
      .single();

    if (studentError || !insertedStudent) {
      console.error(studentError);
      alert("Could not join class.");
      setJoining(false);
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
    window.location.href = `/student/discussion/${classData.id}`;
  };

  return (
    <div className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Student Join</h1>

        <p className="mt-2 text-sm text-gray-600">
          Enter your class information to join the discussion.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Class Code
            </label>

            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              placeholder="e.g. EW003"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Join Password
            </label>

            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Enter password"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-gray-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-black hover:bg-gray-100"
              >
                {showPassword ? "Hide" : "See PW"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Student ID
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  setOfficialName("");
                }}
                onBlur={lookupRosterName}
                placeholder="e.g. 2401001"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-gray-500"
              />

              <button
                type="button"
                onClick={lookupRosterName}
                disabled={lookingUp}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-black hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {lookingUp ? "Looking..." : "Find Name"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Official Name
            </label>

            <input
              type="text"
              value={officialName}
              readOnly
              placeholder="Auto-filled from course roster"
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="w-full cursor-pointer rounded-xl bg-black px-4 py-3 text-white transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {joining ? "Joining..." : "Join Discussion"}
          </button>
        </form>
      </div>
    </div>
  );
}