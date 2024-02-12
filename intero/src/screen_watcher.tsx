import { invoke } from "@tauri-apps/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export class ScreenWatcher {
  static instance = new ScreenWatcher();

  async start() {
    const startTime = performance.now(); // Start timing

    const results = await this.screenshot();
    const nature = await this.getScreenshotDescriptionOpenAI(results[0]);
    // const nature = await this.determineNature(response);
    const endTime = performance.now(); // End timing
    // console.log(`Time elapsed: ${endTime - startTime} ms`); // Log time elapsed

    return {
      image: results[0],
      response: nature.description,
      nature,
      timeElapsed: endTime - startTime,
    };
  }

  private async screenshot(): Promise<string[]> {
    const results = await invoke<string[]>("screenshot");
    return results;
  }

  private async getScreenshotDescriptionOpenAI(screenshot: string): Promise<{
    description: string;
    activity: string;
    reason: string;
  }> {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      // NOTE: gpt4-vision-preview does not support json_object response format yet.
      // response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant tasked with analyzing the user's screen. You must respond in valid JSON. Use the following typescript type: { description: string; activity: string; reason: string; }. Do not use a markdown code block.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Describe the nature of the activity in the screen with one of the following categories:
- "work" - includes work-related activities such as coding, writing, etc.
- "distraction" - includes social media, news, etc.
- "unknown" - if you are unsure. includes switching windows, etc.
`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${screenshot}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });
    return JSON.parse(response.choices[0].message.content ?? "null");
  }

  private async getScreenshotDescriptionLocal(screenshot: string) {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "llava",
        options: {
          temperature: 0,
          // max_tokens: 1000,
        },
        system: `You are an AI assistant tasked with analyzing the user's screen.`,
        prompt: `Describe the nature of the activity in the screen with one of the following categories:
- "work" - includes work-related activities such as coding, writing, etc.
- "distraction" - includes social media, news, etc.
- "unknown" - if you are unsure. includes switching windows, etc.

Give a reason for your response. Be concise.
Respond in JSON.
Use the following typescript type: 
{
  description: string;
  activity: string;
  reason: string;
}`,
        stream: false,
        images: [screenshot],
      }),
    });
    const responseJson = await response.json();
    console.log(responseJson);
    return responseJson.response;
  }

  private async getScreenshotDescriptionLocal2(screenshot: string): Promise<{
    description: string;
    activity: string;
    reason: string;
  }> {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "llava",
        options: {
          temperature: 0,
          // max_tokens: 1000,
        },
        system: `You are an AI assistant tasked with analyzing the user's screen.`,
        prompt: `Describe the nature of the activity in the screen with one of the following categories:
- "work" - includes work-related activities such as coding, writing, etc.
- "distraction" - includes social media, news, etc.
- "unknown" - if you are unsure. includes switching windows, etc.

Give a reason for your response. Be concise.
Respond in JSON.
Use the following typescript type: 
{
  description: string;
  activity: string;
  reason: string;
}`,
        format: "json",
        stream: false,
        images: [screenshot],
      }),
    });
    const responseJson = await response.json();
    console.log(responseJson);
    return JSON.parse(responseJson.response);
  }

  private async determineNature(description: string): Promise<{
    activity: string;
    reason: string;
  }> {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "phi",
        options: {
          temperature: 0,
        },
        system: `You are an AI assistant tasked with keeping a user focused on their work.`,
        prompt: `Here is a description of a user's screen:
${description}.
Describe the nature of the activity in the screen.  Respond with one of the following:
- work 
- distraction
- unknown
Give a reason for your response. Be concise.
Respond in JSON.
Example: {
  "activity": "distraction",
  "reason": "The user is browsing articles."
}
`,
        format: "json",
        stream: false,
      }),
    });
    const responseJson = await response.json();
    console.log(responseJson);
    return JSON.parse(responseJson.response);
  }
}

(window as any).watcher = ScreenWatcher.instance;
