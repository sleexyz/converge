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
import { CanvasManager, CanvasManagerContext } from "./canvas_controller";
import { ActionManager, ActionManagerContext } from "./action_manager";
import { BaseDirectory, createDir, writeBinaryFile } from "@tauri-apps/api/fs";
import { appDataDir } from "@tauri-apps/api/path";
import { SearchContainer, SearchInput } from "./Box";
import { BoolOptionsObj, HideObj, PreferencesManager, PreferencesManagerContext } from "./preference_state";

class ArgType<_T> {
  static TNode = new ArgType<TNodeRow>();
  static Id = new ArgType<Id>();
  static string = new ArgType<string>();
  static parentOrChild = new ArgType<"parent" | "child">();
  static boolean = new ArgType<boolean>();
}

type TypeOfArgType<T> = T extends ArgType<infer U> ? U : never;

type ArgTypeUnion = typeof ArgType[keyof typeof ArgType];

interface ArgsShape {
  subject?: ArgTypeUnion;
  object?: ArgTypeUnion;
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
          stateManager: ToposorterStateManager;
          canvasManager: CanvasManager;
          actionManager: ActionManager;
          preferencesManager: PreferencesManager;
        }
      ): void;
    }
  ) {}
}

const commands = Object.fromEntries(
  [
    new Command({
      command: "layout",
      argsShape: {},
      runCommand(_args, { canvasManager }) {
        canvasManager.layoutNodesAndCenterSelected();
      },
    }),
    new Command({
      command: "delete",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { stateManager }) {
        stateManager.deleteNode(args.subject);
      },
    }),
    new Command({
      command: "add",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.parentOrChild,
      },
      runCommand(args, { actionManager }) {
        actionManager.add(args.subject, args.object);
      },
    }),
    new Command({
      command: "child",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.Id,
      },
      runCommand(args, { stateManager }) {
        stateManager.addEdge(args.subject, args.object);
      },
    }),
    new Command({
      command: "status",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.string,
      },
      runCommand(args, { actionManager }) {
        actionManager.setStatus(args.subject, args.object);
      },
    }),
    new Command({
      command: "unset",
      argsShape: {
        subject: ArgType.Id,
      },

      runCommand(args, { actionManager }) {
        actionManager.setStatus(args.subject, "unset");
      },
    }),
    new Command({
      command: "active",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setStatus(args.subject, "active");
      },
    }),
    new Command({
      command: "done",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setStatus(args.subject, "done");
      },
    }),
    new Command({
      command: "p0",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPriority(args.subject, 1);
      },
    }),
    new Command({
      command: "p1",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPriority(args.subject, 1);
      },
    }),
    new Command({
      command: "p2",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPriority(args.subject, 2);
      },
    }),
    new Command({
      command: "p3",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPriority(args.subject, 3);
      },
    }),
    new Command({
      command: "p4",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPriority(args.subject, 4);
      },
    }),
    new Command({
      command: "pin",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPinned(args.subject, true);
      },
    }),
    new Command({
      command: "unpin",
      argsShape: {
        subject: ArgType.Id,
      },
      runCommand(args, { actionManager }) {
        actionManager.setPinned(args.subject, false);
      },
    }),
    new Command({
      command: "type",
      argsShape: {
        subject: ArgType.Id,
        object: ArgType.string,
      },
      runCommand(args, { actionManager }) {
        actionManager.setType(args.subject, args.object);
      },
    }),
    new Command({
      command: "hide",
      argsShape: {
        object: ArgType.string,
      },
      async runCommand(args, { preferencesManager, canvasManager }) {
        if (args.object === "p4") {
          await preferencesManager.setFilter("minPriority", 4);
        } else {
          await preferencesManager.setFilter(args.object as keyof HideObj, true);
        }
        canvasManager.layoutNodes();
      },
    }),
    new Command({
      command: "show",
      argsShape: {
        object: ArgType.string,
      },
      async runCommand(args, { preferencesManager, canvasManager }) {
        if (args.object === "p4") {
          await preferencesManager.setFilter("minPriority", undefined);
        } else {
          await preferencesManager.setFilter(args.object as keyof HideObj, false);
        }
        canvasManager.layoutNodes();
      },
    }),
    new Command({
      command: "enable",
      argsShape: {
        object: ArgType.string,
      },
      async runCommand(args, { preferencesManager, canvasManager }) {
        await preferencesManager.setBoolOption(args.object as keyof BoolOptionsObj, true);
        canvasManager.layoutNodes();
      },
    }),
    new Command({
      command: "disable",
      argsShape: {
        object: ArgType.string,
      },
      async runCommand(args, { preferencesManager, canvasManager }) {
        await preferencesManager.setBoolOption(args.object as keyof BoolOptionsObj, false);
        canvasManager.layoutNodes();
      },
    }),
    new Command({
      command: "focus",
      argsShape: {
        subject: ArgType.Id,
      },
      async runCommand(args, { preferencesManager, canvasManager }) {
        await preferencesManager.focus(args.subject);
        await canvasManager.waitForPropagation();
        canvasManager.layoutNodes();
      },
    }),
    new Command({
      command: "unfocus",
      argsShape: {
        subject: ArgType.Id,
      },
      async runCommand(_args, { preferencesManager, canvasManager }) {
        await preferencesManager.unfocus();
        await canvasManager.waitForPropagation();
        canvasManager.layoutNodes();
      },
    }),
    new Command({
      command: "reload",
      argsShape: {},
      async runCommand(_args, _ctx) {
        window.location.reload();
      },
    }),
    new Command({
      command: "backup",
      argsShape: {},
      async runCommand(_args, _ctx) {
        const data = window.localStorage.getItem("toposorter");
        if (data) {
          const blob = new Blob([data], { type: "text/json" });
          const fileName = `toposorter-backup-${new Date().toISOString()}.json`;
          console.log(`Writing backup to ${fileName}`);
          const appDataDirPath = await appDataDir();
          await createDir(appDataDirPath, { recursive: true });
          await writeBinaryFile(fileName, await blob.arrayBuffer(), {
            dir: BaseDirectory.AppData,
          });
          alert("Backup written to " + appDataDirPath + fileName);
        } else {
          console.error("No data found in localStorage for 'toposorter'");
        }
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
  command: Command<ArgsShape>,
  variables: Variables,
  k: K,
  state: ToposorterState
): (arg: string) => void {
  return (arg: string) => {
    switch (command.data.argsShape[k]) {
      case ArgType.TNode:
        variables[k] = state.reconcileId(arg);
        break;
      case ArgType.Id:
        variables[k] = state.reconcileId(arg).id;
        break;
      case ArgType.string:
        variables[k] = arg;
        break;
      case ArgType.parentOrChild:
        variables[k] = arg;
        break;
      case ArgType.boolean:
        switch (arg) {
          case "true":
            variables[k] = true;
            break;
          case "false":
            variables[k] = false;
            break;
          default:
            throw new Error("Expected true or false");
        }
        break;
      default:
        throw new Error("Unknown arg type");
    }
  };
}

export function CommandLine() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const setError = useContext(SetErrorContext)!;
  const stateManager = useContext(ToposorterStateManagerContext)!;
  const actionManager = useContext(ActionManagerContext)!;
  const preferencesManager = useContext(PreferencesManagerContext)!;
  const state = useContext(ToposorterStateContext)!;

  const boundVariables = useBoundVariablesFromContext();
  const canvasManager = useContext(CanvasManagerContext)!;

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
      command.data.runCommand(variables, {
        actionManager,
        stateManager,
        canvasManager,
        preferencesManager
      });
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
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        inputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <SearchContainer>
      <SearchInput
        ref={inputRef}
        placeholder="Command"
        onKeyDown={handleKeyDown}
        value={input}
        onChange={handleOnChange}
      />
    </SearchContainer>
  );
}
