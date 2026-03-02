function isImageUrl(value) {
    if (typeof value !== "string") return false;
    var v = value.trim();
    if (v.length === 0) return false;
    if (/^data:image\//i.test(v)) return true;
    if (!/^https?:\/\//i.test(v)) return false;
    return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(v);
}

function drawImageLink(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "text-value", "image-link", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    var imageStack = document.createElement("div");
    var preview = document.createElement("img");
    imageStack.classList.add("image-link-stack");
    preview.classList.add("image-link-preview");
    preview.alt = "preview";
    t.value.type = "text";
    t.value.value = value == null ? "" : String(value);
    preview.src = t.value.value;
    preview.hidden = !isImageUrl(t.value.value);
    t.value.addEventListener("input", function () {
        preview.src = t.value.value;
        preview.hidden = !isImageUrl(t.value.value);
        ctx.setBoundValue(binding, t.value.value);
    });
    preview.addEventListener("error", function () {
        preview.hidden = true;
    });
    preview.addEventListener("load", function () {
        preview.hidden = false;
    });
    ctx.bindLabelInput(t.label, binding);
    t.frame.replaceChild(imageStack, t.value);
    imageStack.appendChild(t.value);
    imageStack.appendChild(preview);
}
