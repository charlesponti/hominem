const isString = (v: string | null | undefined): v is string => Boolean(v);

/**
 * Extracts timestamps from a YouTube playlist section element.
 *
 * This function parses a given HTML element representing a YouTube playlist section
 * and extracts the timestamps of the playlist items. It assumes the timestamps are
 * located within elements with the class "badge-shape-wiz__text".
 *
 * @param {Element} el - The YouTube playlist section element.
 * @returns {string[]} An array of timestamps in the format "HH:MM:SS" or "MM:SS".
 */
export function getPlaylistTimestamps(el: Element): string[] {
	const timestampBadges = el.querySelectorAll(".badge-shape-wiz__text");
	return Array.from(timestampBadges)
		.map((e: Element) => e.textContent)
		.filter(isString);
}

type TimeObject = {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
};

/**
 * Calculates the total duration of a list of timestamps.
 *
 * This function takes an array of timestamps in the format "HH:MM:SS" or "MM:SS"
 * and calculates the total duration in days, hours, minutes, and seconds.
 *
 * @param {string[]} timestamps - An array of timestamps.
 * @returns {{ days: number, hours: number, minutes: number, seconds: number }}
 *   An object containing the total duration in days, hours, minutes, and seconds.
 */
export function calculateTotalTimeFromArray(timestamps: string[]): TimeObject {
	const aggregator = {
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	};

	for (const time of timestamps) {
		const splits = time.split(":").map(Number);

		// Normalize timestamps to always have hours, minutes, and seconds
		if (splits.length === 2) {
			splits.unshift(0);
		}

		const [hours, minutes, seconds] = splits;

		if (seconds === undefined || minutes === undefined || hours === undefined) {
			continue;
		}

		aggregator.seconds += seconds;
		if (aggregator.seconds >= 60) {
			aggregator.minutes += 1;
			aggregator.seconds -= 60;
		}

		aggregator.minutes += minutes;
		if (aggregator.minutes >= 60) {
			aggregator.hours += 1;
			aggregator.minutes -= 60;
		}

		aggregator.hours += hours;
		if (aggregator.hours >= 24) {
			aggregator.days += 1;
			aggregator.hours -= 24;
		}
	}

	return aggregator;
}

export function getPlaylistLength(el: Element) {
	return calculateTotalTimeFromArray(getPlaylistTimestamps(el));
}

/**
 * Calculates the number of chunks needed to complete a given time duration.
 *
 * This function takes a time object representing a duration and a chunk length in
 * minutes and calculates the number of chunks needed to complete the duration.
 *
 * For example, the user may want to determine how many 25-minute Peloton cycling rides
 * are needed to complete the total time of their YouTube Watch Later Playlist.
 *
 * @param {TimeObject} timeObject - The time object representing the duration.
 * @param {number} cycleLengthMinutes - The length of each chunk in minutes.
 * @returns {number} The number of chunks needed to complete the duration.
 */
export function calculateTimeChunksCount(
	timeObject: TimeObject,
	chunkInMinutes: number,
): number {
	const totalSeconds =
		timeObject.days * 86400 +
		timeObject.hours * 3600 +
		timeObject.minutes * 60 +
		timeObject.seconds;
	return Math.ceil(totalSeconds / (chunkInMinutes * 60));
}
