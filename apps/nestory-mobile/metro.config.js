// Metro config for Expo SDK 54 in a pnpm monorepo.
//
// Expo's defaults already handle the monorepo: getDefaultConfig detects the
// pnpm workspace and adds the root node_modules plus every workspace package
// (@nestory/*) to watchFolders and nodeModulesPaths, symlink resolution is on
// by default in Metro, and package.json "exports" resolution is on by default
// since SDK 53. Adding overrides here makes expo-doctor fail its Metro check.
//
// React-version contamination is not a concern here because the monorepo is
// unified on React 19.1.0 (the version Expo SDK 54 pins): nestory-web's
// package.json pins react/react-dom to the same version, and root package.json
// pnpm.overrides forces react-is to match across all transitive consumers. Keep
// all three in lockstep with Expo's pin on every SDK upgrade — a second React in
// the bundle shows up as "Objects are not valid as a React child" / `_store`
// errors.
//
// References:
//   - https://docs.expo.dev/guides/monorepos/

const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
