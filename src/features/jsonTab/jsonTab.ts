import type { JsonEditorState, JsonTabElements } from "../../core/types";

interface JsonTextAreaWithMeta extends HTMLTextAreaElement {
  _lineNumbers?: HTMLDivElement;
  _errorLine?: number | null;
}

interface SetupJsonTextTabConfig {
  inspector: HTMLDivElement;
  inspectorTab: HTMLButtonElement;
  jsonTab: HTMLButtonElement;
  jsonPanel: HTMLDivElement;
  jsonOutput: JsonTextAreaWithMeta;
  jsonError: HTMLDivElement;
  formatJsonButton: HTMLButtonElement;
  state: JsonEditorState;
  shouldDeferHistoryCommit: (activeElement: Element | null) => boolean;
  markHistoryDeferred: () => void;
  commitHistory: () => void;
  syncJsonOutput: (jsonOutput: HTMLTextAreaElement, state: JsonEditorState) => void;
  renderInspector: (inspector: HTMLElement, state: JsonEditorState) => void;
  clearTypeHints: () => void;
}

export function createJsonTabElements(): JsonTabElements {
  const jsonPanel = document.createElement("div");
  const jsonToolbar = document.createElement("div");
  const formatJsonButton = document.createElement("button");
  const jsonEditorWrap = document.createElement("div");
  const jsonLineNumbers = document.createElement("div");
  const jsonOutput = document.createElement("textarea") as JsonTextAreaWithMeta;
  const jsonError = document.createElement("div");
  jsonPanel.classList.add("json-panel");
  jsonToolbar.classList.add("json-toolbar");
  formatJsonButton.classList.add("json-format-button");
  formatJsonButton.type = "button";
  formatJsonButton.textContent = "format";
  jsonEditorWrap.classList.add("json-editor-wrap");
  jsonLineNumbers.classList.add("json-line-numbers");
  jsonOutput.classList.add("json-output");
  jsonOutput.readOnly = false;
  jsonOutput._lineNumbers = jsonLineNumbers;
  jsonError.classList.add("json-error");
  jsonToolbar.appendChild(formatJsonButton);
  jsonPanel.appendChild(jsonToolbar);
  jsonEditorWrap.appendChild(jsonLineNumbers);
  jsonEditorWrap.appendChild(jsonOutput);
  jsonPanel.appendChild(jsonEditorWrap);
  jsonPanel.appendChild(jsonError);
  return {
    panel: jsonPanel,
    output: jsonOutput,
    error: jsonError,
    formatButton: formatJsonButton,
    lineNumbers: jsonLineNumbers
  };
}

export function setupJsonTextTab(config: SetupJsonTextTabConfig): void {
  const {
    inspector,
    inspectorTab,
    jsonTab,
    jsonPanel,
    jsonOutput,
    jsonError,
    formatJsonButton,
    state,
    shouldDeferHistoryCommit,
    markHistoryDeferred,
    commitHistory,
    syncJsonOutput,
    renderInspector,
    clearTypeHints
  } = config;
  let syncTimer: number | null = null;
  syncJsonLineNumbers(jsonOutput);

  inspectorTab.addEventListener("click", () => {
    inspector.classList.add("active");
    jsonPanel.classList.remove("active");
    inspectorTab.classList.add("active");
    jsonTab.classList.remove("active");
    setJsonValidationError(jsonOutput, jsonError, "");
  });
  jsonTab.addEventListener("click", () => {
    inspector.classList.remove("active");
    jsonPanel.classList.add("active");
    inspectorTab.classList.remove("active");
    jsonTab.classList.add("active");
    syncJsonOutput(jsonOutput, state);
    syncJsonLineNumbers(jsonOutput);
    setJsonValidationError(jsonOutput, jsonError, "", null);
  });
  formatJsonButton.addEventListener("click", () => {
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
    const hasApplied = rebuildStateFromJsonText(
      inspector,
      jsonOutput,
      jsonError,
      state,
      jsonOutput.value,
      renderInspector,
      clearTypeHints
    );
    if (!hasApplied) return;
    if (shouldDeferHistoryCommit(document.activeElement)) {
      markHistoryDeferred();
      return;
    }
    commitHistory();
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
    if (syncTimer) {
      window.clearTimeout(syncTimer);
    }
    syncTimer = window.setTimeout(() => {
      const hasApplied = rebuildStateFromJsonText(
        inspector,
        jsonOutput,
        jsonError,
        state,
        jsonOutput.value,
        renderInspector,
        clearTypeHints
      );
      if (hasApplied && shouldDeferHistoryCommit(document.activeElement)) {
        markHistoryDeferred();
        return;
      }
      if (hasApplied) {
        commitHistory();
      }
    }, 220);
  });
  jsonOutput.addEventListener("scroll", () => {
    const lineNumbers = jsonOutput._lineNumbers;
    if (!lineNumbers) return;
    lineNumbers.scrollTop = jsonOutput.scrollTop;
  });
  window.setInterval(() => {
    if (!jsonPanel.classList.contains("active")) return;
    if (document.activeElement === jsonOutput) return;
    syncJsonOutput(jsonOutput, state);
    syncJsonLineNumbers(jsonOutput);
  }, 200);
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
    if (errorLine === i) {
      row.classList.add("error");
    }
    row.textContent = String(i);
    lineNumbers.appendChild(row);
  }
  lineNumbers.scrollTop = jsonOutput.scrollTop;
}

function rebuildStateFromJsonText(
  inspector: HTMLElement,
  jsonOutput: JsonTextAreaWithMeta,
  jsonError: HTMLDivElement,
  state: JsonEditorState,
  rawJsonText: string,
  renderInspector: (inspector: HTMLElement, state: JsonEditorState) => void,
  clearTypeHints: () => void
): boolean {
  try {
    const nextJson = JSON.parse(rawJsonText) as JsonEditorState["json"];
    state.json = nextJson;
    state.jsonBinding.parent = state as unknown as Record<string | number, unknown>;
    clearTypeHints();
    renderInspector(inspector, state);
    setJsonValidationError(jsonOutput, jsonError, "", null);
    return true;
  } catch (err) {
    setJsonValidationError(
      jsonOutput,
      jsonError,
      err instanceof Error ? err.message : "Invalid JSON",
      resolveJsonErrorLine(rawJsonText, err)
    );
    return false;
  }
}

export function setJsonValidationError(
  jsonOutput: JsonTextAreaWithMeta,
  jsonError: HTMLDivElement,
  message: string,
  errorLine?: number | null
): void {
  const text = message || "";
  if (text.length) {
    jsonOutput.classList.add("invalid");
    jsonError.textContent = text;
    jsonError.classList.add("active");
    jsonOutput._errorLine = typeof errorLine === "number" && errorLine > 0 ? errorLine : null;
    syncJsonLineNumbers(jsonOutput);
    return;
  }
  jsonOutput.classList.remove("invalid");
  jsonError.textContent = "";
  jsonError.classList.remove("active");
  jsonOutput._errorLine = null;
  syncJsonLineNumbers(jsonOutput);
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

function insertSpacesAtCaret(textarea: HTMLTextAreaElement, spaces: string): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = textarea.value;
  textarea.value = `${current.slice(0, start)}${spaces}${current.slice(end)}`;
  const nextCursor = start + spaces.length;
  textarea.selectionStart = nextCursor;
  textarea.selectionEnd = nextCursor;
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
