import type { DrawerFrameRefs, DrawerType, JsonBinding } from "../../../../core/types";
import type { DrawerRuntimeApi } from "../contracts";

export interface StandardFrameOptions {
  valueClass: string;
  drawerType: DrawerType;
  sourceValue: unknown;
}

export function deleteAndRemove(
  api: DrawerRuntimeApi,
  container: HTMLElement,
  frame: HTMLDivElement,
  binding?: JsonBinding
): void {
  api.deleteBoundValue(binding);
  container.removeChild(frame);
}

export function createStandardFrame(
  api: DrawerRuntimeApi,
  container: HTMLElement,
  label: string,
  beforeNode: Node | undefined,
  binding: JsonBinding | undefined,
  options: StandardFrameOptions
): DrawerFrameRefs {
  let refs: DrawerFrameRefs;
  refs = api.createDrawerFrame(
    container,
    label,
    options.valueClass,
    options.drawerType,
    (nextType) => api.replaceDrawer(container, refs.frame, label, nextType, options.sourceValue, binding),
    () => deleteAndRemove(api, container, refs.frame, binding),
    beforeNode,
    binding
  );
  return refs;
}
