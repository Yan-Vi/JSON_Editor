import { isImageUrl } from "../../../../core/valueUtils";
import type { DrawerPlugin } from "../contracts";
import { createStandardFrame } from "../shared/frame";

export const IMAGE_LINK_DRAWER_TYPE = "image-link" as const;

export const imageLinkDrawerPlugin: DrawerPlugin = {
  type: IMAGE_LINK_DRAWER_TYPE,
  detectPriority: 9000,
  matches: (value) => isImageUrl(value),
  supportsHint: (value) => typeof value === "string",
  normalize: (value) => (value == null ? "" : String(value)),
  render: (api, args) => {
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "text-value",
      drawerType: IMAGE_LINK_DRAWER_TYPE,
      sourceValue: args.value
    });
    if (!(refs.value instanceof HTMLInputElement)) return;
    const input = refs.value;
    const imageStack = document.createElement("div");
    const preview = document.createElement("img");
    imageStack.classList.add("image-link-stack");
    preview.classList.add("image-link-preview");
    preview.alt = "preview";
    input.type = "text";
    input.value = args.value == null ? "" : String(args.value);
    preview.src = input.value;
    preview.hidden = !isImageUrl(input.value);
    input.addEventListener("input", () => {
      preview.src = input.value;
      preview.hidden = !isImageUrl(input.value);
      api.setBoundValue(args.binding, input.value);
    });
    preview.addEventListener("error", () => {
      preview.hidden = true;
    });
    preview.addEventListener("load", () => {
      preview.hidden = false;
    });
    api.bindLabelInput(refs.label, args.binding);
    refs.frame.replaceChild(imageStack, input);
    imageStack.appendChild(input);
    imageStack.appendChild(preview);
  }
};
