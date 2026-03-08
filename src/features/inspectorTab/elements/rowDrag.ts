import type { JsonBinding, MutationCallbacks } from "../../../core/types";

let activeDragFrame: HTMLDivElement | null = null;
let activeDragParent: HTMLElement | null = null;
const frameBindingMap = new WeakMap<HTMLDivElement, JsonBinding | undefined>();

export function setFrameBinding(frame: HTMLDivElement, binding: JsonBinding | undefined): void {
  frameBindingMap.set(frame, binding);
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

export function createRowDragHandle(frame: HTMLDivElement): HTMLButtonElement {
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

export function setupRowDragListeners(callbacks: MutationCallbacks): void {
  window.addEventListener("mousemove", onReorderDragMove);
  window.addEventListener("mouseup", () => stopReorderDrag(callbacks));
}
