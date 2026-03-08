import { createAddEntryButton } from "../../elements";
import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";

export const ARRAY_DRAWER_TYPE = "array" as const;

export const arrayDrawerPlugin: DrawerPlugin = {
  type: ARRAY_DRAWER_TYPE,
  detectPriority: 1000,
  matches: (value) => Array.isArray(value),
  supportsHint: (value) => Array.isArray(value),
  normalize: (value) => (Array.isArray(value) ? value : []),
  render: (api, args) => {
    const arrayValue = Array.isArray(args.value) ? args.value : [];
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "array-value",
      drawerType: ARRAY_DRAWER_TYPE,
      sourceValue: arrayValue
    });
    if (!(refs.value instanceof HTMLDivElement)) return;
    const addEntryControl = createAddEntryButton(() => {
      const nextValue = "";
      arrayValue.push(nextValue);
      api.notifyMutation();
      const newBinding = api.createChildBinding(args.binding, arrayValue as unknown as Record<string | number, unknown>, arrayValue.length - 1);
      api.getDrawerByType("string")(refs.value, "", nextValue, addEntryControl, newBinding);
    });
    for (let i = 0; i < arrayValue.length; i += 1) {
      const childBinding = api.createChildBinding(args.binding, arrayValue as unknown as Record<string | number, unknown>, i);
      api.getDrawer(arrayValue[i], childBinding)(refs.value, "", arrayValue[i], undefined, childBinding);
    }
    refs.value.appendChild(addEntryControl);
  }
};
