// Metro config for Expo + pnpm workspace.
//
// Without this, Metro's default upward node_modules lookup picks up any React
// version it finds at the workspace root — including the React 19 that Next 15
// (apps/nestory-web) depends on — and the bundle ends up with two Reacts. The
// "Objects are not valid as a React child" crash with `_store` in the element
// keys is the giveaway: a React 18 element being validated by React 19.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
