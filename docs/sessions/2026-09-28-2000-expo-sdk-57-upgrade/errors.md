# Errors

## `Cannot find module '@expo/config-plugins'` when loading app config
- **What went wrong:** after the upgrade, `npx expo config` / `expo-doctor` failed: `@react-native-community/datetimepicker`'s config plugin (listed in app.json `plugins`) requires `@expo/config-plugins`.
- **Why:** in SDK 57 that package is only nested inside other `@expo/*` packages, no longer hoisted to the top of `node_modules`, and the datetimepicker plugin imports it directly instead of via `expo/config-plugins`.
- **Resolution:** added `@expo/config-plugins@~57.0.9` (same version the SDK uses) as a dev dependency. expo-doctor flags it but says to ignore it when it fulfils a plugin's peer dependency, which is exactly this case.

## `TS5101: Option 'baseUrl' is deprecated` (TypeScript 6)
- **Resolution:** removed `baseUrl`; `paths` already use `./*`, which resolves relative to tsconfig without it. Runtime aliasing is babel `module-resolver`, unaffected.
