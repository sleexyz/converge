import { Pipeline, pipeline } from '@xenova/transformers';
import OpenAI from "openai";


export interface TTSModel {
    speak(text: string): Promise<{ 
        source: AudioNode, 
        start: () => void 
    }>;
}

export class TTSSqueak implements TTSModel {
    constructor (readonly audioContext: AudioContext) {
    }
    async speak(_text: string) {
        const audio = new Audio("/assets/shizuku/sounds/tapBody_01.mp3");
        const source = this.audioContext.createMediaElementSource(audio);
        return {source, start: () => audio.play()};
    }
}

export class TTSOpenai implements TTSModel {
    openai = new OpenAI({
        apiKey: "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",
        dangerouslyAllowBrowser: true
    });
    constructor (readonly audioContext: AudioContext) {
    }
    async speak(text: string) {
        const mp3 = await this.openai.audio.speech.create({
            model: "tts-1",
            // model: "tts-1",
            voice: "nova",
            // voice: "shimmer",
            input: text
        });
        const blob = new Blob([await mp3.arrayBuffer()], { type: "audio/mpeg" });
        const audio = new Audio(URL.createObjectURL(blob));
        const source = this.audioContext.createMediaElementSource(audio);
        return {source, start: () => audio.play()};
    }

}

export class TTSLocal implements TTSModel {
    // Lazily initialized.
    synthesizer?: Pipeline;

    constructor(readonly audioContext: AudioContext) {}

    async speak(text: string) {
        if (!this.synthesizer) {
            this.synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', { quantized: false });
        }
        const source = this.audioContext.createBufferSource();
        const result = await this.synthesizer(text, { 
            speaker_embeddings: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin'
        });
        const myArrayBuffer = this.audioContext.createBuffer(1, result.audio.length, result.sampling_rate);
        for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
            const nowBuffering = myArrayBuffer.getChannelData(channel);
            for (let i = 0; i < nowBuffering.length; i++) {
                nowBuffering[i] = result.audio[i];
            }
        }
        source.buffer = myArrayBuffer;
        return {source, start: () => source.start()};
    }
}