import type { DrawerType } from "./types";

export const INVALID_NUMBER: unique symbol = Symbol("INVALID_NUMBER");

export function parseFiniteNumber(raw: unknown): number | typeof INVALID_NUMBER {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return INVALID_NUMBER;
  return parsed;
}

export function toFiniteNumberOrZero(raw: unknown): number {
  const parsed = parseFiniteNumber(raw);
  return parsed === INVALID_NUMBER ? 0 : parsed;
}

export function isHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value);
}

export function toLongHex(value: unknown): string {
  if (!isHexColor(value)) return "#000000";
  if (value.length === 7) return value.toLowerCase();
  return (`#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`).toLowerCase();
}

export function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0) return false;
  if (/^data:image\//i.test(v)) return true;
  if (!/^https?:\/\//i.test(v)) return false;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(v);
}

export function isVector2Object(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(candidate, "x") &&
    Object.prototype.hasOwnProperty.call(candidate, "y") &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    !Object.prototype.hasOwnProperty.call(candidate, "z")
  );
}

export function isVector3Object(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(candidate, "x") &&
    Object.prototype.hasOwnProperty.call(candidate, "y") &&
    Object.prototype.hasOwnProperty.call(candidate, "z") &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.z === "number"
  );
}

export function normalizeValueForType(value: unknown, type: DrawerType): unknown {
  if (type === "string") return value == null ? "" : String(value);
  if (type === "color") return isHexColor(value) ? value : "#000000";
  if (type === "image-link") return value == null ? "" : String(value);
  if (type === "number") return toFiniteNumberOrZero(value);
  if (type === "vector2") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return {
      x: toFiniteNumberOrZero(source.x),
      y: toFiniteNumberOrZero(source.y)
    };
  }
  if (type === "vector3") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return {
      x: toFiniteNumberOrZero(source.x),
      y: toFiniteNumberOrZero(source.y),
      z: toFiniteNumberOrZero(source.z)
    };
  }
  if (type === "boolean") return Boolean(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (type === "array") return Array.isArray(value) ? value : [];
  return value;
}
