import { toFiniteNumberOrZero } from "../../../../core/valueUtils";
import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";

export const NUMBER_DRAWER_TYPE = "number" as const;

export const numberDrawerPlugin: DrawerPlugin = {
  type: NUMBER_DRAWER_TYPE,
  detectPriority: 8000,
  matches: (value) => typeof value === "number",
  supportsHint: (value) => typeof value === "number",
  normalize: (value) => toFiniteNumberOrZero(value),
  render: (api, args) => {
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "number-value",
      drawerType: NUMBER_DRAWER_TYPE,
      sourceValue: args.value
    });
    if (refs.value instanceof HTMLInputElement) {
      const input = refs.value;
      input.type = "number";
      input.value = String(args.value ?? 0);
      input.addEventListener("input", () => {
        api.setBoundValue(args.binding, toFiniteNumberOrZero(input.value));
      });
    }
    api.bindLabelInput(refs.label, args.binding);
  }
};
