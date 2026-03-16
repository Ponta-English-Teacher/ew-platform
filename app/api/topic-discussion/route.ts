import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { teacherMessage, languageLevel } = await req.json();

    if (!teacherMessage || !languageLevel) {
      return NextResponse.json(
        { error: "Missing teacherMessage or languageLevel." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a discussion design assistant for university English teachers.
The teacher is designing a lane-based classroom discussion activity.
The students' English level is ${languageLevel}.

Your job is to suggest exactly 4 lane titles and 4 lane prompts based on the teacher's ideas.
Each prompt should be a single discussion question appropriate for ${languageLevel} level university students.
Keep titles short (2-4 words). Keep prompts clear and natural.

You must always respond in exactly this format and nothing else:
Lane A Title: ...
Lane A Prompt: ...
Lane B Title: ...
Lane B Prompt: ...
Lane C Title: ...
Lane C Prompt: ...
Lane D Title: ...
Lane D Prompt: ...

Do not include any extra text, explanation, or formatting outside of this structure.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: teacherMessage },
        ],
        temperature: 0.7,
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
    const aiText = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ result: aiText });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}