import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0a0a0a',
          surface: '#141414',
          border: '#262626',
          accent: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
};

export default config;
