import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";

export const BOOLEAN_DRAWER_TYPE = "boolean" as const;

export const booleanDrawerPlugin: DrawerPlugin = {
  type: BOOLEAN_DRAWER_TYPE,
  detectPriority: 7000,
  matches: (value) => typeof value === "boolean",
  supportsHint: (value) => typeof value === "boolean",
  normalize: (value) => Boolean(value),
  render: (api, args) => {
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "boolean-value",
      drawerType: BOOLEAN_DRAWER_TYPE,
      sourceValue: args.value
    });
    if (refs.value instanceof HTMLInputElement) {
      const input = refs.value;
      input.type = "checkbox";
      input.checked = Boolean(args.value);
      input.addEventListener("change", () => {
        api.setBoundValue(args.binding, Boolean(input.checked));
      });
    }
    api.bindLabelInput(refs.label, args.binding);
  }
};
