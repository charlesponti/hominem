import type { DateFromText } from "./types.ts";

export function getDateFromText(text: string): DateFromText {
	const fullDate = text.match(/\d{4}-\d{2}-\d{2}/);
	const year = text.match(/\d{4}/);

	return {
		fullDate: fullDate?.[0],
		year: year?.[0],
	};
}

export function sanitizeText(text: string): string {
	return text.trim().replace(/\s+/g, " ");
}
