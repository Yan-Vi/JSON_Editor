function main() {
    let state =
    {
        json: 
        {
            "text": "text",
            "color": "#b3ff8a",
            "int": 16,
            "float": 16.5,
            "boolean": true,
            "array": [
                1,
                2,
                3
            ],
            "object": {
                "firstName": "John",
                "secondName": "Wick",
                "age": 52,     
                "coordinates": {
                    "x": 50.44,
                    "y": 30.45
                },
                "favoriteColor": "#ff4242",
                "photo": "https://i.guim.co.uk/img/static/sys-images/Guardian/Pix/pictures/2015/4/8/1428509813867/john-wick-review-keanu-009.jpg?width=465&dpr=1&s=none&crop=none"
            }
        },
        jsonBinding: { path: "$", parent: null, key: "json" },
        history: null
    };
    state.jsonBinding.parent = state;
    ensureHistory(state);
    var pendingHistoryCommit = false;

    const editor = document.querySelector(".editor");
    const dragHandle = document.createElement("div");
    const tabs = document.createElement("div");
    const inspectorTab = document.createElement("button");
    const jsonTab = document.createElement("button");
    const inspector = document.createElement("div");
    const jsonTabElements = createJsonTabElements();
    const jsonPanel = jsonTabElements.panel;
    const jsonOutput = jsonTabElements.output;
    const jsonError = jsonTabElements.error;
    const formatJsonButton = jsonTabElements.formatButton;
    dragHandle.classList.add("drag-handle");
    dragHandle.textContent = "json editor";
    tabs.classList.add("editor-tabs");
    inspectorTab.type = "button";
    jsonTab.type = "button";
    inspectorTab.classList.add("editor-tab", "active");
    jsonTab.classList.add("editor-tab");
    inspectorTab.textContent = "inspector";
    jsonTab.textContent = "json";
    inspector.classList.add("inspector", "editor-panel", "active");
    tabs.appendChild(inspectorTab);
    tabs.appendChild(jsonTab);
    editor.appendChild(dragHandle);
    editor.appendChild(tabs);
    editor.appendChild(inspector);
    editor.appendChild(jsonPanel);
    enableEditorDragging(editor, dragHandle);
    placeEditorInCenter(editor);
    renderInspector(inspector, state);
    window.onInspectorMutation = function () {
        if (shouldDeferHistoryCommit(document.activeElement)) {
            pendingHistoryCommit = true;
            return;
        }
        recordHistoryChange(state);
        if (jsonPanel.classList.contains("active") && document.activeElement !== jsonOutput) {
            syncJsonOutput(jsonOutput, state);
        }
    };
    window.requestInspectorRefresh = function () {
        var foldoutStates = captureFoldoutStates(inspector);
        renderInspector(inspector, state);
        applyFoldoutStates(inspector, foldoutStates);
        if (jsonPanel.classList.contains("active") && document.activeElement !== jsonOutput) {
            syncJsonOutput(jsonOutput, state);
        }
    };
    document.addEventListener("focusout", function () {
        if (!pendingHistoryCommit) return;
        window.setTimeout(function () {
            if (shouldDeferHistoryCommit(document.activeElement)) return;
            pendingHistoryCommit = false;
            recordHistoryChange(state);
        }, 0);
    });
    registerHistoryShortcuts(document, function () {
        if (!undoHistory(state)) return;
        var foldoutStates = captureFoldoutStates(inspector);
        renderInspector(inspector, state);
        applyFoldoutStates(inspector, foldoutStates);
        syncJsonOutput(jsonOutput, state);
        setJsonValidationError(jsonOutput, jsonError, "");
    }, function () {
        if (!redoHistory(state)) return;
        var foldoutStates = captureFoldoutStates(inspector);
        renderInspector(inspector, state);
        applyFoldoutStates(inspector, foldoutStates);
        syncJsonOutput(jsonOutput, state);
        setJsonValidationError(jsonOutput, jsonError, "");
    });
    setupJsonTextTab({
        inspector: inspector,
        inspectorTab: inspectorTab,
        jsonTab: jsonTab,
        jsonPanel: jsonPanel,
        jsonOutput: jsonOutput,
        jsonError: jsonError,
        formatJsonButton: formatJsonButton,
        state: state,
        shouldDeferHistoryCommit: shouldDeferHistoryCommit,
        markHistoryDeferred: function () {
            pendingHistoryCommit = true;
        },
        commitHistory: function () {
            recordHistoryChange(state);
        },
        syncJsonOutput: syncJsonOutput,
        renderInspector: renderInspector
    });
}

function renderInspector(inspector, state) {
    inspector.innerHTML = "";
    DrawObject(inspector, "json", state.json, undefined, state.jsonBinding);
}

function syncJsonOutput(jsonOutput, state) {
    jsonOutput.value = JSON.stringify(state.json, null, 2);
    if (typeof syncJsonLineNumbers === "function") {
        syncJsonLineNumbers(jsonOutput);
    }
}

function ensureHistory(state) {
    if (state.history) return state.history;
    var initialTypeHints = typeof exportTypeHintsSnapshot === "function" ? exportTypeHintsSnapshot() : {};
    state.history = {
        undoStack: [],
        redoStack: [],
        committed: {
            json: deepClone(state.json),
            typeHints: deepClone(initialTypeHints)
        },
        isApplying: false,
        maxEntries: 400
    };
    return state.history;
}

function recordHistoryChange(state) {
    var history = ensureHistory(state);
    if (history.isApplying) return;
    var nextTypeHints = typeof exportTypeHintsSnapshot === "function" ? exportTypeHintsSnapshot() : {};
    var jsonOps = [];
    var typeHintOps = [];
    collectDiffOps(history.committed.json, state.json, [], jsonOps);
    collectDiffOps(history.committed.typeHints, nextTypeHints, [], typeHintOps);
    if (jsonOps.length === 0 && typeHintOps.length === 0) return;
    var historyEntry = {
        forward: {
            jsonOps: jsonOps,
            typeHintOps: typeHintOps
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

function undoHistory(state) {
    var history = ensureHistory(state);
    if (history.undoStack.length === 0) return false;
    var historyEntry = history.undoStack.pop();
    history.isApplying = true;
    state.json = applyOpsToValue(state.json, historyEntry.backward.jsonOps);
    var currentTypeHints = typeof exportTypeHintsSnapshot === "function" ? exportTypeHintsSnapshot() : {};
    var nextTypeHints = applyOpsToValue(currentTypeHints, historyEntry.backward.typeHintOps);
    if (typeof importTypeHintsSnapshot === "function") {
        importTypeHintsSnapshot(nextTypeHints);
    }
    state.jsonBinding.parent = state;
    history.isApplying = false;
    history.redoStack.push(historyEntry);
    history.committed = {
        json: deepClone(state.json),
        typeHints: deepClone(nextTypeHints)
    };
    return true;
}

function redoHistory(state) {
    var history = ensureHistory(state);
    if (history.redoStack.length === 0) return false;
    var historyEntry = history.redoStack.pop();
    history.isApplying = true;
    state.json = applyOpsToValue(state.json, historyEntry.forward.jsonOps);
    var currentTypeHints = typeof exportTypeHintsSnapshot === "function" ? exportTypeHintsSnapshot() : {};
    var nextTypeHints = applyOpsToValue(currentTypeHints, historyEntry.forward.typeHintOps);
    if (typeof importTypeHintsSnapshot === "function") {
        importTypeHintsSnapshot(nextTypeHints);
    }
    state.jsonBinding.parent = state;
    history.isApplying = false;
    history.undoStack.push(historyEntry);
    history.committed = {
        json: deepClone(state.json),
        typeHints: deepClone(nextTypeHints)
    };
    return true;
}

function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function isObjectValue(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createSetOp(path, value, hadValue, oldValue) {
    return {
        type: "set",
        path: path.slice(),
        value: deepClone(value),
        hadValue: !!hadValue,
        oldValue: hadValue ? deepClone(oldValue) : undefined
    };
}

function createRemoveOp(path, oldValue) {
    return {
        type: "remove",
        path: path.slice(),
        oldValue: deepClone(oldValue)
    };
}

function collectDiffOps(prevValue, nextValue, path, ops) {
    if (Array.isArray(prevValue) || Array.isArray(nextValue)) {
        if (!Array.isArray(prevValue) || !Array.isArray(nextValue) || JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
            ops.push(createSetOp(path, nextValue, true, prevValue));
        }
        return;
    }
    if (isObjectValue(prevValue) && isObjectValue(nextValue)) {
        var prevKeys = Object.keys(prevValue);
        var nextKeys = Object.keys(nextValue);
        var sameKeyCount = prevKeys.length === nextKeys.length;
        var sameKeyOrder = sameKeyCount && prevKeys.every(function (key, index) {
            return key === nextKeys[index];
        });
        if (!sameKeyOrder) {
            ops.push(createSetOp(path, nextValue, true, prevValue));
            return;
        }
        Object.keys(prevValue).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(nextValue, key)) return;
            ops.push(createRemoveOp(path.concat(key), prevValue[key]));
        });
        Object.keys(nextValue).forEach(function (key) {
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

function invertOps(ops) {
    var inverse = [];
    for (var i = ops.length - 1; i >= 0; i--) {
        var op = ops[i];
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

function applyOpsToValue(rootValue, ops) {
    var holder = { root: rootValue };
    ops.forEach(function (op) {
        if (op.type === "set") {
            setPathValue(holder, "root", op.path, op.value);
            return;
        }
        if (op.type === "remove") {
            removePathValue(holder, "root", op.path);
        }
    });
    return holder.root;
}

function setPathValue(holder, rootKey, path, value) {
    if (path.length === 0) {
        holder[rootKey] = deepClone(value);
        return;
    }
    var node = holder[rootKey];
    if (node === undefined || node === null || typeof node !== "object") {
        node = typeof path[0] === "number" ? [] : {};
        holder[rootKey] = node;
    }
    for (var i = 0; i < path.length - 1; i++) {
        var key = path[i];
        var nextKey = path[i + 1];
        if (node[key] === undefined || node[key] === null || typeof node[key] !== "object") {
            node[key] = typeof nextKey === "number" ? [] : {};
        }
        node = node[key];
    }
    node[path[path.length - 1]] = deepClone(value);
}

function removePathValue(holder, rootKey, path) {
    if (path.length === 0) return;
    var node = holder[rootKey];
    if (node === undefined || node === null || typeof node !== "object") return;
    for (var i = 0; i < path.length - 1; i++) {
        var key = path[i];
        if (node[key] === undefined || node[key] === null || typeof node[key] !== "object") return;
        node = node[key];
    }
    var lastKey = path[path.length - 1];
    if (Array.isArray(node) && typeof lastKey === "number") {
        node.splice(lastKey, 1);
        return;
    }
    delete node[lastKey];
}

function shouldDeferHistoryCommit(activeElement) {
    if (!activeElement) return false;
    if (activeElement.tagName === "TEXTAREA") return true;
    if (activeElement.tagName !== "INPUT") return false;
    return String(activeElement.type || "").toLowerCase() === "text";
}

function captureFoldoutStates(inspector) {
    var stateByPath = {};
    inspector.querySelectorAll(".foldout-frame[data-binding-path]").forEach(function (frame) {
        var path = frame.getAttribute("data-binding-path");
        if (!path) return;
        stateByPath[path] = frame.classList.contains("collapsed");
    });
    return stateByPath;
}

function applyFoldoutStates(inspector, stateByPath) {
    if (!stateByPath) return;
    inspector.querySelectorAll(".foldout-frame[data-binding-path]").forEach(function (frame) {
        var path = frame.getAttribute("data-binding-path");
        if (!path || !Object.prototype.hasOwnProperty.call(stateByPath, path)) return;
        var shouldBeCollapsed = !!stateByPath[path];
        var valueEl = frame.querySelector(".object-value, .array-value");
        var toggleEl = frame.querySelector(".foldout-toggle");
        if (shouldBeCollapsed) {
            frame.classList.add("collapsed");
            if (valueEl) valueEl.hidden = true;
            if (toggleEl) toggleEl.textContent = "▸";
            return;
        }
        frame.classList.remove("collapsed");
        if (valueEl) valueEl.hidden = false;
        if (toggleEl) toggleEl.textContent = "▾";
    });
}

function registerHistoryShortcuts(target, onUndo, onRedo) {
    target.addEventListener("keydown", function (event) {
        if (event.altKey) return;
        var active = document.activeElement;
        var isTypingTarget = !!active && (
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable
        );
        if (isTypingTarget) return;
        var key = String(event.key || "").toLowerCase();
        var hasPrimaryModifier = event.metaKey || event.ctrlKey;
        if (!hasPrimaryModifier) return;
        var isUndo = key === "z" && !event.shiftKey;
        var isRedo = (key === "z" && event.shiftKey) || (!event.metaKey && key === "y");
        if (!isUndo && !isRedo) return;
        event.preventDefault();
        if (isUndo) {
            onUndo();
            return;
        }
        onRedo();
    });
}

function placeEditorInCenter(editor) {
    var rect = editor.getBoundingClientRect();
    var left = Math.max(12, Math.round((window.innerWidth - rect.width) / 2));
    var top = Math.max(12, Math.round((window.innerHeight - rect.height) / 2));
    editor.style.left = left + "px";
    editor.style.top = top + "px";
}

function enableEditorDragging(editor, dragHandle) {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var originLeft = 0;
    var originTop = 0;

    dragHandle.addEventListener("mousedown", function (event) {
        if (event.button !== 0) return;
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        originLeft = editor.offsetLeft;
        originTop = editor.offsetTop;
        document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", function (event) {
        if (!dragging) return;
        var nextLeft = originLeft + event.clientX - startX;
        var nextTop = originTop + event.clientY - startY;
        var maxLeft = Math.max(12, window.innerWidth - editor.offsetWidth - 12);
        var maxTop = Math.max(12, window.innerHeight - editor.offsetHeight - 12);
        editor.style.left = Math.min(Math.max(12, nextLeft), maxLeft) + "px";
        editor.style.top = Math.min(Math.max(12, nextTop), maxTop) + "px";
    });

    window.addEventListener("mouseup", function () {
        dragging = false;
        document.body.style.userSelect = "";
    });
}

document.addEventListener("DOMContentLoaded", main);
