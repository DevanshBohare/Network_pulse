/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["\"Plus Jakarta Sans\"", "system-ui", "sans-serif"],
        display: ["\"Syne\"", "\"Plus Jakarta Sans\"", "system-ui", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "ui-monospace", "monospace"],
      },
      colors: {
        surface: {
          900: "#070a12",
          800: "#0c101d",
          700: "#12182a",
          600: "#1a2238",
        },
        accent: {
          cyan: "#22d3ee",
          violet: "#a78bfa",
          rose: "#fb7185",
        },
        brand: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        panel: {
          DEFAULT: "#13131a",
          raised: "#1a1a24",
          border: "rgba(255,255,255,0.06)",
        },
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(7,10,18,0.2), rgba(7,10,18,0.95)), radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,211,238,0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(167,139,250,0.12), transparent)",
        mesh: "radial-gradient(at 40% 20%, rgba(34,211,238,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(167,139,250,0.1) 0px, transparent 45%), radial-gradient(at 0% 50%, rgba(251,113,133,0.06) 0px, transparent 50%)",
        "auth-grid":
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        "auth-noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)' opacity='0.055'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        "auth-grid": "48px 48px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "auth-card": "0 24px 80px -20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "gradient-x": "gradient-x 8s ease infinite",
      },
    },
  },
  plugins: [],
};
