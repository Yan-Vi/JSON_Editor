import type { JsonBinding } from "../../../core/types";
import type { DrawerRuntimeApi } from "./contracts";
import { setJsonValidationError } from "../../jsonTab/jsonTab";

interface JsonTextAreaWithMeta extends HTMLTextAreaElement {
  _lineNumbers?: HTMLDivElement;
  _errorLine?: number | null;
}

function syncJsonLineNumbers(jsonOutput: JsonTextAreaWithMeta): void {
  const lineNumbers = jsonOutput._lineNumbers;
  if (!lineNumbers) return;
  const value = jsonOutput.value || "";
  const lineCount = value.length ? value.split("\n").length : 1;
  const errorLine = jsonOutput._errorLine;
  lineNumbers.innerHTML = "";
  for (let i = 1; i <= lineCount; i += 1) {
    const row = document.createElement("div");
    row.classList.add("json-line-number");
    if (errorLine === i) row.classList.add("error");
    row.textContent = String(i);
    lineNumbers.appendChild(row);
  }
  lineNumbers.scrollTop = jsonOutput.scrollTop;
}

function formatJsonString(rawText: string): { ok: true; value: string } | { ok: false; errorMessage: string; errorObject: unknown } {
  try {
    const parsed = JSON.parse(rawText);
    return { ok: true, value: JSON.stringify(parsed, null, 2) };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : "Invalid JSON",
      errorObject: err
    };
  }
}

function resolveJsonErrorLine(rawJsonText: string, errorObject: unknown): number | null {
  if (!(errorObject instanceof Error) || typeof errorObject.message !== "string") return null;
  const message = errorObject.message;
  const lineColumnMatch = message.match(/line\s+([0-9]+)\s+column\s+([0-9]+)/i);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    return Number.isFinite(line) && line > 0 ? line : null;
  }
  const positionMatch = message.match(/position\s+([0-9]+)/i);
  if (!positionMatch) return null;
  const position = Number(positionMatch[1]);
  if (!Number.isFinite(position) || position < 0) return null;
  return rawJsonText.slice(0, position).split("\n").length;
}

function insertSpacesAtCaret(textarea: HTMLTextAreaElement, spaces: string): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = textarea.value;
  textarea.value = `${current.slice(0, start)}${spaces}${current.slice(end)}`;
  const nextCursor = start + spaces.length;
  textarea.selectionStart = nextCursor;
  textarea.selectionEnd = nextCursor;
}

export interface CreateEditorConfig {
  container: HTMLElement;
  getValue: () => unknown;
  setValue: (v: unknown) => void;
  renderInspector: (el: HTMLElement) => void;
  onApplyEdit?: () => void;
  syncFromExternal?: (jsonOutput: HTMLTextAreaElement) => void;
  shouldDeferCommit?: (el: Element | null) => boolean;
  markDeferred?: () => void;
  clearTypeHints?: () => void;
}

export interface CreateEditorConfigEmbedded {
  container: HTMLElement;
  label: string;
  value: unknown;
  binding: JsonBinding | undefined;
  api: DrawerRuntimeApi;
  onMutation: () => void;
}

interface CreateEditorResult {
  inspector: HTMLDivElement;
  jsonPanel: HTMLDivElement;
  jsonOutput: HTMLTextAreaElement;
  jsonError: HTMLDivElement;
  dragHandle?: HTMLDivElement;
}

function createEditorFromConfig(config: CreateEditorConfig): CreateEditorResult {
  const { container, getValue, setValue, renderInspector, onApplyEdit, syncFromExternal, shouldDeferCommit, markDeferred, clearTypeHints } = config;

  const tabs = document.createElement("div");
  tabs.classList.add("editor-tabs");

  const inspectorTabBtn = document.createElement("button");
  inspectorTabBtn.type = "button";
  inspectorTabBtn.classList.add("editor-tab", "active");
  inspectorTabBtn.textContent = "inspector";

  const jsonTabBtn = document.createElement("button");
  jsonTabBtn.type = "button";
  jsonTabBtn.classList.add("editor-tab");
  jsonTabBtn.textContent = "json";

  tabs.appendChild(inspectorTabBtn);
  tabs.appendChild(jsonTabBtn);

  const inspectorPanel = document.createElement("div");
  inspectorPanel.classList.add("inspector", "active");

  const jsonPanel = document.createElement("div");
  jsonPanel.classList.add("json-panel");

  const jsonToolbar = document.createElement("div");
  jsonToolbar.classList.add("json-toolbar");
  const formatBtn = document.createElement("button");
  formatBtn.type = "button";
  formatBtn.classList.add("json-format-button");
  formatBtn.textContent = "format";

  const jsonEditorWrap = document.createElement("div");
  jsonEditorWrap.classList.add("json-editor-wrap");
  const lineNumbers = document.createElement("div");
  lineNumbers.classList.add("json-line-numbers");
  const jsonOutput = document.createElement("textarea") as JsonTextAreaWithMeta;
  jsonOutput.classList.add("json-output");
  jsonOutput.readOnly = false;
  jsonOutput._lineNumbers = lineNumbers;

  const jsonError = document.createElement("div");
  jsonError.classList.add("json-error");

  jsonToolbar.appendChild(formatBtn);
  jsonEditorWrap.appendChild(lineNumbers);
  jsonEditorWrap.appendChild(jsonOutput);
  jsonPanel.appendChild(jsonToolbar);
  jsonPanel.appendChild(jsonEditorWrap);
  jsonPanel.appendChild(jsonError);

  function syncJsonFromValue(): void {
    jsonOutput.value = JSON.stringify(getValue(), null, 2);
    syncJsonLineNumbers(jsonOutput);
    setJsonValidationError(jsonOutput, jsonError, "", null);
  }

  let jsonSyncTimer: number | null = null;
  function applyJsonEdit(): boolean {
    try {
      const parsed = JSON.parse(jsonOutput.value);
      setValue(parsed);
      setJsonValidationError(jsonOutput, jsonError, "", null);
      inspectorPanel.innerHTML = "";
      renderInspector(inspectorPanel);
      onApplyEdit?.();
      clearTypeHints?.();
      return true;
    } catch (err) {
      setJsonValidationError(
        jsonOutput,
        jsonError,
        err instanceof Error ? err.message : "Invalid JSON",
        resolveJsonErrorLine(jsonOutput.value, err)
      );
      return false;
    }
  }

  renderInspector(inspectorPanel);

  inspectorTabBtn.addEventListener("click", () => {
    inspectorPanel.classList.add("active");
    jsonPanel.classList.remove("active");
    inspectorTabBtn.classList.add("active");
    jsonTabBtn.classList.remove("active");
    setJsonValidationError(jsonOutput, jsonError, "");
  });

  jsonTabBtn.addEventListener("click", () => {
    inspectorPanel.classList.remove("active");
    jsonPanel.classList.add("active");
    inspectorTabBtn.classList.remove("active");
    jsonTabBtn.classList.add("active");
    syncJsonFromValue();
  });

  formatBtn.addEventListener("click", () => {
    const formatted = formatJsonString(jsonOutput.value);
    if (!formatted.ok) {
      setJsonValidationError(
        jsonOutput,
        jsonError,
        formatted.errorMessage,
        resolveJsonErrorLine(jsonOutput.value, formatted.errorObject)
      );
      return;
    }
    jsonOutput.value = formatted.value;
    syncJsonLineNumbers(jsonOutput);
    setJsonValidationError(jsonOutput, jsonError, "", null);
    applyJsonEdit();
  });

  jsonOutput.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    insertSpacesAtCaret(jsonOutput, "  ");
    jsonOutput.dispatchEvent(new Event("input", { bubbles: true }));
  });

  jsonOutput.addEventListener("input", () => {
    syncJsonLineNumbers(jsonOutput);
    setJsonValidationError(jsonOutput, jsonError, "", null);
    if (jsonSyncTimer) window.clearTimeout(jsonSyncTimer);
    jsonSyncTimer = window.setTimeout(() => {
      const applied = applyJsonEdit();
      if (applied && shouldDeferCommit?.(document.activeElement)) {
        markDeferred?.();
      } else if (applied) {
        onApplyEdit?.();
      }
      jsonSyncTimer = null;
    }, 220);
  });

  jsonOutput.addEventListener("scroll", () => {
    if (lineNumbers) lineNumbers.scrollTop = jsonOutput.scrollTop;
  });

  if (syncFromExternal) {
    window.setInterval(() => {
      if (!jsonPanel.classList.contains("active")) return;
      if (document.activeElement === jsonOutput) return;
      syncFromExternal(jsonOutput);
      syncJsonLineNumbers(jsonOutput);
    }, 200);
  }

  container.appendChild(tabs);
  container.appendChild(inspectorPanel);
  container.appendChild(jsonPanel);

  return { inspector: inspectorPanel, jsonPanel, jsonOutput, jsonError, dragHandle: tabs };
}

export function createEditor(config: CreateEditorConfig): CreateEditorResult {
  return createEditorFromConfig(config);
}

export function createEditorEmbedded(config: CreateEditorConfigEmbedded): void {
  const { container, label, value, binding, api, onMutation } = config;
  container.classList.add("node-drawer", "editor");
  function getValue(): unknown {
    if (!binding?.parent || binding.key === undefined || binding.key === null) return value;
    return binding.parent[binding.key];
  }
  function setValue(next: unknown): void {
    if (!binding?.parent || binding.key === undefined || binding.key === null) return;
    binding.parent[binding.key] = next;
    onMutation();
  }
  function renderInspector(el: HTMLElement): void {
    const currentValue = getValue();
    api.getDrawer(currentValue, binding)(el, label, currentValue, undefined, binding);
  }
  createEditorFromConfig({
    container,
    getValue,
    setValue,
    renderInspector
  });
}
