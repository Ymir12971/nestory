// Metro config for Expo SDK 52 + pnpm isolated linker.
//
// Three coordinated settings, each load-bearing:
//
// 1. unstable_enableSymlinks (Metro 0.81+): follow pnpm's symlinks so files
//    inside node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/ resolve at all.
//
// 2. Hierarchical lookup left ENABLED (default): once Metro is at the realpath
//    inside .pnpm/<pkg>@<ver>/, it walks up to .pnpm/<pkg>@<ver>/node_modules/
//    to find that package's peer-resolved siblings.
//
// 3. resolveRequest pin for react/react-dom: a number of Expo internals
//    (@expo/metro-runtime, react-native-web, …) have *phantom* react deps —
//    they import react without declaring it as a peer, so pnpm doesn't wire it
//    into their hash dir. Hierarchical lookup walks up further and lands at
//    node_modules/.pnpm/node_modules/react, pnpm's shared phantom pool, which
//    in this monorepo points at React 19 (last installed via Next 15 in
//    apps/nestory-web). The pin forces every `react` / `react-dom` request to
//    resolve from mobile's own node_modules where it's symlinked to React 18.
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

const reactPinOrigin = path.join(projectRoot, 'index.js');
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react' ||
    moduleName === 'react-dom' ||
    moduleName.startsWith('react/') ||
    moduleName.startsWith('react-dom/')
  ) {
    return context.resolveRequest(
      { ...context, originModulePath: reactPinOrigin },
      moduleName,
      platform,
    );
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
