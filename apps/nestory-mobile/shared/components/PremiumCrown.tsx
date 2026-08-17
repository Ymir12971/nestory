import Svg, { Path } from 'react-native-svg';

/**
 * The crown on the Premium card (766:4177, `ri-vip-crown-fill`).
 *
 * Inlined rather than taken from react-native-remix-icon because the glyph
 * moved between Remix Icon releases: the version the design was drawn against
 * has three dots above the crown points, and 4.7.0 — the version we ship —
 * dropped them. None of `vip-crown-fill`, `vip-crown-2-fill`, `vip-crown-line`
 * or `vip-crown-2-line` in the installed package carries them, so there was no
 * name to switch to. Changing the icon package version to recover one glyph
 * would have moved every other icon in the app.
 *
 * Path is the Figma export verbatim, on its native 41×41 viewBox.
 */
const CROWN_PATH =
  'M3.41667 32.4583H37.5833V37.5833H3.41667V32.4583ZM6.83333 20.5L15.375 25.625L20.5 13.6667L25.625 25.625L34.1667 20.5V32.4583H6.83333V20.5ZM6.83333 10.25C5.92718 10.25 5.05813 9.89003 4.41738 9.24928C3.77664 8.60853 3.41667 7.73949 3.41667 6.83333C3.41667 5.92718 3.77664 5.05813 4.41738 4.41738C5.05813 3.77664 5.92718 3.41667 6.83333 3.41667C7.73949 3.41667 8.60853 3.77664 9.24928 4.41738C9.89003 5.05813 10.25 5.92718 10.25 6.83333C10.25 7.73949 9.89003 8.60853 9.24928 9.24928C8.60853 9.89003 7.73949 10.25 6.83333 10.25ZM34.1667 10.25C33.2605 10.25 32.3915 9.89003 31.7507 9.24928C31.11 8.60853 30.75 7.73949 30.75 6.83333C30.75 5.92718 31.11 5.05813 31.7507 4.41738C32.3915 3.77664 33.2605 3.41667 34.1667 3.41667C35.0728 3.41667 35.9419 3.77664 36.5826 4.41738C37.2234 5.05813 37.5833 5.92718 37.5833 6.83333C37.5833 7.73949 37.2234 8.60853 36.5826 9.24928C35.9419 9.89003 35.0728 10.25 34.1667 10.25ZM20.5 8.54167C19.5938 8.54167 18.7248 8.1817 18.0841 7.54095C17.4433 6.9002 17.0833 6.03116 17.0833 5.125C17.0833 4.21884 17.4433 3.3498 18.0841 2.70905C18.7248 2.0683 19.5938 1.70833 20.5 1.70833C21.4062 1.70833 22.2752 2.0683 22.9159 2.70905C23.5567 3.3498 23.9167 4.21884 23.9167 5.125C23.9167 6.03116 23.5567 6.9002 22.9159 7.54095C22.2752 8.1817 21.4062 8.54167 20.5 8.54167Z';

export function PremiumCrown({ size = 41, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      <Path d={CROWN_PATH} fill={color} />
    </Svg>
  );
}
