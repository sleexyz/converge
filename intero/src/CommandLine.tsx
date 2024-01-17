import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Id,
  SetErrorContext,
  ToposorterStateManager,
  ToposorterStateManagerContext,
  TNodeRow,
  ToposorterState,
  ToposorterStateContext,
} from "./ToposorterState";
import { useSelectedNode } from "./Selection";
import { UIStateContext } from "./ui_state";
import { useReactFlow } from "reactflow";
import { CanvasManager, CanvasManagerContext } from "./canvas_controller";

class ArgType<_T> {
  static TNode = new ArgType<TNodeRow>();
  static Id = new ArgType<Id>();
  static string = new ArgType<string>();
  static parentOrChild = new ArgType<"parent"|"child">();
}

type TypeOfArgType<T> = T extends ArgType<infer U> ? U : never;

interface ArgsShape {
  subject?: typeof ArgType.TNode | typeof ArgType.string | typeof ArgType.Id | typeof ArgType.parentOrChild;
  object?: typeof ArgType.TNode | typeof ArgType.string | typeof ArgType.Id | typeof ArgType.parentOrChild;
}

type VariablesFromArgs<A extends ArgsShape> = {
  [K in keyof A]: TypeOfArgType<A[K]>;
};

type Variables = VariablesFromArgs<ArgsShape>;

class Command<A extends ArgsShape> {
  constructor(
    readonly data: {
      command: string;
      argsShape: A;
      runCommand(
        variables: VariablesFromArgs<A>,
        ctx: {
          stateManager: ToposorterStateManager,
          fitView: () => void,
          canvasManager: CanvasManager,
        }
      ): void;
    }
  ) {}
}

const commands = Object.fromEntries(
  [
    new Command({
      command: "layout",
      argsShape: {
      },
      runCommand(_args, {fitView, canvasManager}) {
        canvasManager.layoutNodes();
        fitView();
      },
    }),
    new Command({
      command: "delete",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, {stateManager}) {
        stateManager.deleteNode(args.subject);
      },
    }),
    new Command({
      command: "add",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.parentOrChild,
      },
      runCommand(args, {stateManager}) {
        stateManager.add(args.subject, args.object);
      },
    }),
    new Command({
      command: "child",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.Id,
      },
      runCommand(args, {stateManager}) {
        stateManager.addEdge(args.subject, args.object);
      },
    }),
    new Command({
      command: "status",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.string,
      },
      runCommand(args, {stateManager}) {
        stateManager.setStatus(args.subject, args.object);
      },
    }),
    new Command({
      command: "done",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, {stateManager}) {
        stateManager.setStatus(args.subject, "done");
      },
    }),
    new Command({
      command: "active",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, {stateManager}) {
        stateManager.setStatus(args.subject, "active");
      },
    }),
  ].map((command) => [command.data.command, command])
);

function parseCommand(input: string): [Command<any>, string[]] {
  const args = input.split(" ");
  const command = commands[args[0]];
  if (!command) {
    throw new Error(`Unknown command ${args[0]}`);
  }
  return [command, args.slice(1)];
}

function useBoundVariablesFromContext() {
  const [node] = useSelectedNode();
  return useMemo(() => {
    const variables: Variables = {};
    const id = node?.id;
    if (id) {
      variables.subject = id;
    }
    return variables;
  }, [node]);
}

function mapArg<K extends keyof ArgsShape>(
  command: Command<any>,
  variables: Variables,
  k: K,
  state: ToposorterState
): (arg: string) => void {
  return (arg: string) => {
    if (command.data.argsShape[k] == ArgType.TNode) {
      variables[k] = state.reconcileId(arg);
    }
    if (command.data.argsShape[k] == ArgType.Id) {
      variables[k] = state.reconcileId(arg).id;
    }
    if (command.data.argsShape[k] == ArgType.string) {
      variables[k] = arg;
    }
    if (command.data.argsShape[k] == ArgType.parentOrChild) {
      variables[k] = arg;
    }
  };
}

export function CommandLine() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const setError = useContext(SetErrorContext)!;
  const stateManager = useContext(ToposorterStateManagerContext)!;
  const state = useContext(ToposorterStateContext)!;

  const boundVariables = useBoundVariablesFromContext();
  const canvasManager = useContext(CanvasManagerContext)!;

  const { fitView } = useReactFlow();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    const input = e.currentTarget.value;

    try {
      // 1. parse command
      const [command, args] = parseCommand(input);

      // 2. make context
      const variables: Variables = {
        ...boundVariables,
      };

      // Maps positional args to variables
      const mapArgs = [
        mapArg(command, variables, "subject", state),
        mapArg(command, variables, "object", state),
      ];
      // If subject is bound, we can omit it.
      if (variables.subject !== undefined) {
        mapArgs.shift();
      }
      for (const [i, arg] of args.entries()) {
        mapArgs[i](arg);
      }
      command.data.runCommand(variables, {stateManager, fitView, canvasManager});
      setError(null);
      setInput("");
    } catch (e: unknown) {
      console.error(e);
      setError(e as Error);
    }
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget) {
      setInput(e.currentTarget.value);
    }
  };

  // Set focus on input when the page is visible.
  useEffect(() => {
    inputRef.current?.focus();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    function onVisibilityChange() {
      if (!document.hidden) {
        inputRef.current?.focus();
      }
    }
  }, []);

  // Set focus on input when the selected node changes.
  // const [selectedNode] = useSelectedNode();
  // useEffect(() => {
  //   inputRef.current?.focus();
  // }, [selectedNode]);

  const uiState = useContext(UIStateContext)!;
  useEffect(() => {
    uiState.bindCommandLineRef(inputRef);
  }, [inputRef]);


  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        inputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        inputRef.current?.focus();
      }
    };
  
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <input
      autoFocus
      ref={inputRef}
      type="text"
      placeholder="Command"
      onKeyDown={handleKeyDown}
      value={input}
      onChange={handleOnChange}
      className="mt-3 px-4 py-2 text-2xl w-full border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
    ></input>
  );
}
