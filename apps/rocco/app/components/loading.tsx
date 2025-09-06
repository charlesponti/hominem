type LoadingSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
type LoadingProps = {
	color?: string;
	size?: LoadingSize;
};

const sizes = {
	sm: "1rem",
	md: "2rem",
	lg: "3rem",
	xl: "4rem",
	"2xl": "5rem",
	"3xl": "6rem",
};

export default function Loading({ color, size = "md" }: LoadingProps) {
	return (
		<output data-testid="loading-spinner">
			<span
				className="loading loading-infinity"
				style={{ width: sizes[size], color }}
			/>
			<span className="sr-only">Loading...</span>
		</output>
	);
}

export function LoadingScreen() {
	return (
		<div className="flex items-center justify-center max-h-[300px] mx-auto">
			<Loading size="3xl" />
		</div>
	);
}
