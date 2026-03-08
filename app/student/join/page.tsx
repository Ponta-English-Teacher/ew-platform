"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function StudentJoinPage() {
  const [classCode, setClassCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [realName, setRealName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleJoin = async () => {
    const { data: classData, error: classError } = await supabase
      .from("ew_classes")
      .select("*")
      .eq("class_code", classCode)
      .single();

    if (classError || !classData) {
      alert("Class not found");
      console.error(classError);
      return;
    }

    if (classData.join_password !== joinPassword) {
      alert("Incorrect password");
      return;
    }

    const { data: existingStudents, error: countError } = await supabase
      .from("ew_students")
      .select("id")
      .eq("class_id", classData.id);

    if (countError) {
      alert("Could not count students");
      console.error(countError);
      return;
    }

    const nextNumber = (existingStudents?.length || 0) + 1;
    const anonymousLabel = `S${String(nextNumber).padStart(2, "0")}`;

    const { error: studentError } = await supabase
      .from("ew_students")
      .insert({
        class_id: classData.id,
        student_id: studentId,
        real_name: realName,
        anonymous_label: anonymousLabel,
      });

    if (studentError) {
      alert("Could not join class");
      console.error(studentError);
      return;
    }

    alert(`Joined successfully as ${anonymousLabel}!`);
  };

  return (
    <div className="min-h-screen bg-white px-6 py-10">
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
              placeholder="e.g. EW001"
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

            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. S2025001"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Real Name
            </label>

            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="Enter your real name"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-gray-500"
            />
          </div>

          <button
            type="button"
            onClick={handleJoin}
            className="w-full rounded-xl bg-black px-4 py-3 text-white cursor-pointer transition hover:bg-gray-800 active:scale-95"
          >
            Join Discussion
          </button>
        </form>
      </div>
    </div>
  );
}