/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Public Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#1D4ED8', dark: '#1E40AF', soft: '#EFF6FF', ink: '#0F1B3D' },
        canvas: '#F5F6F8',
      },
    },
  },
  plugins: [],
};
