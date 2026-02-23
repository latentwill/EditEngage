import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    }
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        "editengage": {
          "primary": "#B87333",        // copper
          "primary-content": "#FAF8F5",
          "secondary": "#E8A87C",      // burnt sienna
          "secondary-content": "#1C1410",
          "accent": "#E8A87C",
          "accent-content": "#1C1410",
          "neutral": "#16162A",
          "neutral-content": "#F4F1EE",
          "base-100": "#080808",       // obsidian
          "base-200": "#0F0F1C",
          "base-300": "#16162A",
          "base-content": "rgba(255,255,255,0.92)",
          "info": "#38BDF8",
          "info-content": "#080808",
          "success": "#4ADE80",
          "success-content": "#080808",
          "warning": "#FBBF24",
          "warning-content": "#080808",
          "error": "#EF4444",
          "error-content": "#FAF8F5",
        },
        "editengage-light": {
          "primary": "#8B5A2B",        // dark copper
          "primary-content": "#FAF8F5",
          "secondary": "#6B3F1A",      // espresso
          "secondary-content": "#FAF8F5",
          "accent": "#6B3F1A",
          "accent-content": "#FAF8F5",
          "neutral": "#E8E0D5",
          "neutral-content": "#1C1410",
          "base-100": "#FAF8F5",       // sandstone
          "base-200": "#F2EDE6",
          "base-300": "#E8E0D5",
          "base-content": "#1C1410",
          "info": "#2563EB",
          "info-content": "#FAF8F5",
          "success": "#16A34A",
          "success-content": "#FAF8F5",
          "warning": "#D97706",
          "warning-content": "#FAF8F5",
          "error": "#DC2626",
          "error-content": "#FAF8F5",
        },
      },
    ],
    darkTheme: "editengage",
  }
} satisfies Config;
