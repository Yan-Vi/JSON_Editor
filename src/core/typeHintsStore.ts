import type { TypeHintToken } from "./types";

export interface TypeHintsStore {
  hints: Record<string, TypeHintToken>;
  clearByPrefix: (pathPrefix: string) => void;
  remapPrefix: (oldPrefix: string, nextPrefix: string) => void;
  exportSnapshot: () => Record<string, TypeHintToken>;
  importSnapshot: (nextTypeHints: Record<string, TypeHintToken>) => void;
}

export function createTypeHintsStore(): TypeHintsStore {
  const hints: Record<string, TypeHintToken> = {};

  const clearByPrefix = (pathPrefix: string): void => {
    Object.keys(hints).forEach((path) => {
      if (path === pathPrefix || path.startsWith(`${pathPrefix}.`) || path.startsWith(`${pathPrefix}[`)) {
        delete hints[path];
      }
    });
  };

  const remapPrefix = (oldPrefix: string, nextPrefix: string): void => {
    const nextEntries: Record<string, TypeHintToken> = {};
    Object.keys(hints).forEach((path) => {
      if (path === oldPrefix || path.startsWith(`${oldPrefix}.`) || path.startsWith(`${oldPrefix}[`)) {
        const suffix = path.slice(oldPrefix.length);
        nextEntries[`${nextPrefix}${suffix}`] = hints[path] as TypeHintToken;
        delete hints[path];
      }
    });
    Object.entries(nextEntries).forEach(([path, type]) => {
      hints[path] = type;
    });
  };

  const exportSnapshot = (): Record<string, TypeHintToken> => JSON.parse(JSON.stringify(hints)) as Record<string, TypeHintToken>;

  const importSnapshot = (nextTypeHints: Record<string, TypeHintToken>): void => {
    Object.keys(hints).forEach((key) => {
      delete hints[key];
    });
    Object.entries(nextTypeHints || {}).forEach(([key, value]) => {
      hints[key] = value;
    });
  };

  return {
    hints,
    clearByPrefix,
    remapPrefix,
    exportSnapshot,
    importSnapshot
  };
}
