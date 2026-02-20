import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", {
      editengage: {
        "primary": "#34D399",
        "primary-content": "#000000",
        "secondary": "#3B82F6",
        "secondary-content": "#ffffff",
        "accent": "#F59E0B",
        "accent-content": "#000000",
        "neutral": "#1a1a2e",
        "neutral-content": "#ffffff",
        "base-100": "#0a0a0f",
        "base-200": "#12121a",
        "base-300": "#1a1a2e",
        "base-content": "#ffffff",
        "info": "#3B82F6",
        "success": "#34D399",
        "warning": "#F59E0B",
        "error": "#EF4444",
      }
    }],
    darkTheme: "editengage",
  }
} satisfies Config;
