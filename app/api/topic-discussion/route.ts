import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "teacher" | "ai";
  content: string;
};

// How many recent chat turns to include for context.
// Enough to follow the conversation without confusing the model.
const HISTORY_TURNS = 6;

export async function POST(req: NextRequest) {
  try {
    const {
      teacherMessage,
      languageLevel,
      chatMessages,
    }: {
      teacherMessage: string;
      languageLevel: string;
      chatMessages?: ChatMessage[];
    } = await req.json();

    if (!teacherMessage || !languageLevel) {
      return NextResponse.json(
        { error: "Missing teacherMessage or languageLevel." },
        { status: 400 }
      );
    }

    // ── System prompt ──────────────────────────────────────────────────────
    // Design notes:
    // - "Lane generator" framing (not chatbot/partner) prevents question-asking
    // - Prohibitions listed explicitly — the model needs to see "never ask"
    // - Language level guidance avoids over-simplification at higher levels
    // - No revision logic — every response is a fresh full proposal

    const systemPrompt = `You are a lane generator for English classroom discussion activities.
You are not a chatbot. You do not ask questions. You do not explain your output.

The teacher is designing a lane-based discussion task for ${languageLevel} level university students.
Your job is to generate exactly 4 discussion lanes based on the teacher's input.

RULES:
- Always output exactly 4 lanes
- Never ask the teacher a question
- Never add any text outside the required format
- Never add greetings, explanations, or commentary
- If the teacher's input is vague, make a reasonable decision and generate lanes immediately

LANE DESIGN:
- All 4 lanes must share one central topic
- Each lane must explore a different angle of that topic (e.g. personal / social / practical / critical)
- Each lane must be independently answerable — no lane should depend on another lane's answer
- Do not create sequential questions (A → B → C → D is wrong)

LANGUAGE LEVEL (${languageLevel}):
- A1/A2: Short sentences, basic vocabulary, present tense preferred
- B1: Clear natural language, everyday vocabulary, simple structures
- B2: Natural language, moderate complexity, some nuance is fine
- Advanced: Fluent natural language — do NOT oversimplify, it creates ambiguity

OUTPUT FORMAT — output this and nothing else:
Lane A Title: ...
Lane A Prompt: ...

Lane B Title: ...
Lane B Prompt: ...

Lane C Title: ...
Lane C Prompt: ...

Lane D Title: ...
Lane D Prompt: ...`;

    // ── Message history ────────────────────────────────────────────────────
    // Include recent turns so the AI knows what topic has been discussed.
    // Trim to last N turns to avoid context bloat.
    // The current teacher message is added separately as the final user turn.

    const recentHistory = (chatMessages || [])
      .slice(-HISTORY_TURNS)
      .map((msg) => ({
        role: msg.role === "teacher" ? "user" : ("assistant" as const),
        content: msg.content,
      }));

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...recentHistory,
      { role: "user" as const, content: teacherMessage },
    ];

    // ── OpenAI call ────────────────────────────────────────────────────────

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI error:", errorData);
      return NextResponse.json(
        { error: "OpenAI request failed." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiText: string = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ result: aiText });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}