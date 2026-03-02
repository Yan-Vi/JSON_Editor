function drawBoolean(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "boolean-value", "boolean", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    t.value.type = "checkbox";
    t.value.checked = !!value;
    t.value.addEventListener("change", function () {
        ctx.setBoundValue(binding, !!t.value.checked);
    });
    ctx.bindLabelInput(t.label, binding);
}
