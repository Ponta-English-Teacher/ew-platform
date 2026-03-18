import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text." }, { status: 400 });
    }

    const azureKey = process.env.AZURE_TTS_KEY;
    const azureRegion = process.env.AZURE_TTS_REGION;

    if (!azureKey || !azureRegion) {
      return NextResponse.json(
        { error: "Azure TTS credentials not configured." },
        { status: 500 }
      );
    }

    // Voice selection
    // Female: en-US-JennyNeural (clear, learner-friendly)
    // Male:   en-US-GuyNeural
    const selectedVoice =
      voice === "male" ? "en-US-GuyNeural" : "en-US-JennyNeural";

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${selectedVoice}">
          <prosody rate="0.9">
            ${text}
          </prosody>
        </voice>
      </speak>
    `.trim();

    const ttsUrl = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        "User-Agent": "EWPlatform",
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure TTS error:", errorText);
      return NextResponse.json(
        { error: "Azure TTS request failed.", detail: errorText },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("TTS route error:", err);
    return NextResponse.json(
      { error: "Internal server error.", detail: String(err) },
      { status: 500 }
    );
  }
}