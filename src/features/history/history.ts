import type { DiffOp, HistoryEntry, HistoryState, JsonEditorState, JsonValue, TypeHintToken } from "../../core/types";

interface TypeHintAccess {
  exportSnapshot: () => Record<string, TypeHintToken>;
  importSnapshot: (nextTypeHints: Record<string, TypeHintToken>) => void;
}

function deepClone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createSetOp(path: Array<string | number>, value: unknown, hadValue: boolean, oldValue: unknown): DiffOp {
  return {
    type: "set",
    path: path.slice(),
    value: deepClone(value),
    hadValue,
    oldValue: hadValue ? deepClone(oldValue) : undefined
  };
}

function createRemoveOp(path: Array<string | number>, oldValue: unknown): DiffOp {
  return {
    type: "remove",
    path: path.slice(),
    oldValue: deepClone(oldValue)
  };
}

function collectDiffOps(prevValue: unknown, nextValue: unknown, path: Array<string | number>, ops: DiffOp[]): void {
  if (Array.isArray(prevValue) || Array.isArray(nextValue)) {
    if (!Array.isArray(prevValue) || !Array.isArray(nextValue) || JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      ops.push(createSetOp(path, nextValue, true, prevValue));
    }
    return;
  }
  if (isObjectValue(prevValue) && isObjectValue(nextValue)) {
    const prevKeys = Object.keys(prevValue);
    const nextKeys = Object.keys(nextValue);
    const sameKeyCount = prevKeys.length === nextKeys.length;
    const sameKeyOrder = sameKeyCount && prevKeys.every((key, index) => key === nextKeys[index]);
    if (!sameKeyOrder) {
      ops.push(createSetOp(path, nextValue, true, prevValue));
      return;
    }
    Object.keys(prevValue).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(nextValue, key)) return;
      ops.push(createRemoveOp(path.concat(key), prevValue[key]));
    });
    Object.keys(nextValue).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(prevValue, key)) {
        collectDiffOps(prevValue[key], nextValue[key], path.concat(key), ops);
        return;
      }
      ops.push(createSetOp(path.concat(key), nextValue[key], false, undefined));
    });
    return;
  }
  if (prevValue === nextValue) return;
  if (Number.isNaN(prevValue) && Number.isNaN(nextValue)) return;
  ops.push(createSetOp(path, nextValue, true, prevValue));
}

function invertOps(ops: DiffOp[]): DiffOp[] {
  const inverse: DiffOp[] = [];
  for (let i = ops.length - 1; i >= 0; i -= 1) {
    const op = ops[i];
    if (!op) continue;
    if (op.type === "remove") {
      inverse.push({
        type: "set",
        path: op.path.slice(),
        value: deepClone(op.oldValue),
        hadValue: false,
        oldValue: undefined
      });
      continue;
    }
    if (op.hadValue) {
      inverse.push({
        type: "set",
        path: op.path.slice(),
        value: deepClone(op.oldValue),
        hadValue: true,
        oldValue: deepClone(op.value)
      });
      continue;
    }
    inverse.push({
      type: "remove",
      path: op.path.slice(),
      oldValue: deepClone(op.value)
    });
  }
  return inverse;
}

function setPathValue(holder: Record<string, unknown>, rootKey: string, path: Array<string | number>, value: unknown): void {
  if (path.length === 0) {
    holder[rootKey] = deepClone(value);
    return;
  }
  let node = holder[rootKey];
  if (node === undefined || node === null || typeof node !== "object") {
    node = typeof path[0] === "number" ? [] : {};
    holder[rootKey] = node;
  }
  let currentNode = node as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i] as string | number;
    const nextKey = path[i + 1];
    if (currentNode[key] === undefined || currentNode[key] === null || typeof currentNode[key] !== "object") {
      currentNode[key] = typeof nextKey === "number" ? [] : {};
    }
    currentNode = currentNode[key] as Record<string | number, unknown>;
  }
  currentNode[path[path.length - 1] as string | number] = deepClone(value);
}

function removePathValue(holder: Record<string, unknown>, rootKey: string, path: Array<string | number>): void {
  if (path.length === 0) return;
  const node = holder[rootKey];
  if (node === undefined || node === null || typeof node !== "object") return;
  let currentNode = node as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i] as string | number;
    if (currentNode[key] === undefined || currentNode[key] === null || typeof currentNode[key] !== "object") return;
    currentNode = currentNode[key] as Record<string | number, unknown>;
  }
  const lastKey = path[path.length - 1] as string | number;
  if (Array.isArray(currentNode) && typeof lastKey === "number") {
    currentNode.splice(lastKey, 1);
    return;
  }
  delete currentNode[lastKey];
}

function applyOpsToValue<T>(rootValue: T, ops: DiffOp[]): T {
  const holder: Record<string, unknown> = { root: rootValue };
  ops.forEach((op) => {
    if (op.type === "set") {
      setPathValue(holder, "root", op.path, op.value);
      return;
    }
    if (op.type === "remove") {
      removePathValue(holder, "root", op.path);
    }
  });
  return holder.root as T;
}

export function ensureHistory(state: JsonEditorState, typeHints: TypeHintAccess): HistoryState {
  if (state.history) return state.history;
  const initialTypeHints = typeHints.exportSnapshot();
  const created: HistoryState = {
    undoStack: [],
    redoStack: [],
    committed: {
      json: deepClone(state.json),
      typeHints: deepClone(initialTypeHints)
    },
    isApplying: false,
    maxEntries: 400
  };
  state.history = created;
  return created;
}

export function recordHistoryChange(state: JsonEditorState, typeHints: TypeHintAccess): void {
  const history = ensureHistory(state, typeHints);
  if (history.isApplying) return;
  const nextTypeHints = typeHints.exportSnapshot();
  const jsonOps: DiffOp[] = [];
  const typeHintOps: DiffOp[] = [];
  collectDiffOps(history.committed.json, state.json, [], jsonOps);
  collectDiffOps(history.committed.typeHints, nextTypeHints, [], typeHintOps);
  if (jsonOps.length === 0 && typeHintOps.length === 0) return;
  const historyEntry: HistoryEntry = {
    forward: {
      jsonOps,
      typeHintOps
    },
    backward: {
      jsonOps: invertOps(jsonOps),
      typeHintOps: invertOps(typeHintOps)
    }
  };
  history.undoStack.push(historyEntry);
  if (history.undoStack.length > history.maxEntries) {
    history.undoStack.shift();
  }
  history.redoStack.length = 0;
  history.committed = {
    json: deepClone(state.json),
    typeHints: deepClone(nextTypeHints)
  };
}

export function undoHistory(state: JsonEditorState, typeHints: TypeHintAccess): boolean {
  const history = ensureHistory(state, typeHints);
  if (history.undoStack.length === 0) return false;
  const historyEntry = history.undoStack.pop();
  if (!historyEntry) return false;
  history.isApplying = true;
  state.json = applyOpsToValue<JsonValue>(state.json, historyEntry.backward.jsonOps);
  const currentTypeHints = typeHints.exportSnapshot();
  const nextTypeHints = applyOpsToValue(currentTypeHints, historyEntry.backward.typeHintOps);
  typeHints.importSnapshot(nextTypeHints);
  state.jsonBinding.parent = state as unknown as Record<string | number, unknown>;
  history.isApplying = false;
  history.redoStack.push(historyEntry);
  history.committed = {
    json: deepClone(state.json),
    typeHints: deepClone(nextTypeHints)
  };
  return true;
}

export function redoHistory(state: JsonEditorState, typeHints: TypeHintAccess): boolean {
  const history = ensureHistory(state, typeHints);
  if (history.redoStack.length === 0) return false;
  const historyEntry = history.redoStack.pop();
  if (!historyEntry) return false;
  history.isApplying = true;
  state.json = applyOpsToValue<JsonValue>(state.json, historyEntry.forward.jsonOps);
  const currentTypeHints = typeHints.exportSnapshot();
  const nextTypeHints = applyOpsToValue(currentTypeHints, historyEntry.forward.typeHintOps);
  typeHints.importSnapshot(nextTypeHints);
  state.jsonBinding.parent = state as unknown as Record<string | number, unknown>;
  history.isApplying = false;
  history.undoStack.push(historyEntry);
  history.committed = {
    json: deepClone(state.json),
    typeHints: deepClone(nextTypeHints)
  };
  return true;
}

export function shouldDeferHistoryCommit(activeElement: Element | null): boolean {
  if (!activeElement) return false;
  if (activeElement.tagName === "TEXTAREA") return true;
  if (activeElement.tagName !== "INPUT") return false;
  return String((activeElement as HTMLInputElement).type || "").toLowerCase() === "text";
}

export function registerHistoryShortcuts(target: Document, onUndo: () => void, onRedo: () => void): void {
  target.addEventListener("keydown", (event) => {
    if (event.altKey) return;
    const active = document.activeElement as HTMLElement | null;
    const isTypingTarget = Boolean(
      active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)
    );
    if (isTypingTarget) return;
    const key = String(event.key || "").toLowerCase();
    const hasPrimaryModifier = event.metaKey || event.ctrlKey;
    if (!hasPrimaryModifier) return;
    const isUndo = key === "z" && !event.shiftKey;
    const isRedo = (key === "z" && event.shiftKey) || (!event.metaKey && key === "y");
    if (!isUndo && !isRedo) return;
    event.preventDefault();
    if (isUndo) {
      onUndo();
      return;
    }
    onRedo();
  });
}
