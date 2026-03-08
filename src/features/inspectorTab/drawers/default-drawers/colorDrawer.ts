import { isHexColor, toLongHex } from "../../../../core/valueUtils";
import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";

export const COLOR_DRAWER_TYPE = "color" as const;

export const colorDrawerPlugin: DrawerPlugin = {
  type: COLOR_DRAWER_TYPE,
  detectPriority: 9100,
  matches: (value) => isHexColor(value),
  supportsHint: (value) => typeof value === "string",
  normalize: (value) => (isHexColor(value) ? value : "#000000"),
  render: (api, args) => {
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "text-value",
      drawerType: COLOR_DRAWER_TYPE,
      sourceValue: args.value
    });
    if (!(refs.value instanceof HTMLInputElement)) return;
    const input = refs.value;
    const colorStack = document.createElement("div");
    const colorPicker = document.createElement("input");
    colorStack.classList.add("color-drawer-stack");
    colorPicker.classList.add("color-picker-value");
    colorPicker.type = "color";
    input.type = "text";
    input.value = args.value == null ? "" : String(args.value);
    colorPicker.value = toLongHex(input.value);
    input.addEventListener("input", () => {
      if (isHexColor(input.value)) {
        colorPicker.value = toLongHex(input.value);
      }
      api.setBoundValue(args.binding, input.value);
    });
    colorPicker.addEventListener("input", () => {
      input.value = colorPicker.value;
      if (args.binding) {
        args.binding.parent[args.binding.key] = colorPicker.value;
      }
    });
    colorPicker.addEventListener("change", () => {
      if (args.binding) {
        args.binding.parent[args.binding.key] = colorPicker.value;
      }
      api.notifyMutation();
    });
    api.bindLabelInput(refs.label, args.binding);
    refs.frame.replaceChild(colorStack, input);
    colorStack.appendChild(input);
    colorStack.appendChild(colorPicker);
  }
};
