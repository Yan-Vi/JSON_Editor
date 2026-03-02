function getNextObjectKey(obj) {
    var base = "newKey";
    var key = base;
    var i = 1;
    while (Object.prototype.hasOwnProperty.call(obj, key)) {
        key = base + i;
        i++;
    }
    return key;
}

function drawObject(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "object-value", "object", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    ctx.bindLabelInput(t.label, binding);
    var addEntryControl = createAddEntryButton(function () {
        var newKey = getNextObjectKey(value);
        value[newKey] = "";
        ctx.notifyMutation();
        var newBinding = ctx.createChildBinding(binding, value, newKey);
        ctx.DrawString(t.value, newKey, value[newKey], addEntryControl, newBinding);
    });
    for (let key in value) {
        var childBinding = ctx.createChildBinding(binding, value, key);
        ctx.getDrawer(value[key], childBinding)(t.value, key, value[key], undefined, childBinding);
    }
    t.value.appendChild(addEntryControl);
    return t;
}
