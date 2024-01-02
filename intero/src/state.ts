export const activityStateKey = 'activityState';

export interface AppState {
    [id: string]: Activity;
}

export interface Activity {
    value?: string;
    start?: Date;
    stop?: Date;
    deadline?: Date;
}

export function saveState(key: string, state: AppState) {
    localStorage.setItem(key, JSON.stringify(state));
}

export function loadState(key: string): AppState {
    const str = localStorage.getItem(key);
    function makeFallbackState() {
        return {};
    }
    if (!str) {
        return makeFallbackState();
    }
    try {
        const obj = JSON.parse(str);
        let outputObj: AppState = {};
        for (let [key, value] of Object.entries(obj)) {
            outputObj[key] = parseActivity(value as Activity);
        }

        if (Object.keys(outputObj).length === 0) {
            return makeFallbackState();
        }

        function parseActivity(obj: Activity) {
            return {
                start: obj.start ? new Date(obj.start) : undefined,
                stop: obj.stop ? new Date(obj.stop) : undefined,
                value: obj.value,
                deadline: obj.deadline ? new Date(obj.deadline) : undefined,
            };
        }
        return outputObj;
    } catch (e) {
        return makeFallbackState();
    }
}

export function getActiveActivity(state: AppState): ([string, Activity] | [undefined , undefined ]) {
    const id = Object.keys(state)[Object.keys(state).length - 1];
    const activity = state[id];
    if (activity.stop) {
      return [undefined, undefined];
    }
    return [id, activity];
}