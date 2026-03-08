import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";

export const STRING_DRAWER_TYPE = "string" as const;

export const stringDrawerPlugin: DrawerPlugin = {
  type: STRING_DRAWER_TYPE,
  detectPriority: 10000,
  matches: (value) => typeof value === "string",
  supportsHint: (value) => typeof value === "string",
  normalize: (value) => (value == null ? "" : String(value)),
  render: (api, args) => {
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "text-value",
      drawerType: STRING_DRAWER_TYPE,
      sourceValue: args.value
    });
    if (refs.value instanceof HTMLInputElement) {
      const input = refs.value;
      input.type = "text";
      input.value = args.value == null ? "" : String(args.value);
      input.addEventListener("input", () => {
        api.setBoundValue(args.binding, input.value);
      });
    }
    api.bindLabelInput(refs.label, args.binding);
  }
};
