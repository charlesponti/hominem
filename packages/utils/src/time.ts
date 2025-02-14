export const TIME_UNITS = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
	WEEK: 7 * 24 * 60 * 60 * 1000,
	MONTH: 30 * 24 * 60 * 60 * 1000,
	YEAR: 365 * 24 * 60 * 60 * 1000,
};

function getTimeUnit(unit: string) {
	const key = unit.toUpperCase() as keyof typeof TIME_UNITS;

	if (!TIME_UNITS[key]) {
		throw new Error(`Invalid time unit: ${unit}`);
	}

	return TIME_UNITS[key];
}

export const datePatterns = [
	{
		// Handle "in X units" (e.g., "in 2 days", "in 1 week")
		pattern: /\bin (\d+) (second|minute|hour|day|week|month|year)s?\b/i,
		parse: (match: string) => {
			const amount = Number.parseInt(match[1]);
			const timeUnit = getTimeUnit(match[2]);
			const now = new Date();
			return new Date(now.getTime() + amount * timeUnit);
		},
	},
	{
		// Handle "X units ago" (e.g., "2 days ago", "1 week ago")
		pattern: /\b(\d+) (second|minute|hour|day|week|month|year)s? ago\b/i,
		parse: (match: string) => {
			const amount = Number.parseInt(match[1]);
			const timeUnit = getTimeUnit(match[2]);
			const now = new Date();
			return new Date(now.getTime() - amount * timeUnit);
		},
	},
	{
		// Handle "next/last unit" (e.g., "next month", "last week")
		pattern: /\b(next|last) (second|minute|hour|day|week|month|year)\b/i,
		parse: (match: string) => {
			const direction = match[1].toLowerCase() === "next" ? 1 : -1;
			const timeUnit = getTimeUnit(match[2]);
			const now = new Date();
			return new Date(now.getTime() + direction * timeUnit);
		},
	},
	{
		// Handle weekdays (keeping existing functionality)
		pattern:
			/\b(next|this) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
		parse: (match: string) => {
			const days = [
				"sunday",
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday",
				"saturday",
			];
			const dayIndex = days.indexOf(match[2].toLowerCase());
			const today = new Date();
			const targetDay = new Date(today);

			targetDay.setDate(
				today.getDate() + ((dayIndex + 7 - today.getDay()) % 7),
			);
			if (match[1].toLowerCase() === "next") {
				targetDay.setDate(targetDay.getDate() + 7);
			}

			return targetDay;
		},
	},
	{
		pattern: /\b(tomorrow|tmr)\b/i,
		parse: () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			return tomorrow;
		},
	},
	{
		pattern: /\b(today)\b/i,
		parse: () => new Date(),
	},
];

export const getNumberOfDays = (dateTimeNumber: number) => {
	return Math.abs(dateTimeNumber) / TIME_UNITS.DAY;
};

export const getDaysBetweenDates = (startDate: Date, endDate: Date) => {
	return getNumberOfDays(endDate.getTime() - startDate.getTime());
};
