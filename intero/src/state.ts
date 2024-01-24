import * as React from "react";

export function useRefState<T>(initialValue: () => T, normalizeState: (value: T) => T = x => x) {
  const [_state, setState] = React.useState(initialValue());

  const state = React.useMemo(() => {
    return normalizeState(_state);
  }, [_state]);

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
      return parseJSON(value);
    }
    return defaultValue;
  }, normalizeState);

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
    localStorage.setItem(key, JSON.stringify(state, (key, value) => {
      // if (key === "createdAt") {
      //   return value.toISOString();
      // }
      if (key.startsWith("__")) {
        return undefined;
      }
      return value;
    }));
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


/**
 * Enables effect completion signaling for effectful functions.
 */
class ResolveQueue {
  constructor(readonly resolveQueueRef: React.MutableRefObject<(() => void)[]>) {}

  private push(resolve: () => void) {
    this.resolveQueueRef.current.push(resolve);
  }

  consume() {
    const queue = this.resolveQueueRef.current;
    this.resolveQueueRef.current = [];
    for (const resolve of queue) {
      resolve();
    }
  }

  waitOnConsume = () => {
    return new Promise<void>((resolve) => {
      this.push(resolve);
    });
  }
}
export function useResolveQueue() {
  const resolveQueueRef = React.useRef<(() => void)[]>([]);
  return React.useMemo(() => new ResolveQueue(resolveQueueRef), []);
}

// TODO: deprecate in favor of useResolveQueue
export function useMakeStateAsync<T>([state, _setState]: [T, React.Dispatch<React.SetStateAction<T>>]) {
  const queue = useResolveQueue();

  React.useEffect(() => {
    queue.consume();
  }, [state]);

  const setState = React.useCallback(
    (newState: React.SetStateAction<T>) => {
      _setState(newState);
      return queue.waitOnConsume();
    },
    [_setState, queue]
  );
  return [state, setState] as const;
}
