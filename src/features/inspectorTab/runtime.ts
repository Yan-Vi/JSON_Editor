import type { DrawerCallback, DrawerType, JsonBinding, MutationCallbacks, TypeHintToken } from "../../core/types";
import { createTypeHintsStore } from "../../core/typeHintsStore";
import { createDrawerFrameFactory } from "./elements";
import type { DrawerRuntimeApi } from "./drawers/contracts";
import { createDrawerRegistry } from "./drawers/registry";

function isBound(binding?: JsonBinding): binding is JsonBinding {
  return Boolean(binding && binding.parent && binding.key !== undefined && binding.key !== null);
}

function escapePathKey(key: string | number): string {
  return String(key).replace(/\\/g, "\\\\").replace(/\./g, "\\.");
}

function appendBindingPath(parentPath: string, key: string | number): string {
  if (typeof key === "number") return `${parentPath}[${key}]`;
  return `${parentPath}.${escapePathKey(key)}`;
}

export interface InspectorRuntime {
  drawAny: DrawerCallback;
  drawObjectRoot: DrawerCallback;
  exportTypeHintsSnapshot: () => Record<string, TypeHintToken>;
  importTypeHintsSnapshot: (nextTypeHints: Record<string, TypeHintToken>) => void;
}

export function createInspectorRuntime(callbacks: MutationCallbacks): InspectorRuntime {
  const registry = createDrawerRegistry();
  const typeHintsStore = createTypeHintsStore();
  const createDrawerFrame = createDrawerFrameFactory(callbacks, registry.drawerTypes);

  function getHintedType(binding: JsonBinding | undefined, value: unknown): DrawerType | null {
    if (!binding?.path) return null;
    const hinted = typeHintsStore.hints[binding.path];
    if (!hinted) return null;
    if (!registry.getPluginByType(hinted).supportsHint(value)) return null;
    return hinted;
  }

  function getDrawerType(value: unknown, binding?: JsonBinding): DrawerType {
    const hintedType = getHintedType(binding, value);
    return registry.getDrawerType(value, binding, hintedType);
  }

  function getDrawerByType(type: DrawerType): DrawerCallback {
    return registry.getDrawerByType(type, drawerApi);
  }

  function getDrawer(value: unknown, binding?: JsonBinding): DrawerCallback {
    return getDrawerByType(getDrawerType(value, binding));
  }

  function createChildBinding(
    parentBinding: JsonBinding | undefined,
    parent: Record<string | number, unknown>,
    key: string | number
  ): JsonBinding {
    const parentPath = parentBinding?.path ?? "$";
    return {
      parent,
      key,
      path: appendBindingPath(parentPath, key)
    };
  }

  function notifyMutation(): void {
    callbacks.onMutation();
  }

  function getBoundValue<T>(binding: JsonBinding | undefined, fallbackValue: T): T {
    if (!isBound(binding)) return fallbackValue;
    return binding.parent[binding.key] as T;
  }

  function setBoundValue(binding: JsonBinding | undefined, nextValue: unknown): void {
    if (!isBound(binding)) return;
    if (binding.parent[binding.key] === nextValue) return;
    binding.parent[binding.key] = nextValue;
    notifyMutation();
  }

  function deleteBoundValue(binding: JsonBinding | undefined): void {
    if (!isBound(binding)) return;
    if (!Object.prototype.hasOwnProperty.call(binding.parent, binding.key)) return;
    if (binding.path) typeHintsStore.clearByPrefix(binding.path);
    if (Array.isArray(binding.parent) && typeof binding.key === "number") {
      binding.parent.splice(binding.key, 1);
      if (binding.path) {
        const arrayPath = binding.path.replace(/\[[0-9]+\]$/, "");
        typeHintsStore.clearByPrefix(arrayPath);
      }
      notifyMutation();
      return;
    }
    delete binding.parent[binding.key];
    notifyMutation();
  }

  function renameBoundKey(binding: JsonBinding | undefined, nextKey: string): void {
    if (!isBound(binding)) return;
    if (Array.isArray(binding.parent)) return;
    const trimmedKey = nextKey.trim();
    if (trimmedKey.length === 0) return;
    const oldKey = binding.key;
    if (typeof oldKey !== "string") return;
    if (trimmedKey === oldKey) return;
    if (Object.prototype.hasOwnProperty.call(binding.parent, trimmedKey)) return;
    const oldPath = binding.path;
    binding.parent[trimmedKey] = binding.parent[oldKey];
    delete binding.parent[oldKey];
    binding.key = trimmedKey;
    if (oldPath) {
      const parentPath = oldPath.replace(/\.[^.]+$/, "");
      const nextPath = appendBindingPath(parentPath, trimmedKey);
      typeHintsStore.remapPrefix(oldPath, nextPath);
      binding.path = nextPath;
    }
    notifyMutation();
  }

  function bindLabelInput(labelEl: HTMLInputElement, binding: JsonBinding | undefined): void {
    if (!isBound(binding)) return;
    if (Array.isArray(binding.parent)) return;
    labelEl.addEventListener("change", () => {
      renameBoundKey(binding, labelEl.value);
    });
  }

  function replaceDrawer(
    container: HTMLElement,
    frame: HTMLDivElement,
    label: string,
    targetType: DrawerType,
    sourceValue: unknown,
    binding?: JsonBinding
  ): void {
    const drawer = getDrawerByType(targetType);
    const currentValue = getBoundValue(binding, sourceValue);
    const normalizedValue = registry.getPluginByType(targetType).normalize(currentValue);
    let nextLabel = label;
    if (binding?.parent && !Array.isArray(binding.parent) && typeof binding.key === "string") {
      nextLabel = binding.key;
    }
    setBoundValue(binding, normalizedValue);
    if (binding?.path) typeHintsStore.hints[binding.path] = targetType;
    drawer(container, nextLabel, normalizedValue, frame, binding);
    container.removeChild(frame);
    notifyMutation();
  }

  const drawerApi: DrawerRuntimeApi = {
    createDrawerFrame,
    getDrawer,
    getDrawerByType,
    getDrawerType,
    replaceDrawer,
    createChildBinding,
    notifyMutation,
    getBoundValue,
    setBoundValue,
    deleteBoundValue,
    bindLabelInput
  };

  const drawAny: DrawerCallback = (container, label, value, beforeNode, binding) => {
    getDrawer(value, binding)(container, label, value, beforeNode, binding);
  };
  const drawObjectRoot: DrawerCallback = (container, label, value, beforeNode, binding) => {
    getDrawer(value, binding)(container, label, value, beforeNode, binding);
  };

  return {
    drawAny,
    drawObjectRoot,
    exportTypeHintsSnapshot: typeHintsStore.exportSnapshot,
    importTypeHintsSnapshot: typeHintsStore.importSnapshot
  };
}
