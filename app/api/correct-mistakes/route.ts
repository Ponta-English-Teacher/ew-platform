import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { draft, languageLevel } = await req.json();

    if (!draft) {
      return NextResponse.json({ error: "Missing draft." }, { status: 400 });
    }

    const level = languageLevel || "B1";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a language assistant helping a university student correct grammatical mistakes in a short English discussion post at ${level} level.
Correct any grammar, spelling, or punctuation mistakes in the student's draft.
Keep the original meaning and wording as close as possible. Only fix errors.
Return only the corrected sentence or sentences. No explanation. No extra text.`,
          },
          {
            role: "user",
            content: draft,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI error:", errorData);
      return NextResponse.json({ error: "OpenAI request failed.", detail: errorData }, { status: 500 });
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error.", detail: String(err) }, { status: 500 });
  }
}
