import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  SetErrorContext,
  StateManager,
  StateManagerContext,
  TNode,
  TNodeRow,
  ToposorterState,
  ToposorterStateContext,
} from "./ToposorterState";
import { useSelectedNode } from "./Selection";

class ArgType<_T> {
  static TNode = new ArgType<TNodeRow>();
  static string = new ArgType<string>();
}

type TypeOfArgType<T> = T extends ArgType<infer U> ? U : never;

interface ArgsShape {
  subject?: typeof ArgType.TNode | typeof ArgType.string;
  object?: typeof ArgType.TNode | typeof ArgType.string;
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
        stateManager: StateManager
      ): void;
    }
  ) {}
}

const commands = Object.fromEntries(
  [
    new Command({
      command: "delete",
      argsShape: {
        subject: ArgType.TNode,
      },
      runCommand(args, stateManager) {
        stateManager.deleteNode(args.subject);
      },
    }),
    new Command({
      command: "child",
      argsShape: {
        subject: ArgType.TNode,
        object: ArgType.TNode,
      },
      runCommand(args, stateManager) {
        stateManager.addEdge(args.subject, args.object);
      },
    }),
    new Command({
      command: "status",
      argsShape: {
        subject: ArgType.TNode,
        object: ArgType.string,
      },
      runCommand(args, stateManager) {
        stateManager.setStatus(args.subject, args.object);
      },
    }),
    new Command({
      command: "done",
      argsShape: {
        subject: ArgType.TNode,
      },
      runCommand(args, stateManager) {
        stateManager.setStatus(args.subject, "done");
      },
    }),
    new Command({
      command: "active",
      argsShape: {
        subject: ArgType.TNode,
      },
      runCommand(args, stateManager) {
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
  const node = useSelectedNode();
  return useMemo(() => {
    const variables: Variables = {};
    const tnode = node?.data as TNode | undefined;
    if (tnode) {
      variables.subject = { data: tnode, id: node.id };
    }
    return variables;
  }, [node]);
}

function mapArg<K extends keyof ArgsShape>(command: Command<any>, variables: Variables, k: K, state: ToposorterState): (arg: string) => void {
    return (arg: string) => {
        if (command.data.argsShape.subject == ArgType.TNode) {
            variables[k]= state.reconcileId(arg);
        }
        if (command.data.argsShape.subject == ArgType.string) {
            variables[k]= arg;
        }
    }
}

export function CommandLine() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const setError = useContext(SetErrorContext)!;
  const stateManager = useContext(StateManagerContext)!;
  const state = useContext(ToposorterStateContext)!;

  const boundVariables = useBoundVariablesFromContext();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    const input = e.currentTarget.value;

    try {
      if (input.startsWith("/")) {
        // 1. parse command
        const [command, args] = parseCommand(input.slice(1));

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

        command.data.runCommand(variables, stateManager);
      } else {
        stateManager.addNode(input);
      }
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

  // Set focus on command line.
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

  return (
    <input
      autoFocus
      ref={inputRef}
      type="text"
      onFocus={(e) => {
        console.log("onFocus", e);
        console.log(document.activeElement);
      }}
      onBlur={(e) => {
        console.log("debugging. onblur", e);
        console.log(document.activeElement);
      }}
      placeholder="Command"
      onKeyDown={handleKeyDown}
      value={input}
      onChange={handleOnChange}
      className="mt-3 px-4 py-2 text-2xl w-full border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
    ></input>
  );
}
