#!/usr/bin/env node
// Boots the mobile app in Expo Web for demos.
//
// Usage:
//   pnpm demo            # Expo Web (default — easiest to share)
//   pnpm demo -- ios     # iOS simulator
//   pnpm demo -- android # Android emulator
//   pnpm demo -- start   # Bare expo start (pick target in Metro)
//
// Demo state worth knowing:
//   - SignIn buttons fake auth and replace to /(tabs).
//   - SettingsScreen runs on DEMO_MODE mock data (Free Plan / Emma).
//   - All other screens (Home/Stories/Highlights/Memory/Settings sub-pages)
//     use MOCK_* arrays — no backend required.
//   - Hero bg is the real Figma export (193:1628).

import { spawn } from 'node:child_process'

const TARGET_TO_SCRIPT = {
  web:     'web',
  ios:     'ios',
  android: 'android',
  start:   'start',
}

const target = (process.argv[2] ?? 'web').toLowerCase()
const script = TARGET_TO_SCRIPT[target]

if (!script) {
  console.error(`Unknown target: ${target}`)
  console.error(`Valid targets: ${Object.keys(TARGET_TO_SCRIPT).join(', ')}`)
  process.exit(1)
}

console.log('───────────────────────────────────────────────')
console.log(`  Nestory demo · target: ${target}`)
console.log('───────────────────────────────────────────────')
console.log('  Demo path:')
console.log('    Welcome → Sign In → tap Apple/Google → Home')
console.log('    Tabs: Home / Stories / Highlights')
console.log('    From Home: gear icon → Settings (+ 6 sub-pages)')
console.log('───────────────────────────────────────────────')

const child = spawn(
  'pnpm',
  ['--filter', '@nestory/mobile', script],
  { stdio: 'inherit', shell: process.platform === 'win32' },
)

child.on('exit', code => process.exit(code ?? 0))
