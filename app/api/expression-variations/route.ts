import { NextResponse } from "next/server";

type ExpressionVariations = {
  casual: string;
  slightlyFormal: string;
  academic: string;
  completeParaphrase: string;
};

function extractJsonObject(text: string): string | null {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

function isValidResult(data: unknown): data is ExpressionVariations {
  if (!data || typeof data !== "object") return false;

  const candidate = data as Record<string, unknown>;

  return (
    typeof candidate.casual === "string" &&
    typeof candidate.slightlyFormal === "string" &&
    typeof candidate.academic === "string" &&
    typeof candidate.completeParaphrase === "string"
  );
}

export async function POST(req: Request) {
  try {
    const { sentence, laneTitle, activityTitle } = await req.json();

    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      return NextResponse.json(
        { error: "Sentence is required." },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are an English learning assistant for Japanese university students.

Your job:
- Read the student's sentence.
- Keep the original meaning.
- Use the topic context only to understand what the student means.
- Do NOT add unrelated new ideas.
- Do NOT criticize the student.
- Return four improved versions of the SAME idea.

Return valid JSON only with these exact keys:
{
  "casual": "...",
  "slightlyFormal": "...",
  "academic": "...",
  "completeParaphrase": "..."
}

Rules for each field:
- "casual": natural spoken English, easy to say
- "slightlyFormal": a little more formal, suitable for class discussion
- "academic": more academic and analytical, but still clear
- "completeParaphrase": same meaning with clearly different structure
- Keep each version to 1 sentence if possible
- No bullet points
- No markdown
- No explanation
`.trim();

    const userPrompt = `
Activity title:
${activityTitle || "Not provided"}

Lane title:
${laneTitle || "Not provided"}

Student sentence:
${sentence.trim()}
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);

      return NextResponse.json(
        { error: "Failed to generate expression variations." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 500 }
      );
    }

    const jsonText = extractJsonObject(content);
    if (!jsonText) {
      console.error("Could not extract JSON:", content);
      return NextResponse.json(
        { error: "Could not parse expression variations." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonText);

    if (!isValidResult(parsed)) {
      console.error("Invalid parsed response:", parsed);
      return NextResponse.json(
        { error: "Expression variations response format was invalid." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("expression-variations route error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}