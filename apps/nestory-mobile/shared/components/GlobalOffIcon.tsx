import Svg, { Path } from 'react-native-svg';

/**
 * The offline glyph on the load-failure states (`global-off-line`, e.g.
 * 774:3808 and its Stories twin).
 *
 * Inlined because react-native-remix-icon 4.7.0 does not carry it — the
 * package has GlobalFill and GlobalLine and nothing else in that family, so
 * there was no name to pass. It stood in as `wifi-off-line` until now, which
 * reads as a Wi-Fi problem specifically rather than "no connection".
 *
 * Path is the Figma export verbatim, on its native 48x48 viewBox.
 */
const GLOBAL_OFF_PATH =
  'M44.0722 32.7578L39.8282 37L44.0722 41.2442L41.2442 44.0722L37 39.8282L32.7578 44.0722L29.9296 41.2442L34.1718 37L29.9296 32.7578L32.7578 29.9296L37 34.1718L41.2442 29.9296L44.0722 32.7578ZM24.957 4.02344C35.5592 4.52378 44 13.2751 44 24V26H20.0664C20.3792 31.0772 21.8712 35.8306 24.2774 39.9922C24.4414 39.9894 24.6048 39.99 24.7676 39.9824C25.1076 39.9664 25.4454 39.9392 25.7792 39.9024L26.2208 43.879C25.8034 43.925 25.3814 43.9566 24.957 43.9766C24.6398 43.9916 24.3206 44 24 44C23.6794 44 23.3602 43.9916 23.043 43.9766C12.4409 43.4762 4 34.7248 4 24C4 13.2751 12.4409 4.52378 23.043 4.02344C23.3602 4.00848 23.6794 4 24 4C24.3206 4 24.6398 4.00848 24.957 4.02344ZM8.1289 26C8.92166 32.3546 13.4364 37.5522 19.4258 39.336C17.4996 35.2512 16.3208 30.7476 16.0605 26H8.1289ZM19.4258 8.6621C13.4361 10.4457 8.92168 15.6452 8.1289 22H16.0605C16.3208 17.2517 17.4991 12.7472 19.4258 8.6621ZM24 8.5039C21.7578 12.5459 20.367 17.1227 20.0664 22H27.9336C27.633 17.1227 26.2422 12.5459 24 8.5039ZM28.5722 8.6621C30.4992 12.7474 31.6792 17.2514 31.9394 22H39.871C39.0782 15.6445 34.5628 10.4452 28.5722 8.6621Z';

export function GlobalOffIcon({ size = 48, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d={GLOBAL_OFF_PATH} fill={color} />
    </Svg>
  );
}
