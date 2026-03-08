import type { DrawerFrameRefs, DrawerType, JsonBinding, MutationCallbacks } from "../../core/types";

let activeDragFrame: HTMLDivElement | null = null;
let activeDragParent: HTMLElement | null = null;
const foldoutStateByPath: Record<string, boolean> = {};
const frameBindingMap = new WeakMap<HTMLDivElement, JsonBinding | undefined>();

function setLabelVisibility(labelEl: HTMLInputElement, label: string): void {
  labelEl.style.display = label === "" ? "none" : "";
}

function createDeleteButton(container: HTMLElement, label: string, onDelete: () => void): HTMLButtonElement {
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.classList.add("delete-entry-button");
  deleteButton.textContent = "×";
  if (container.classList.contains("inspector") && label === "json") {
    deleteButton.style.display = "none";
  }
  deleteButton.addEventListener("click", onDelete);
  return deleteButton;
}

function createTypeSelector(
  drawerType: DrawerType,
  drawerTypeList: DrawerType[],
  onTypeChange: (nextType: DrawerType) => void
): HTMLSelectElement {
  const typeSelect = document.createElement("select");
  typeSelect.classList.add("drawer-type-select");
  typeSelect.innerHTML = drawerTypeList
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("");
  typeSelect.value = drawerType;
  typeSelect.addEventListener("change", () => {
    onTypeChange(typeSelect.value as DrawerType);
  });
  return typeSelect;
}

export function createAddEntryButton(onAddEntry: () => void): HTMLDivElement {
  const row = document.createElement("div");
  const addButton = document.createElement("button");
  row.classList.add("add-entry-row");
  addButton.type = "button";
  addButton.classList.add("add-entry-button");
  addButton.textContent = "+";
  addButton.addEventListener("click", onAddEntry);
  row.appendChild(addButton);
  return row;
}

function reorderBoundCollectionFromDom(parentEl: HTMLElement): boolean {
  const frames = Array.from(parentEl.children).filter(
    (node): node is HTMLDivElement => node instanceof HTMLDivElement && node.classList.contains("frame")
  );
  if (frames.length < 2) return false;
  const bindings = frames.map((frame) => frameBindingMap.get(frame));
  const firstBinding = bindings[0];
  if (!firstBinding?.parent) return false;
  const parentValue = firstBinding.parent;
  if (Array.isArray(parentValue)) {
    const nextOrder: unknown[] = [];
    let validArrayOrder = true;
    bindings.forEach((binding) => {
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
    const arrayChanged = nextOrder.some((entry, index) => entry !== parentValue[index]);
    if (!arrayChanged) return false;
    parentValue.length = 0;
    nextOrder.forEach((entry) => {
      parentValue.push(entry);
    });
    return true;
  }
  if (!parentValue || typeof parentValue !== "object") return false;
  const objectValue = parentValue as Record<string, unknown>;
  const oldKeys = Object.keys(objectValue);
  if (!oldKeys.length) return false;
  const seen: Record<string, boolean> = {};
  const orderedKeys: string[] = [];
  bindings.forEach((binding) => {
    if (!binding || typeof binding.key !== "string") return;
    if (!Object.prototype.hasOwnProperty.call(objectValue, binding.key)) return;
    if (seen[binding.key]) return;
    seen[binding.key] = true;
    orderedKeys.push(binding.key);
  });
  oldKeys.forEach((key) => {
    if (seen[key]) return;
    orderedKeys.push(key);
  });
  if (orderedKeys.length !== oldKeys.length) return false;
  const objectChanged = orderedKeys.some((key, index) => key !== oldKeys[index]);
  if (!objectChanged) return false;
  const nextObject: Record<string, unknown> = {};
  orderedKeys.forEach((key) => {
    nextObject[key] = objectValue[key];
  });
  oldKeys.forEach((key) => {
    delete objectValue[key];
  });
  orderedKeys.forEach((key) => {
    objectValue[key] = nextObject[key];
  });
  return true;
}

function stopReorderDrag(callbacks: MutationCallbacks): void {
  if (!activeDragFrame) return;
  let didReorder = false;
  if (activeDragParent) {
    didReorder = reorderBoundCollectionFromDom(activeDragParent);
  }
  activeDragFrame.classList.remove("is-dragging");
  activeDragFrame = null;
  activeDragParent = null;
  document.body.style.userSelect = "";
  if (!didReorder) return;
  callbacks.onMutation();
  callbacks.onRefresh();
}

function onReorderDragMove(event: MouseEvent): void {
  if (!activeDragFrame || !activeDragParent) return;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (!target) return;
  const targetFrame = target instanceof Element ? target.closest(".frame") : null;
  if (!(targetFrame instanceof HTMLDivElement) || targetFrame === activeDragFrame) return;
  if (targetFrame.parentNode !== activeDragParent) return;
  const rect = targetFrame.getBoundingClientRect();
  const insertBefore = event.clientY < rect.top + rect.height / 2;
  if (insertBefore) {
    if (activeDragFrame !== targetFrame.previousSibling) {
      activeDragParent.insertBefore(activeDragFrame, targetFrame);
    }
    return;
  }
  if (activeDragFrame !== targetFrame.nextSibling) {
    activeDragParent.insertBefore(activeDragFrame, targetFrame.nextSibling);
  }
}

function createRowDragHandle(frame: HTMLDivElement): HTMLButtonElement {
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.classList.add("row-drag-handle");
  dragHandle.textContent = "⋮⋮";
  dragHandle.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    activeDragFrame = frame;
    activeDragParent = frame.parentNode instanceof HTMLElement ? frame.parentNode : null;
    frame.classList.add("is-dragging");
    document.body.style.userSelect = "none";
    event.preventDefault();
  });
  return dragHandle;
}

export function createDrawerFrameFactory(callbacks: MutationCallbacks, drawerTypeList: DrawerType[]) {
  window.addEventListener("mousemove", onReorderDragMove);
  window.addEventListener("mouseup", () => stopReorderDrag(callbacks));

  return (
    container: HTMLElement,
    label: string,
    valueClass: string,
    drawerType: DrawerType,
    onTypeChange: (nextType: DrawerType) => void,
    onDelete: () => void,
    beforeNode?: Node,
    binding?: JsonBinding
  ): DrawerFrameRefs => {
    const frame = document.createElement("div");
    const dragHandle = createRowDragHandle(frame);
    const labelEl = document.createElement("input");
    const deleteButton = createDeleteButton(container, label, onDelete);
    const typeSelect = createTypeSelector(drawerType, drawerTypeList, onTypeChange);
    const isFoldout = valueClass === "object-value" || valueClass === "array-value";
    labelEl.type = "text";
    labelEl.classList.add("label");
    const valueEl = isFoldout ? document.createElement("div") : document.createElement("input");
    valueEl.classList.add(valueClass);
    if (valueEl instanceof HTMLInputElement) {
      valueEl.type = "text";
    }
    frame.classList.add("frame");
    frameBindingMap.set(frame, binding);
    if (isFoldout) {
      frame.classList.add("foldout-frame");
      if (binding?.path) {
        frame.setAttribute("data-binding-path", binding.path);
      }
    }
    if (beforeNode) {
      container.insertBefore(frame, beforeNode);
    } else {
      container.appendChild(frame);
    }
    if (isFoldout) {
      const headerEl = document.createElement("div");
      const labelTypeGroup = document.createElement("div");
      const headerSpacer = document.createElement("div");
      const toggleEl = document.createElement("button");
      const isRootInspectorDrawer = container.classList.contains("inspector") && label === "json";
      let shouldStartCollapsed = !isRootInspectorDrawer;
      const bindingPath = binding?.path ?? null;
      if (bindingPath && Object.prototype.hasOwnProperty.call(foldoutStateByPath, bindingPath)) {
        shouldStartCollapsed = Boolean(foldoutStateByPath[bindingPath]);
      }
      headerEl.classList.add("foldout-header");
      labelTypeGroup.classList.add("foldout-label-type-group");
      headerSpacer.classList.add("foldout-header-spacer");
      toggleEl.type = "button";
      toggleEl.classList.add("foldout-toggle");
      toggleEl.textContent = shouldStartCollapsed ? "▸" : "▾";
      toggleEl.addEventListener("click", () => {
        const isCollapsed = frame.classList.toggle("collapsed");
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
      const inlineSpacer = document.createElement("div");
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
    return { frame, label: labelEl, value: valueEl };
  };
}
