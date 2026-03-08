import { createAddEntryButton } from "../../elements";
import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";
import { getNextObjectKey } from "../shared/objectKey";

export const OBJECT_DRAWER_TYPE = "object" as const;

export const objectDrawerPlugin: DrawerPlugin = {
  type: OBJECT_DRAWER_TYPE,
  detectPriority: 5000,
  matches: (value) => value !== null && typeof value === "object" && !Array.isArray(value),
  supportsHint: (value) => value !== null && typeof value === "object" && !Array.isArray(value),
  normalize: (value) => (value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}),
  render: (api, args) => {
    const objectValue =
      args.value && typeof args.value === "object" && !Array.isArray(args.value)
        ? (args.value as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "object-value",
      drawerType: OBJECT_DRAWER_TYPE,
      sourceValue: objectValue
    });
    api.bindLabelInput(refs.label, args.binding);
    if (!(refs.value instanceof HTMLDivElement)) return;
    const addEntryControl = createAddEntryButton(() => {
      const newKey = getNextObjectKey(objectValue);
      objectValue[newKey] = "";
      api.notifyMutation();
      const newBinding = api.createChildBinding(args.binding, objectValue, newKey);
      api.getDrawerByType("string")(refs.value, newKey, objectValue[newKey], addEntryControl, newBinding);
    });
    Object.keys(objectValue).forEach((key) => {
      const childBinding = api.createChildBinding(args.binding, objectValue, key);
      api.getDrawer(objectValue[key], childBinding)(refs.value, key, objectValue[key], undefined, childBinding);
    });
    refs.value.appendChild(addEntryControl);
  }
};
