import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kite: {
          primary: '#7C3AED',
          secondary: '#A78BFA',
        },
        perkos: {
          pink: '#EB1B69',
          dark: '#0E0716',
        },
      },
    },
  },
  plugins: [],
};

export default config;
