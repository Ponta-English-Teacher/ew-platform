"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type RosterRow = {
  student_id: string;
  real_name: string;
};

export default function TeacherSetupPage() {
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [createdClassId, setCreatedClassId] = useState<string | null>(null);
  const [savingRoster, setSavingRoster] = useState(false);

  const [bulkRosterText, setBulkRosterText] = useState("");

  const [rosterRows, setRosterRows] = useState<RosterRow[]>([
    { student_id: "", real_name: "" },
  ]);

  const handleCreate = async () => {
  if (!className.trim() || !classCode.trim() || !password.trim()) {
    alert("Please fill all fields.");
    return;
  }

  setCreating(true);

  const { data, error } = await supabase
    .from("ew_classes")
    .insert({
      activity_title: className.trim(),
      class_code: classCode.trim(),
      join_password: password.trim(),
      teacher_id: "eguchi",
      status: "active",
      min_words: 15,
      max_words: 40,
      max_posts_per_lane: 20,
      lane_count: 4,
    })
    .select()
    .single();

  if (error || !data) {
    setCreating(false);
    console.error(error);
    alert("Could not create class. Try a new class code.");
    return;
  }

  const laneRows = [
    {
      class_id: data.id,
      lane_key: "A",
      lane_title: "Everyday Life",
      head_post: "What interesting thing happened to you recently?",
      max_posts: 20,
      sort_order: 1,
    },
    {
      class_id: data.id,
      lane_key: "B",
      lane_title: "Hobbies",
      head_post: "What hobby do you enjoy the most?",
      max_posts: 20,
      sort_order: 2,
    },
    {
      class_id: data.id,
      lane_key: "C",
      lane_title: "University Life",
      head_post: "What is something you like or dislike about university life?",
      max_posts: 20,
      sort_order: 3,
    },
    {
      class_id: data.id,
      lane_key: "D",
      lane_title: "Future Plans",
      head_post: "What do you want to do in the future?",
      max_posts: 20,
      sort_order: 4,
    },
  ];

  const { error: laneError } = await supabase.from("ew_lanes").insert(laneRows);

  setCreating(false);

  if (laneError) {
    console.error(laneError);
    alert("Class was created, but lanes could not be created.");
    setCreatedClassId(data.id);
    return;
  }

  setCreatedClassId(data.id);
  alert("Class and lanes created successfully.");
};
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
    if (!createdClassId) {
      alert("Create the class first.");
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
      .from("ew_roster")
      .delete()
      .eq("class_id", createdClassId);

    if (deleteError) {
      console.error(deleteError);
      alert("Could not replace existing roster.");
      setSavingRoster(false);
      return;
    }

    const rowsToInsert = cleanedRows.map((row) => ({
      class_id: createdClassId,
      student_id: row.student_id,
      real_name: row.real_name,
    }));

    const { error: insertError } = await supabase
      .from("ew_roster")
      .insert(rowsToInsert);

    setSavingRoster(false);

    if (insertError) {
      console.error(insertError);
      alert("Could not save roster.");
      return;
    }

    alert("Roster saved successfully.");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl border bg-white p-6 shadow">
          <h1 className="mb-6 text-2xl font-bold">Teacher Setup</h1>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Class Name</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="English Workshop A"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Class Code</label>
              <input
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="EW002"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Join Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                placeholder="pass1234"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-6 w-full rounded bg-black py-2 text-white disabled:bg-gray-400"
          >
            {creating ? "Creating..." : "Create Class"}
          </button>

          {createdClassId && (
            <p className="mt-4 text-sm text-green-700">
              Class created. Class ID: {createdClassId}
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Student Roster</h2>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Paste one student per line.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Accepted format:
            </p>
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

          <div className="mt-6 space-y-3">
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

          <p className="mt-4 text-sm text-gray-500">
            Create the class first, then import or edit the roster, then save it.
          </p>
        </div>
      </div>
    </div>
  );
}