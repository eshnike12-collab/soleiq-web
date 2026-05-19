import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-roboto)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: "#1F4E79",
        accent: "#C00000",
        blue: {
          50: "#E6F1FB",
          100: "#B5D4F4",
          600: "#185FA5",
          800: "#0C447C",
        },
        teal: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          600: "#0F6E56",
          800: "#04342C",
        },
        amber: {
          50: "#FAEEDA",
          600: "#854F0B",
          800: "#633806",
        },
        warmGray: {
          50: "#F1EFE8",
          100: "#D3D1C7",
          600: "#5F5E5A",
          800: "#2C2C2A",
        },
        risk: {
          low: "#548235",
          medium: "#BF8F00",
          high: "#C00000",
        },
      },
      borderRadius: {
        phone: "40px",
      },
      transitionTimingFunction: {
        screen: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
