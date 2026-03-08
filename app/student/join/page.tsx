"use client";

import { useState } from "react";

export default function StudentJoinPage() {
  const [classCode, setClassCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [realName, setRealName] = useState("");

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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Join Password
            </label>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-black px-4 py-3 text-white transition hover:bg-gray-800"
          >
            Join Discussion
          </button>
        </form>
      </div>
    </div>
  );
}