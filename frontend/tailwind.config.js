/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#007AFF',
            light: '#5AC8FA',
          },
          background: '#F2F2F7',
          text: '#1C1C1E',
        },
        fontFamily: {
          sans: [
            '-apple-system',
            'BlinkMacSystemFont',
            'SF Pro Text',
            'Helvetica Neue',
            'Helvetica',
            'Arial',
            'sans-serif'
          ],
        },
        boxShadow: {
          'card': '0 8px 32px rgba(31, 38, 135, 0.15)',
          'glow': '0 0 20px rgba(0, 122, 255, 0.3)',
          'glow-hover': '0 0 30px rgba(0, 122, 255, 0.5)',
          'neumorphic': '10px 10px 20px #d1d1d4, -10px -10px 20px #ffffff',
          'neumorphic-hover': '15px 15px 30px #d1d1d4, -15px -15px 30px #ffffff',
        },
        backdropBlur: {
          'card': '20px',
        },
        animation: {
          'spin-slow': 'spin 1s linear infinite',
        },
        transitionDuration: {
          'DEFAULT': '300ms',
        },
        borderRadius: {
          'card': '20px',
        },
        spacing: {
          'modal': '440px',
        },
        minHeight: {
          'chart': '400px',
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms')({
        strategy: 'class',
      }),
    ],
    variants: {
      extend: {
        transform: ['hover', 'focus'],
        translate: ['hover', 'focus'],
        boxShadow: ['hover', 'focus'],
        backdropBlur: ['hover'],
      },
    },
    // Ensure Tailwind's core utility classes are included
    safelist: [
      'bg-primary',
      'text-primary',
      'border-primary',
      'shadow-card',
      'backdrop-blur-card',
      'rounded-card',
    ],
  };