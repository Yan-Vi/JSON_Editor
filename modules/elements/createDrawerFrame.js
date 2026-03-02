var activeDragFrame = null;
var activeDragParent = null;
var foldoutStateByPath = typeof foldoutStateByPath !== "undefined" && foldoutStateByPath ? foldoutStateByPath : {};

function reorderBoundCollectionFromDom(parentEl) {
    var frames = Array.prototype.filter.call(parentEl.children, function (node) {
        return node && node.classList && node.classList.contains("frame");
    });
    if (frames.length < 2) return false;
    var bindings = frames.map(function (frame) {
        return frame._bindingRef;
    });
    var firstBinding = bindings[0];
    if (!firstBinding || !firstBinding.parent) return false;
    var parentValue = firstBinding.parent;
    if (Array.isArray(parentValue)) {
        var nextOrder = [];
        var validArrayOrder = true;
        bindings.forEach(function (binding) {
            if (!binding || typeof binding.key !== "number") {
                validArrayOrder = false;
                return;
            }
            if (binding.key < 0 || binding.key >= parentValue.length) {
                validArrayOrder = false;
                return;
            }
            nextOrder.push(parentValue[binding.key]);
        });
        if (!validArrayOrder || nextOrder.length !== parentValue.length) return false;
        var arrayChanged = nextOrder.some(function (entry, index) {
            return entry !== parentValue[index];
        });
        if (!arrayChanged) return false;
        parentValue.length = 0;
        nextOrder.forEach(function (entry) {
            parentValue.push(entry);
        });
        return true;
    }
    if (!parentValue || typeof parentValue !== "object") return false;
    var oldKeys = Object.keys(parentValue);
    if (!oldKeys.length) return false;
    var seen = {};
    var orderedKeys = [];
    bindings.forEach(function (binding) {
        if (!binding || typeof binding.key !== "string") return;
        if (!Object.prototype.hasOwnProperty.call(parentValue, binding.key)) return;
        if (seen[binding.key]) return;
        seen[binding.key] = true;
        orderedKeys.push(binding.key);
    });
    oldKeys.forEach(function (key) {
        if (seen[key]) return;
        orderedKeys.push(key);
    });
    if (orderedKeys.length !== oldKeys.length) return false;
    var objectChanged = orderedKeys.some(function (key, index) {
        return key !== oldKeys[index];
    });
    if (!objectChanged) return false;
    var nextObject = {};
    orderedKeys.forEach(function (key) {
        nextObject[key] = parentValue[key];
    });
    oldKeys.forEach(function (key) {
        delete parentValue[key];
    });
    orderedKeys.forEach(function (key) {
        parentValue[key] = nextObject[key];
    });
    return true;
}

function stopReorderDrag() {
    if (!activeDragFrame) return;
    var didReorder = false;
    if (activeDragParent) {
        didReorder = reorderBoundCollectionFromDom(activeDragParent);
    }
    activeDragFrame.classList.remove("is-dragging");
    activeDragFrame = null;
    activeDragParent = null;
    document.body.style.userSelect = "";
    if (!didReorder) return;
    if (typeof notifyMutation === "function") {
        notifyMutation();
    }
    if (typeof window !== "undefined" && typeof window.requestInspectorRefresh === "function") {
        window.requestInspectorRefresh();
    }
}

function onReorderDragMove(event) {
    if (!activeDragFrame || !activeDragParent) return;
    var target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    var targetFrame = target.closest(".frame");
    if (!targetFrame || targetFrame === activeDragFrame) return;
    if (targetFrame.parentNode !== activeDragParent) return;
    var rect = targetFrame.getBoundingClientRect();
    var insertBefore = event.clientY < rect.top + rect.height / 2;
    if (insertBefore) {
        if (activeDragFrame !== targetFrame.previousSibling) {
            activeDragParent.insertBefore(activeDragFrame, targetFrame);
        }
    } else {
        if (activeDragFrame !== targetFrame.nextSibling) {
            activeDragParent.insertBefore(activeDragFrame, targetFrame.nextSibling);
        }
    }
}

function createRowDragHandle(frame) {
    var dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.classList.add("row-drag-handle");
    dragHandle.textContent = "⋮⋮";
    dragHandle.addEventListener("mousedown", function (event) {
        if (event.button !== 0) return;
        activeDragFrame = frame;
        activeDragParent = frame.parentNode;
        frame.classList.add("is-dragging");
        document.body.style.userSelect = "none";
        event.preventDefault();
    });
    return dragHandle;
}

function createDrawerFrame(container, label, valueClass, drawerType, onTypeChange, onDelete, beforeNode, binding) {
    var frame = document.createElement("div");
    var dragHandle = createRowDragHandle(frame);
    var labelEl = document.createElement("input");
    var deleteButton = createDeleteButton(container, label, onDelete);
    var typeSelect = createTypeSelector(drawerType, onTypeChange);
    var isFoldout = valueClass === "object-value" || valueClass === "array-value";
    labelEl.type = "text";
    labelEl.classList.add("label");
    var valueEl = isFoldout
        ? document.createElement("div")
        : document.createElement("input");
    valueEl.classList.add(valueClass);
    if (valueEl instanceof HTMLInputElement) {
        valueEl.type = "text";
    }
    frame.classList.add("frame");
    frame._bindingRef = binding || null;
    if (isFoldout) {
        frame.classList.add("foldout-frame");
        if (binding && binding.path) {
            frame.setAttribute("data-binding-path", binding.path);
        }
    }
    if (beforeNode) {
        container.insertBefore(frame, beforeNode);
    } else {
        container.appendChild(frame);
    }
    if (isFoldout) {
        var headerEl = document.createElement("div");
        var labelTypeGroup = document.createElement("div");
        var headerSpacer = document.createElement("div");
        var toggleEl = document.createElement("button");
        var isRootInspectorDrawer = container.classList.contains("inspector") && label === "json";
        var shouldStartCollapsed = !isRootInspectorDrawer;
        var bindingPath = binding && binding.path ? binding.path : null;
        if (bindingPath && Object.prototype.hasOwnProperty.call(foldoutStateByPath, bindingPath)) {
            shouldStartCollapsed = !!foldoutStateByPath[bindingPath];
        }
        headerEl.classList.add("foldout-header");
        labelTypeGroup.classList.add("foldout-label-type-group");
        headerSpacer.classList.add("foldout-header-spacer");
        toggleEl.type = "button";
        toggleEl.classList.add("foldout-toggle");
        toggleEl.textContent = shouldStartCollapsed ? "▸" : "▾";
        toggleEl.addEventListener("click", function () {
            var isCollapsed = frame.classList.toggle("collapsed");
            valueEl.hidden = isCollapsed;
            toggleEl.textContent = isCollapsed ? "▸" : "▾";
            if (bindingPath) {
                foldoutStateByPath[bindingPath] = isCollapsed;
            }
        });
        frame.appendChild(headerEl);
        headerEl.appendChild(dragHandle);
        headerEl.appendChild(toggleEl);
        labelTypeGroup.appendChild(labelEl);
        labelTypeGroup.appendChild(typeSelect);
        headerEl.appendChild(labelTypeGroup);
        headerEl.appendChild(headerSpacer);
        headerEl.appendChild(deleteButton);
        frame.appendChild(valueEl);
        if (shouldStartCollapsed) {
            frame.classList.add("collapsed");
            valueEl.hidden = true;
        }
        if (bindingPath) {
            foldoutStateByPath[bindingPath] = shouldStartCollapsed;
        }
    } else {
        var inlineSpacer = document.createElement("div");
        inlineSpacer.classList.add("frame-inline-spacer");
        frame.appendChild(dragHandle);
        frame.appendChild(labelEl);
        frame.appendChild(typeSelect);
        frame.appendChild(valueEl);
        if (valueClass === "boolean-value") {
            frame.appendChild(inlineSpacer);
        }
        frame.appendChild(deleteButton);
    }
    labelEl.value = label;
    setLabelVisibility(labelEl, label);
    return { frame: frame, label: labelEl, value: valueEl };
}

window.addEventListener("mousemove", onReorderDragMove);
window.addEventListener("mouseup", stopReorderDrag);
