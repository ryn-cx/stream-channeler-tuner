declare module "*.less";

declare module "*.matches.cjs" {
  export const hostnames: string[];
  export const matches: string[];
}

// Tampermonkey GM_* sync API
declare function GM_getValue<T>(key: string, defaultValue: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;
declare function GM_addValueChangeListener(
  key: string,
  callback: (
    name: string,
    oldValue: unknown,
    newValue: unknown,
    remote: boolean,
  ) => void,
): number;
