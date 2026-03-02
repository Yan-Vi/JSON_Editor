function setupJsonTextTab(config) {
    var inspector = config.inspector;
    var inspectorTab = config.inspectorTab;
    var jsonTab = config.jsonTab;
    var jsonPanel = config.jsonPanel;
    var jsonOutput = config.jsonOutput;
    var jsonError = config.jsonError;
    var formatJsonButton = config.formatJsonButton;
    var state = config.state;
    var shouldDeferHistoryCommit = config.shouldDeferHistoryCommit;
    var markHistoryDeferred = config.markHistoryDeferred;
    var commitHistory = config.commitHistory;
    var syncJsonOutput = config.syncJsonOutput;
    var renderInspector = config.renderInspector;
    var syncTimer = null;
    syncJsonLineNumbers(jsonOutput);

    inspectorTab.addEventListener("click", function () {
        inspector.classList.add("active");
        jsonPanel.classList.remove("active");
        inspectorTab.classList.add("active");
        jsonTab.classList.remove("active");
        setJsonValidationError(jsonOutput, jsonError, "");
    });
    jsonTab.addEventListener("click", function () {
        inspector.classList.remove("active");
        jsonPanel.classList.add("active");
        inspectorTab.classList.remove("active");
        jsonTab.classList.add("active");
        syncJsonOutput(jsonOutput, state);
        syncJsonLineNumbers(jsonOutput);
        setJsonValidationError(jsonOutput, jsonError, "", null);
    });
    formatJsonButton.addEventListener("click", function () {
        var formatted = formatJsonString(jsonOutput.value);
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
        var hasApplied = rebuildStateFromJsonText(inspector, jsonOutput, jsonError, state, jsonOutput.value, renderInspector);
        if (!hasApplied) return;
        if (shouldDeferHistoryCommit(document.activeElement)) {
            markHistoryDeferred();
            return;
        }
        commitHistory();
    });
    jsonOutput.addEventListener("keydown", function (event) {
        if (event.key !== "Tab") return;
        event.preventDefault();
        insertSpacesAtCaret(jsonOutput, "  ");
        jsonOutput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    jsonOutput.addEventListener("input", function () {
        syncJsonLineNumbers(jsonOutput);
        setJsonValidationError(jsonOutput, jsonError, "", null);
        if (syncTimer) {
            window.clearTimeout(syncTimer);
        }
        syncTimer = window.setTimeout(function () {
            var hasApplied = rebuildStateFromJsonText(inspector, jsonOutput, jsonError, state, jsonOutput.value, renderInspector);
            if (hasApplied && shouldDeferHistoryCommit(document.activeElement)) {
                markHistoryDeferred();
                return;
            }
            if (hasApplied) {
                commitHistory();
            }
        }, 220);
    });
    jsonOutput.addEventListener("scroll", function () {
        var lineNumbers = jsonOutput._lineNumbers;
        if (!lineNumbers) return;
        lineNumbers.scrollTop = jsonOutput.scrollTop;
    });
    window.setInterval(function () {
        if (!jsonPanel.classList.contains("active")) return;
        if (document.activeElement === jsonOutput) return;
        syncJsonOutput(jsonOutput, state);
        syncJsonLineNumbers(jsonOutput);
    }, 200);
}

function syncJsonLineNumbers(jsonOutput) {
    var lineNumbers = jsonOutput && jsonOutput._lineNumbers;
    if (!lineNumbers) return;
    var value = jsonOutput.value || "";
    var lineCount = value.length ? value.split("\n").length : 1;
    var errorLine = jsonOutput._errorLine;
    lineNumbers.innerHTML = "";
    for (var i = 1; i <= lineCount; i++) {
        var row = document.createElement("div");
        row.classList.add("json-line-number");
        if (errorLine === i) {
            row.classList.add("error");
        }
        row.textContent = String(i);
        lineNumbers.appendChild(row);
    }
    lineNumbers.scrollTop = jsonOutput.scrollTop;
}

function rebuildStateFromJsonText(inspector, jsonOutput, jsonError, state, rawJsonText, renderInspector) {
    try {
        var nextJson = JSON.parse(rawJsonText);
        state.json = nextJson;
        state.jsonBinding.parent = state;
        if (typeof importTypeHintsSnapshot === "function") {
            importTypeHintsSnapshot({});
        }
        renderInspector(inspector, state);
        setJsonValidationError(jsonOutput, jsonError, "", null);
        return true;
    } catch (err) {
        setJsonValidationError(
            jsonOutput,
            jsonError,
            err && err.message ? err.message : "Invalid JSON",
            resolveJsonErrorLine(rawJsonText, err)
        );
        return false;
    }
}

function setJsonValidationError(jsonOutput, jsonError, message, errorLine) {
    var text = message || "";
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

function formatJsonString(rawText) {
    try {
        var parsed = JSON.parse(rawText);
        return { ok: true, value: JSON.stringify(parsed, null, 2) };
    } catch (err) {
        return {
            ok: false,
            errorMessage: err && err.message ? err.message : "Invalid JSON",
            errorObject: err
        };
    }
}

function insertSpacesAtCaret(textarea, spaces) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var current = textarea.value;
    textarea.value = current.slice(0, start) + spaces + current.slice(end);
    var nextCursor = start + spaces.length;
    textarea.selectionStart = nextCursor;
    textarea.selectionEnd = nextCursor;
}

function resolveJsonErrorLine(rawJsonText, errorObject) {
    if (!errorObject || typeof errorObject.message !== "string") return null;
    var message = errorObject.message;
    var lineColumnMatch = message.match(/line\s+([0-9]+)\s+column\s+([0-9]+)/i);
    if (lineColumnMatch) {
        var line = Number(lineColumnMatch[1]);
        return Number.isFinite(line) && line > 0 ? line : null;
    }
    var positionMatch = message.match(/position\s+([0-9]+)/i);
    if (!positionMatch) return null;
    var position = Number(positionMatch[1]);
    if (!Number.isFinite(position) || position < 0) return null;
    return rawJsonText.slice(0, position).split("\n").length;
}
