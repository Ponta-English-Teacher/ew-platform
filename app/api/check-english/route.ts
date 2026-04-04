import { NextResponse } from "next/server";

type LaneConfig = {
  title: string;
  prompt: string;
};

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match?.[1]) {
    return JSON.parse(match[1]);
  }

  throw new Error("Model did not return valid JSON.");
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const taskTitle = String(body.taskTitle ?? "").trim();
    const lanes = Array.isArray(body.lanes) ? (body.lanes as LaneConfig[]) : [];

    if (!taskTitle) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    if (lanes.length !== 4) {
      return NextResponse.json(
        { error: "Exactly 4 lanes are required." },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert English teacher.

Correct the English in the task title and all lane titles/prompts.
Keep the meaning the same.
Improve grammar, naturalness, clarity, and teacher-facing wording.
Do not add explanation.
Return ONLY valid JSON.

Required JSON format:
{
  "taskTitle": "corrected task title",
  "lanes": [
    { "title": "lane A corrected title", "prompt": "lane A corrected prompt" },
    { "title": "lane B corrected title", "prompt": "lane B corrected prompt" },
    { "title": "lane C corrected title", "prompt": "lane C corrected prompt" },
    { "title": "lane D corrected title", "prompt": "lane D corrected prompt" }
  ]
}

Input:
${JSON.stringify({ taskTitle, lanes }, null, 2)}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a careful English correction assistant. Return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI request failed." },
        { status: 500 }
      );
    }

    const text = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);

    if (
      typeof parsed.taskTitle !== "string" ||
      !Array.isArray(parsed.lanes) ||
      parsed.lanes.length !== 4
    ) {
      return NextResponse.json(
        { error: "Model returned unexpected JSON structure." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskTitle: parsed.taskTitle,
      lanes: parsed.lanes.map((lane: any) => ({
        title: String(lane?.title ?? ""),
        prompt: String(lane?.prompt ?? ""),
      })),
    });
  } catch (error) {
    console.error("check-english route error:", error);
    return NextResponse.json(
      { error: "Failed to check English." },
      { status: 500 }
    );
  }
}
