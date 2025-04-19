import { BadgeAlert } from "lucide-react";
import type { HTMLProps, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

function Alert({
	className,
	children,
	type,
}: PropsWithChildren<
	HTMLProps<HTMLDivElement> & {
		type?: "success" | "error" | "warning" | "info";
	}
>) {
	if (type === "success") {
		return (
			<div
				className={twMerge(
					"rounded-md alert alert-success text-success-content p-4 text-md",
					className,
				)}
			>
				{children}
			</div>
		);
	}

	if (type === "error") {
		return (
			<div className={twMerge("alert border-2 border-red-400 bg-white text-red-500", className)}>
				<div className="flex justify-start h-full">
					<BadgeAlert size={24} className="text-red-400" />
				</div>
				<div className="flex-1 h-full ml-4">{children}</div>
			</div>
		);
	}

	if (type === "warning") {
		return (
			<div
				className={twMerge(
					"rounded-md bg-yellow-400 text-warning-content p-4 text-md",
					className,
				)}
			>
				{children}
			</div>
		);
	}

	return (
		<div
			className={twMerge(
				"rounded-md bg-gray-100 text-info-content p-4 text-md",
				className,
			)}
		>
			{children}
		</div>
	);
}

export default Alert;
