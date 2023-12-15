import * as PIXI from 'pixi.js';
import { Stage } from '@pixi/react';
import { Cubism4InternalModel, Live2DModel, clamp } from 'pixi-live2d-display';
import { useRef, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { CRTFilter } from '@pixi/filter-crt';



(window as any).PIXI = PIXI;

interface MouseMoved {
    x: number;
    y: number;
    window_x: number;
    window_y: number;
    window_width: number;
    window_height: number;
}

export function XEyes() {
    const modelRef = useRef<Live2DModel | null>(null);

    const [inWindow, setInWindow] = useState(false);

    useEffect(() => {
        const unlistenPromise = listen('mouse-moved', (event) => {
            const mouseMoved = event.payload as MouseMoved;
            const x = mouseMoved.x - mouseMoved.window_x;
            const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
            if (modelRef.current) {
                let model = modelRef.current;
                model.focus(x, y);
            }

            const cursorInWindow = x >= 0 && x <= mouseMoved.window_width && y >= 0 && y <= mouseMoved.window_height;
            if (cursorInWindow) {
                setInWindow(true);
            } else {
                setInWindow(false);
            }
        });
        return () => {
            unlistenPromise.then((unlisten) => {
                unlisten();
            });
        };
    }, []);

    useEffect(() => {
        // let utterance = new SpeechSynthesisUtterance("Hello world!");
        // speechSynthesis.speak(utterance);
        return () => {
            window.location.reload();
        };
    }, []);


    const onMount = async (app: PIXI.Application) => {
        const audioContext = new AudioContext();
        const audio = new Audio("/assets/shizuku/sounds/tapBody_01.mp3");
        // const audio = new Audio("/assets/sample-4.mp3");
        AudioManager.play(audio);


        // let config = { url: "/assets/girl/model21.json", scale: 1, x: 0  };
        // let config = { url: "/assets/Pichu/Pichu.model3.json", scale: 0.38, x:20 };
        // let config = { url: "/assets/shizuku/shizuku.model.json", scale: 0.5, x:100, y:-50 };

        // // Lip-syncable:
        let config = { url: "/assets/mao/mao_pro.model3.json", scale: 0.15, x: -50 };
        // let config = { url: "/assets/haru/haru_greeter_t05.model3.json", scale: 0.4, x: 0 };

        const model = await Live2DModel.from(config.url);


        if (!model) {
            throw new Error("Failed to load model");
        }

        app.stage.addChild(model);
        model.scale.set(config.scale);
        model.x = config.x || 0;
        model.y = config.y || 0;
        modelRef.current = model;
        const internalModel = (model.internalModel as Cubism4InternalModel);
        if (internalModel.lipSync) {

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0.85;

            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            source.connect(audioContext.destination);

            let pcmData = new Float32Array(analyser.fftSize);

            // Function to get the volume from the analyser
            const getVolume = () => {
                let sumSquares = 0.0;
                analyser.getFloatTimeDomainData(pcmData);

                for (const amplitude of pcmData) { sumSquares += amplitude * amplitude; }
                return parseFloat(Math.sqrt((sumSquares / pcmData.length) * 20).toFixed(1));
            };

            const lipSyncParameters = internalModel.settings.getLipSyncParameters() || [];

            // Function to update the lip-sync parameters
            const updateLipSyncValue = (input: number) => {
                let value = input;
                let min_ = 0;
                let max_ = 1;
                let weight = 1.2;
                if (value > 0) {
                    min_ = 0.4;
                }
                value = clamp(value * weight, min_, max_);

                for (let i = 0; i < lipSyncParameters.length; i++) {
                    let parameter = lipSyncParameters[i];
                    internalModel.coreModel.addParameterValueById(parameter, value, 0.8);
                }
            };
            (window as any).updateLipSyncValue = updateLipSyncValue;

            // swizzle updateFocus
            let oldUpdateFocus = internalModel.updateFocus;
            internalModel.updateFocus = () => {
                updateLipSyncValue(getVolume());
                oldUpdateFocus.call(internalModel);
            }
            // updateLipSyncValue.current = updateLipSyncValueFn;


            console.log("Lip-sync enabled");
        }
    };


    let classes = "transition-opacity duration-1000";
    if (inWindow) {
        classes += " opacity-10";
    } else {
        classes += " opacity-100";
    }

    return (
        <Stage
            className={classes}
            options={{ resizeTo: window, backgroundAlpha: 0 }}
            onMount={onMount}
        >
        </Stage>
    );
}

class AudioManager {
    /**
     * Plays the sound.
     * @param audio - An audio element.
     * @return Promise that resolves when the audio is ready to play, rejects when error occurs.
     */
    static play(audio: HTMLAudioElement): Promise<void> {
        return new Promise((resolve, reject) => {
            // see https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
            audio.play()?.catch((e) => {
                audio.dispatchEvent(new ErrorEvent("error", { error: e }));
                reject(e);
            });

            if (audio.readyState === audio.HAVE_ENOUGH_DATA) {
                resolve();
            } else {
                audio.addEventListener("canplaythrough", resolve as () => void);
            }
        });
    }

}