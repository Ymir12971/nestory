// Metro config for Expo SDK 52 + pnpm isolated linker.
//
// Two coordinated settings:
//
// 1. unstable_enableSymlinks (Metro 0.81+): follow pnpm's symlinks so files
//    inside node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/ resolve at all.
//
// 2. Hierarchical lookup left ENABLED (default): once Metro is at the realpath
//    inside .pnpm/<pkg>@<ver>/, it walks up to .pnpm/<pkg>@<ver>/node_modules/
//    to find that package's peer-resolved siblings, and further up to
//    node_modules/.pnpm/node_modules/ for phantom-dep packages (those imported
//    without a peer declaration, e.g. @expo/metro-runtime importing react).
//
// React-version contamination is not a concern here because the monorepo is
// unified on React 18.3.1: nestory-web's package.json pins react/react-dom to
// 18, and root package.json pnpm.overrides forces react-is to 18 across all
// transitive consumers. If a future change reintroduces React 19 (e.g.
// upgrading nestory-web or Expo), expect "Objects are not valid as a React
// child" / `_store` errors and reach for a resolveRequest pin scoped to mobile's
// own node_modules. See git history for the previous pin implementation.
//
// References:
//   - https://docs.expo.dev/guides/monorepos/
//   - Metro 0.79+ symlink support: https://github.com/facebook/metro/pull/973

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
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
