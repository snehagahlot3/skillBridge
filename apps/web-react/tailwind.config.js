/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F3F1F9",
        surface: "#FFFFFF",
        lavender: {
          DEFAULT: "#C9C1E3",
          subtle: "#ECE8F6",
        },
        butter: "#F7E3A1",
        ink: {
          DEFAULT: "#2B2347",
          hover: "#1E1735",
        },
        muted: "#5B5478",
        accent: "#6B5FA0",
        line: "#E3DEF2",
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};
