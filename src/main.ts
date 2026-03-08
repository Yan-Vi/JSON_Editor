import "../style.css";
import type { JsonEditorState } from "./core/types";
import { createMutationBridge, createRefreshBridge } from "./core/mutationBridge";
import { createEditor } from "./features/inspectorTab/drawers/nodeDrawer";
import { createInspectorRuntime } from "./features/inspectorTab/runtime";
import { ensureHistory, recordHistoryChange, redoHistory, registerHistoryShortcuts, shouldDeferHistoryCommit, undoHistory } from "./features/history/history";
import { setJsonValidationError } from "./features/jsonTab/jsonTab";
import defaultJson from "../docs/test.json";

document.addEventListener("DOMContentLoaded", main);

function main(): void {
  const state = createInitialState(defaultJson as JsonEditorState["json"]);
  let pendingHistoryCommit = false;
  const editor = document.querySelector(".editor");
  if (!(editor instanceof HTMLElement)) return;
  editor.classList.add("root-node-drawer");

  const mutationCallbacks = {
    onMutation: () => undefined,
    onRefresh: () => undefined
  };

  const runtime = createInspectorRuntime({
    onMutation: createMutationBridge(() => mutationCallbacks.onMutation()),
    onRefresh: createRefreshBridge(() => mutationCallbacks.onRefresh())
  });

  const typeHintsAccess = {
    exportSnapshot: runtime.exportTypeHintsSnapshot,
    importSnapshot: runtime.importTypeHintsSnapshot
  };

  function syncJsonOutput(jsonOutput: HTMLTextAreaElement): void {
    jsonOutput.value = JSON.stringify(state.json, null, 2);
  }

  const { inspector, jsonPanel, jsonOutput, jsonError, dragHandle } = createEditor({
    container: editor,
    getValue: () => state.json,
    setValue: (v) => {
      state.json = v as JsonEditorState["json"];
      state.jsonBinding.parent = state as unknown as Record<string | number, unknown>;
    },
    renderInspector: (el) => {
      el.innerHTML = "";
      runtime.drawObjectRoot(el, "json", state.json, undefined, state.jsonBinding);
    },
    onApplyEdit: () => recordHistoryChange(state, typeHintsAccess),
    syncFromExternal: syncJsonOutput,
    shouldDeferCommit: shouldDeferHistoryCommit,
    markDeferred: () => {
      pendingHistoryCommit = true;
    },
    clearTypeHints: () => runtime.importTypeHintsSnapshot({})
  });

  ensureHistory(state, typeHintsAccess);

  mutationCallbacks.onMutation = () => {
    if (shouldDeferHistoryCommit(document.activeElement)) {
      pendingHistoryCommit = true;
      return;
    }
    recordHistoryChange(state, typeHintsAccess);
    if (jsonPanel.classList.contains("active") && document.activeElement !== jsonOutput) {
      syncJsonOutput(jsonOutput);
    }
  };

  mutationCallbacks.onRefresh = () => {
    const foldoutStates = captureFoldoutStates(inspector);
    inspector.innerHTML = "";
    runtime.drawObjectRoot(inspector, "json", state.json, undefined, state.jsonBinding);
    applyFoldoutStates(inspector, foldoutStates);
    if (jsonPanel.classList.contains("active") && document.activeElement !== jsonOutput) {
      syncJsonOutput(jsonOutput);
    }
  };

  document.addEventListener("focusout", () => {
    if (!pendingHistoryCommit) return;
    window.setTimeout(() => {
      if (shouldDeferHistoryCommit(document.activeElement)) return;
      pendingHistoryCommit = false;
      recordHistoryChange(state, typeHintsAccess);
    }, 0);
  });

  registerHistoryShortcuts(
    document,
    () => {
      if (!undoHistory(state, typeHintsAccess)) return;
      const foldoutStates = captureFoldoutStates(inspector);
      inspector.innerHTML = "";
      runtime.drawObjectRoot(inspector, "json", state.json, undefined, state.jsonBinding);
      applyFoldoutStates(inspector, foldoutStates);
      syncJsonOutput(jsonOutput);
      setJsonValidationError(jsonOutput, jsonError, "");
    },
    () => {
      if (!redoHistory(state, typeHintsAccess)) return;
      const foldoutStates = captureFoldoutStates(inspector);
      inspector.innerHTML = "";
      runtime.drawObjectRoot(inspector, "json", state.json, undefined, state.jsonBinding);
      applyFoldoutStates(inspector, foldoutStates);
      syncJsonOutput(jsonOutput);
      setJsonValidationError(jsonOutput, jsonError, "");
    }
  );

  if (dragHandle) {
    enableEditorDragging(editor, dragHandle);
  }
  placeEditorInCenter(editor);
}

function createInitialState(initialJson: JsonEditorState["json"]): JsonEditorState {
  const state: JsonEditorState = {
    json: initialJson,
    jsonBinding: { path: "$", parent: {} as Record<string | number, unknown>, key: "json" },
    history: null
  };
  state.jsonBinding.parent = state as unknown as Record<string | number, unknown>;
  return state;
}

function syncJsonOutput(jsonOutput: HTMLTextAreaElement, state: JsonEditorState): void {
  jsonOutput.value = JSON.stringify(state.json, null, 2);
}

function captureFoldoutStates(inspector: HTMLElement): Record<string, boolean> {
  const stateByPath: Record<string, boolean> = {};
  inspector.querySelectorAll(".foldout-frame[data-binding-path]").forEach((frame) => {
    const path = frame.getAttribute("data-binding-path");
    if (!path) return;
    stateByPath[path] = frame.classList.contains("collapsed");
  });
  return stateByPath;
}

function applyFoldoutStates(inspector: HTMLElement, stateByPath: Record<string, boolean>): void {
  inspector.querySelectorAll(".foldout-frame[data-binding-path]").forEach((frame) => {
    const path = frame.getAttribute("data-binding-path");
    if (!path || !Object.prototype.hasOwnProperty.call(stateByPath, path)) return;
    const shouldBeCollapsed = Boolean(stateByPath[path]);
    const valueEl = frame.querySelector(".object-value, .array-value");
    const toggleEl = frame.querySelector(".foldout-toggle");
    if (shouldBeCollapsed) {
      frame.classList.add("collapsed");
      if (valueEl instanceof HTMLElement) valueEl.hidden = true;
      if (toggleEl) toggleEl.textContent = "▸";
      return;
    }
    frame.classList.remove("collapsed");
    if (valueEl instanceof HTMLElement) valueEl.hidden = false;
    if (toggleEl) toggleEl.textContent = "▾";
  });
}

function placeEditorInCenter(editor: HTMLElement): void {
  const rect = editor.getBoundingClientRect();
  const left = Math.max(0, Math.round((window.innerWidth - rect.width) / 2));
  const top = Math.max(0, Math.round((window.innerHeight - rect.height) / 2));
  editor.style.left = `${left}px`;
  editor.style.top = `${top}px`;
}

function enableEditorDragging(editor: HTMLElement, dragHandle: HTMLDivElement): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  dragHandle.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originLeft = editor.offsetLeft;
    originTop = editor.offsetTop;
    document.body.style.userSelect = "none";
  });
  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const nextLeft = originLeft + event.clientX - startX;
    const nextTop = originTop + event.clientY - startY;
    const maxLeft = Math.max(0, window.innerWidth - editor.offsetWidth - 12);
    const maxTop = Math.max(0, window.innerHeight - editor.offsetHeight - 12);
    editor.style.left = `${Math.min(Math.max(12, nextLeft), maxLeft)}px`;
    editor.style.top = `${Math.min(Math.max(12, nextTop), maxTop)}px`;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}
