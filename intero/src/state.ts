import * as React from "react";

export function useRefState<T>(initialValue: () => T) {
  const [state, setState] = React.useState(initialValue());
  const ref = React.useRef(state);
  ref.current = state;
  return [state, setState, ref] as const;
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  // run migrations here
  normalizeState: (value: T) => T = (value) => value
): [T, React.Dispatch<React.SetStateAction<T>>, React.MutableRefObject<T>] {
  const [state, setState, ref] = useRefState<T>(() => {
    const value = localStorage.getItem(key);
    if (value) {
      return normalizeState(parseJSON(value));
    }
    return defaultValue;
  });

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) {
        return;
      }
      const value = e.newValue;
      if (value) {
        setState(normalizeState(parseJSON(value)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState, ref];
}

function parseJSON<T>(json: string): T {
  try {
    return JSON.parse(json, (key, value) => {
      if (key === "createdAt") {
        return new Date(value);
      }
      return value;
    });
  } catch (e) {
    throw new Error(`Could not parse JSON: ${e}`);
  }
}


export function useMakeStateAsync<T>([state, _setState]: [T, React.Dispatch<React.SetStateAction<T>>]) {
  const resolveQueueRef = React.useRef<(() => void)[]>([]);
  function pushQueue(resolve: () => void) {
    resolveQueueRef.current.push(resolve);
  }
  function resetQueue() {
    resolveQueueRef.current = [];
  }
  function consumeQueue() {
    const queue = resolveQueueRef.current;
    resetQueue();
    for (const resolve of queue) {
      resolve();
    }
  }

  React.useEffect(() => {
    consumeQueue();
  }, [state]);

  const setState = React.useCallback(
    (newState: React.SetStateAction<T>) => {
      _setState(newState);
      return new Promise<void>((resolve) => {
        pushQueue(resolve);
      });
    },
    [_setState, resolveQueueRef]
  );
  return [state, setState] as const;
}
