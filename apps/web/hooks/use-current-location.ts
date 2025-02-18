import { useEffect, useState } from "react";

export function useCurrentLocation({ enabled = true }: { enabled?: boolean }) {
	const [location, setLocation] = useState<number[] | null>(null);

	useEffect(() => {
		if (!navigator.geolocation) {
			console.error("Geolocation is not supported by your browser");
			return;
		}

		if (!enabled) {
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLocation([position.coords.longitude, position.coords.latitude]);
			},
			() => {
				navigator.permissions.query({ name: "geolocation" }).then((result) => {
					switch (result.state) {
						case "denied": {
							console.info("[RevRock] Geolocation permission denied.");
							break;
						}
						case "granted": {
							console.info(
								"[RevRock] Geolocation permission granted. However, position is unavailable.",
							);
							break;
						}
					}
				});
			},
		);
	}, [enabled]);

	return { location, setLocation };
}
