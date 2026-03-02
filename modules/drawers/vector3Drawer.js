function isVector2Object(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return (
        Object.prototype.hasOwnProperty.call(value, "x") &&
        Object.prototype.hasOwnProperty.call(value, "y") &&
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        !Object.prototype.hasOwnProperty.call(value, "z")
    );
}

function isVector3Object(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return (
        Object.prototype.hasOwnProperty.call(value, "x") &&
        Object.prototype.hasOwnProperty.call(value, "y") &&
        Object.prototype.hasOwnProperty.call(value, "z") &&
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        typeof value.z === "number"
    );
}

function toFiniteNumber(raw) {
    var parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function drawVector(ctx, container, label, value, beforeNode, binding, drawerType, axes) {
    var axisList = Array.isArray(axes) && axes.length ? axes : ["x", "y", "z"];
    var t = ctx.createDrawerFrame(container, label, "text-value", drawerType, function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    var vector = ctx.getBoundValue(binding, value);
    if (!vector || typeof vector !== "object" || Array.isArray(vector)) {
        vector = {};
        axisList.forEach(function (axis) {
            vector[axis] = 0;
        });
        ctx.setBoundValue(binding, vector);
    } else {
        axisList.forEach(function (axis) {
            vector[axis] = toFiniteNumber(vector[axis]);
        });
    }
    var stack = document.createElement("div");
    stack.classList.add("vector3-stack");
    axisList.forEach(function (axis) {
        var axisWrap = document.createElement("div");
        var axisKey = document.createElement("span");
        var axisInput = document.createElement("input");
        axisWrap.classList.add("vector3-item");
        axisKey.classList.add("vector3-key");
        axisInput.classList.add("vector3-field");
        axisKey.textContent = axis;
        axisInput.type = "number";
        axisInput.step = "any";
        axisInput.value = String(toFiniteNumber(vector[axis]));
        axisInput.addEventListener("input", function () {
            vector[axis] = toFiniteNumber(axisInput.value);
            ctx.notifyMutation();
        });
        axisWrap.appendChild(axisKey);
        axisWrap.appendChild(axisInput);
        stack.appendChild(axisWrap);
    });
    ctx.bindLabelInput(t.label, binding);
    t.frame.replaceChild(stack, t.value);
}

function drawVector2(ctx, container, label, value, beforeNode, binding) {
    drawVector(ctx, container, label, value, beforeNode, binding, "vector2", ["x", "y"]);
}

function drawVector3(ctx, container, label, value, beforeNode, binding) {
    drawVector(ctx, container, label, value, beforeNode, binding, "vector3", ["x", "y", "z"]);
}
