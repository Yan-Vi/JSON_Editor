export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type DrawerType = string;
export type TypeHintToken = DrawerType;

export interface JsonBinding {
  parent: Record<string | number, unknown>;
  key: string | number;
  path: string;
}

export interface JsonEditorState {
  json: JsonValue;
  jsonBinding: JsonBinding;
  history: HistoryState | null;
}

export interface SetOp {
  type: "set";
  path: Array<string | number>;
  value: unknown;
  hadValue: boolean;
  oldValue: unknown;
}

export interface RemoveOp {
  type: "remove";
  path: Array<string | number>;
  oldValue: unknown;
}

export type DiffOp = SetOp | RemoveOp;

export interface HistoryEntry {
  forward: {
    jsonOps: DiffOp[];
    typeHintOps: DiffOp[];
  };
  backward: {
    jsonOps: DiffOp[];
    typeHintOps: DiffOp[];
  };
}

export interface HistorySnapshot {
  json: JsonValue;
  typeHints: Record<string, DrawerType>;
}

export interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  committed: HistorySnapshot;
  isApplying: boolean;
  maxEntries: number;
}

export type DrawerCallback = (
  container: HTMLElement,
  label: string,
  value: unknown,
  beforeNode?: Node,
  binding?: JsonBinding
) => void;

export interface DrawerFrameRefs {
  frame: HTMLDivElement;
  label: HTMLInputElement;
  value: HTMLInputElement | HTMLDivElement;
}

export interface MutationCallbacks {
  onMutation: () => void;
  onRefresh: () => void;
}

export interface DrawerContext {
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
  drawString: DrawerCallback;
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

export interface JsonTabElements {
  panel: HTMLDivElement;
  output: HTMLTextAreaElement;
  error: HTMLDivElement;
  formatButton: HTMLButtonElement;
  lineNumbers: HTMLDivElement;
}
