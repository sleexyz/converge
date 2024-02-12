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
    console.log(results);
    const response = await this.examineLocal(results[0]);
    console.log(response);
  
    const endTime = performance.now(); // End timing
    console.log(`Time elapsed: ${endTime - startTime} ms`); // Log time elapsed
    return {
      image: results[0],
      response,
      timeElapsed: endTime - startTime,
    }
  }

  private async screenshot(): Promise<string[]> {
    const results = await invoke<string[]>("screenshot");
    return results;
  }

  private async examine(screenshot: string) {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What am I doing right now?" },
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
    return response.choices[0];
  }

  private async examineLocal(screenshot: string) {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "llava",
        options: {
          temperature: 0,
        },
        system: `You are an AI assistant tasked with helping the user stay focused. You are currently analyzing the user's screen.`,
        prompt: `Is the user currently focused on their work?`,
        stream: false,
        images: [screenshot],
      }),
    });
    return (await response.json()).response;
  }
}

(window as any).watcher = ScreenWatcher.instance;
