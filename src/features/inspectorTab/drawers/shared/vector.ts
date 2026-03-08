import type { DrawerType, JsonBinding } from "../../../../core/types";
import { toFiniteNumberOrZero } from "../../../../core/valueUtils";
import type { DrawerPlugin, DrawerRuntimeApi } from "../contracts";
import { createStandardFrame } from "./frame";

export function createVectorPlugin(
  type: DrawerType, 
  axes: string[], 
  matches: (value: unknown) => boolean,
  detectPriority: number
): DrawerPlugin {
  return {
    type,
    detectPriority,
    matches,
    supportsHint: (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    normalize: (value) => {
      const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
      const result: Record<string, number> = {};
      axes.forEach((axis) => {
        result[axis] = toFiniteNumberOrZero(source[axis]);
      });
      return result;
    },
    render: (api, args) => {
      drawVector(api, args.container, args.label, args.value, args.beforeNode, args.binding, type, axes);
    }
  };
}

function drawVector(
  api: DrawerRuntimeApi,
  container: HTMLElement,
  label: string,
  value: unknown,
  beforeNode: Node | undefined,
  binding: JsonBinding | undefined,
  drawerType: DrawerType,
  axes: string[]
): void {
  const refs = createStandardFrame(api, container, label, beforeNode, binding, {
    valueClass: "text-value",
    drawerType,
    sourceValue: value
  });
  const current = api.getBoundValue(binding, value) as Record<string, unknown> | unknown;
  const vector = current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>) : {};
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    axes.forEach((axis) => {
      vector[axis] = 0;
    });
    api.setBoundValue(binding, vector);
  } else {
    axes.forEach((axis) => {
      vector[axis] = toFiniteNumberOrZero(vector[axis]);
    });
  }
  const stack = document.createElement("div");
  stack.classList.add("vector3-stack");
  axes.forEach((axis) => {
    const axisWrap = document.createElement("div");
    const axisKey = document.createElement("span");
    const axisInput = document.createElement("input");
    axisWrap.classList.add("vector3-item");
    axisKey.classList.add("vector3-key");
    axisInput.classList.add("vector3-field");
    axisKey.textContent = axis;
    axisInput.type = "number";
    axisInput.step = "any";
    axisInput.value = String(toFiniteNumberOrZero(vector[axis]));
    axisInput.addEventListener("input", () => {
      vector[axis] = toFiniteNumberOrZero(axisInput.value);
      api.notifyMutation();
    });
    axisWrap.appendChild(axisKey);
    axisWrap.appendChild(axisInput);
    stack.appendChild(axisWrap);
  });
  api.bindLabelInput(refs.label, binding);
  if (refs.value instanceof HTMLElement) {
    refs.frame.replaceChild(stack, refs.value);
  }
}
