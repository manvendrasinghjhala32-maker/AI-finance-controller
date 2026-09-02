/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          main: '#212121',
          secondary: '#171717',
          sidebar: '#171717',
          input: '#2F2F2F',
          hover: '#3A3A3A',
          border: '#333333',
          borderSubtle: '#2A2A2A',
        },
        figma: {
          bg: '#212121',
          sidebar: '#171717',
          card: '#171717',
          cardHover: '#3A3A3A',
          cardBorder: '#2E2E2E',
          borderSubtle: '#282828',
          emerald: '#00E599',
          cyan: '#00D2FF',
          amber: '#F59E0B',
          rose: '#FF3B69',
          purple: '#A855F7',
          muted: '#9E9E9E',
          text: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
