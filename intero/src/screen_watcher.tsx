import { invoke } from "@tauri-apps/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export class ScreenWatcher {
  static instance = new ScreenWatcher();

  async startFake() {
    const t1 = performance.now(); // Start timing

    const results = await this.screenshot();
    const t2 = performance.now();
    const t3 = performance.now();

    return {
      image: results[0],
      response: "",
      nature: {
        description: "",
        activity: "",
        reason: "",
      },
      screenshotTime: t2 - t1,
      descriptionTime: t3 - t2,
    };
  }

  async start() {
    const t1 = performance.now(); // Start timing

    const results = await this.screenshot();
    const t2 = performance.now();
    const nature = await this.getScreenshotDescriptionOpenAI(results[0]);
    const t3 = performance.now();

    return {
      image: results[0],
      response: nature.description,
      nature,
      screenshotTime: t2 - t1,
      descriptionTime: t3 - t2,
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
    try {
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
      let content = response.choices[0].message.content ?? "null";
      console.log(content);
      if (content.startsWith("```json")) {
        // remove code block
        content = content.slice(7, -3);
      }
      const nature = JSON.parse(content);
      if (nature.activity === undefined) {
        return {
          description: "[unsafe]",
          activity: "distraction",
          reason: "[unsafe]",
        };
      }
      return nature
    } catch (e: any) {
      console.log(e);
      if (e.code === 400) {
        return {
          description: "[unsafe]",
          activity: "distraction",
          reason: "[unsafe]",
        };
      }
      throw e;
    }
  }

  private async getScreenshotDescriptionLocal(screenshot: string): Promise<{
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
        system:
          "You are an AI assistant tasked with analyzing the user's screen. You must respond in valid JSON. Use the following typescript type: { description: string; activity: string; reason: string; }",
        prompt: `Describe the nature of the activity in the screen with one of the following categories:
- "work" - includes work-related activities such as coding, writing, etc.
- "distraction" - includes social media, news, etc.
- "unknown" - if you are unsure. includes switching windows, etc.
`,
        format: "json",
        stream: false,
        images: [screenshot],
      }),
    });
    const responseJson = await response.json();
    console.log(responseJson);
    return JSON.parse(responseJson.response);
  }
}

(window as any).watcher = ScreenWatcher.instance;
