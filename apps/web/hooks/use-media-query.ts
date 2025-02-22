import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
	const [value, setValue] = useState(false);

	useEffect(() => {
		function onChange(e: MediaQueryListEvent | MediaQueryList) {
			setValue(e.matches);
		}

		const mql = window.matchMedia(query);
		setValue(mql.matches);
		mql.addEventListener("change", onChange);

		return () => {
			mql.removeEventListener("change", onChange);
		};
	}, [query]);

	return value;
}
