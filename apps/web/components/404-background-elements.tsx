"use client";

import { useEffect, useState } from "react";

export function BackgroundElements() {
	const [, setLeft] = useState(Math.random() * 100);

	useEffect(() => {
		const interval = setInterval(() => {
			setLeft(Math.random() * 100);
		}, 2000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
			{[...Array(20)].map((_, i) => (
				<div
					key={crypto.getRandomValues(new Uint32Array(1))[0]}
					className="absolute animate-fade-in"
					style={{
						left: `${Math.random() * 100}%`,
						top: `${Math.random() * 100}%`,
						animationDelay: `${Math.random() * 5}s`,
						opacity: 0.1,
					}}
				>
					{["404", "❌", "🤔", "💫"][i % 4]}
				</div>
			))}
		</div>
	);
}
