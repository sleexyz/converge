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
    const nature = await this.getScreenshotDescriptionLocal2(results[0]);
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

  private async getScreenshotDescriptionOpenAI(screenshot: string) {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant tasked with analyzing the user's screen.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Give concise description of the screenshot. Be concise.`,
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
    return response.choices[0].message.content;
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
        prompt: `Give concise description of the activity in the screenshot. Be concise.`,
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
- work 
- distraction
- unknown
Give a reason for your response. Be concise.
Respond in JSON.
Example: {
  "description": "The user is browsing articles",
  "activity": "distraction",
  "reason": "Browsing articles is not related to the user's work."
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
