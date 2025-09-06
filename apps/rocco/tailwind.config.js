/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	// Updated content paths for better purging of unused styles
	content: [
		"./app/**/*.{ts,tsx,js,jsx}",
		"../../packages/ui/src/**/*.{ts,tsx,js,jsx}"
	],
	// Enable just-in-time mode for faster builds and smaller CSS
	future: {
		hoverOnlyWhenSupported: true,
	},
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				spin: "spin 3s linear infinite",
				"spin-slow": "spin 6s linear infinite",
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [require("tailwindcss-animate"), require("daisyui")],
	daisyui: {
		themes: ["winter"],
		// Reduce DaisyUI's footprint by selecting only components you use
		components: [
			"alert",
			"avatar",
			"badge",
			"button",
			"card",
			"carousel",
			"collapse",
			"dropdown",
			"input",
			"loading",
			"modal",
			"navbar",
			"progress",
			"select",
			"stat",
			"tab",
			"tooltip",
		],
		// Optimize utility classes to reduce size
		utils: true,
		logs: false,
		darkTheme: "winter",
	},
};
