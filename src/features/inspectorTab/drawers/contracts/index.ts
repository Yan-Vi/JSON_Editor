import type { DrawerCallback, DrawerFrameRefs, DrawerType, JsonBinding } from "../../../../core/types";

export interface DrawerRenderArgs {
  container: HTMLElement;
  label: string;
  value: unknown;
  beforeNode?: Node;
  binding?: JsonBinding;
}

export interface DrawerRuntimeApi {
  createDrawerFrame: (
    container: HTMLElement,
    label: string,
    valueClass: string,
    drawerType: DrawerType,
    onTypeChange: (nextType: DrawerType) => void,
    onDelete: () => void,
    beforeNode?: Node,
    binding?: JsonBinding
  ) => DrawerFrameRefs;
  getDrawer: (value: unknown, binding?: JsonBinding) => DrawerCallback;
  getDrawerByType: (type: DrawerType) => DrawerCallback;
  getDrawerType: (value: unknown, binding?: JsonBinding) => DrawerType;
  replaceDrawer: (
    container: HTMLElement,
    frame: HTMLDivElement,
    label: string,
    targetType: DrawerType,
    sourceValue: unknown,
    binding?: JsonBinding
  ) => void;
  createChildBinding: (
    parentBinding: JsonBinding | undefined,
    parent: Record<string | number, unknown>,
    key: string | number
  ) => JsonBinding;
  notifyMutation: () => void;
  getBoundValue: <T>(binding: JsonBinding | undefined, fallbackValue: T) => T;
  setBoundValue: (binding: JsonBinding | undefined, nextValue: unknown) => void;
  deleteBoundValue: (binding: JsonBinding | undefined) => void;
  bindLabelInput: (labelEl: HTMLInputElement, binding: JsonBinding | undefined) => void;
}

export interface DrawerPlugin {
  type: DrawerType;
  detectPriority: number;
  matches: (value: unknown) => boolean;
  supportsHint: (value: unknown) => boolean;
  normalize: (value: unknown) => unknown;
  render: (api: DrawerRuntimeApi, args: DrawerRenderArgs) => void;
}
