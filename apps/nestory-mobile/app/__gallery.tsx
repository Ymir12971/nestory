import { GalleryScreen } from '@/features/devtools/gallery/GalleryScreen';

/**
 * Dev-only route: an index of every Figma frame that renders the real screen
 * in the right state on demand. See features/devtools/gallery.
 *
 * The guard only stops it rendering — the module still ships. Metro collects
 * `require`/`import` dependencies when it transforms a file, so a conditional
 * require inside a `__DEV__` branch is bundled anyway (measured: the fixture
 * strings are present in a `dev=false&minify=true` build either way). Nothing
 * here is sensitive and it is a few KB against a 6 MB bundle, so the plain
 * import is the honest version. To actually keep it out, alias the module to
 * an empty stub in metro.config.js for release builds.
 */
export default function GalleryRoute() {
  if (!__DEV__) return null;
  return <GalleryScreen />;
}
