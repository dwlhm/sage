/**
 * Shape of the config after transform injects `_importPath`.
 * Maps to what `ssg.config.ts` exports after the `transformConfig` pass.
 */
export interface ConfigEntry {
    component: () => Promise<any>;
    _importPath: string;
    out: string;
    path: string;
}

export interface Config {
    entries: ConfigEntry[];
    root: React.ComponentType<{ children: React.ReactNode }>;
}