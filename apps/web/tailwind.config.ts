import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-poppins)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          primary: '#ff724f',
          'primary-light': '#fff3f0',
          'primary-hover': '#e8603a',
          secondary: '#300a46',
          'secondary-light': '#f6f0fc',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'loading-bar': {
          '0%':   { width: '0%',   marginLeft: '0%' },
          '50%':  { width: '60%',  marginLeft: '20%' },
          '100%': { width: '0%',   marginLeft: '100%' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'loading-bar': 'loading-bar 1.2s ease-in-out infinite',
        'fade-in':     'fade-in 0.2s ease-out forwards',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
      },
      fontSize: {
        'xs':   ['0.875rem', { lineHeight: '1.25rem' }],   /* 14px (was 12px) */
        'sm':   ['1rem',     { lineHeight: '1.5rem'  }],   /* 16px (was 14px) */
        'base': ['1.125rem', { lineHeight: '1.75rem' }],   /* 18px (was 16px) */
        'lg':   ['1.25rem',  { lineHeight: '1.75rem' }],   /* 20px (was 18px) */
        'xl':   ['1.375rem', { lineHeight: '1.875rem'}],   /* 22px (was 20px) */
        '2xl':  ['1.625rem', { lineHeight: '2rem'    }],   /* 26px (was 24px) */
        '3xl':  ['2rem',     { lineHeight: '2.25rem' }],   /* 32px (was 30px) */
        '4xl':  ['2.375rem', { lineHeight: '2.5rem'  }],   /* 38px (was 36px) */
      },
    },
  },
  plugins: [],
};

export default config;
