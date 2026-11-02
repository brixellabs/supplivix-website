/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#232323',
          green: '#016a38',
          'green-dark': '#0b4f27',
          lime: '#b497ed',
          lavender: '#e1d6f9',
          purple: '#7a2fd0',
          plum: '#59376d',
        },
        surface: {
          card: '#ffffff',
          subtle: '#f8f8f8',
          accent: '#f2f2f2',
          border: '#e8e8e8',
        },
        ink: {
          primary: '#232323',
          muted: '#666666',
        },
        status: {
          sale: '#e95144',
          success: '#0b4f27',
          error: '#c53030',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.04)',
        'hover': '0 8px 20px rgba(0, 0, 0, 0.08)',
        'solid-sm': '0 1px 2px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '12px',
        'xl': '18px',
      },
      maxWidth: {
        'site': '1180px',
      }
    },
  },
  plugins: [],
}
