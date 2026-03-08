import type { DrawerFrameRefs, DrawerType, JsonBinding, MutationCallbacks } from "../../../core/types";
import { createDeleteButton } from "./deleteButton";
import { createRowDragHandle, setFrameBinding, setupRowDragListeners } from "./rowDrag";
import { createTypeSelector } from "./typeSelector";

const foldoutStateByPath: Record<string, boolean> = {};

function setLabelVisibility(labelEl: HTMLInputElement, label: string): void {
  labelEl.style.display = label === "" ? "none" : "";
}

export function createDrawerFrameFactory(callbacks: MutationCallbacks, drawerTypeList: DrawerType[]) {
  setupRowDragListeners(callbacks);

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
    setFrameBinding(frame, binding);
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
