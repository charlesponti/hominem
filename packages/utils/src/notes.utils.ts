import * as chrono from "chrono-node";
import nlp from "compromise";

export interface NoteDetails {
	content: string;
	dates?: {
		start: string;
		end?: string;
	}[];
	category?: string[];
	labels?: string[];
	people?: string[];
	place?: string;
	date_time?: string;
}

export function parseNoteDetails(userInput: string): NoteDetails {
	// Parse the input text with compromise
	const doc = nlp(userInput);

	// Initialize default values
	let place = "";
	let dateTime: string | null = null;
	let category: string[] = [];
	let labels: string[] = [];

	// Extract possible title
	const titleTokens = doc.match("#Verb+ #Noun+").out("array");
	const title = titleTokens.join(" ");

	// Extract place
	const places = doc.places().out("array");
	if (places.length > 0) {
		place = places.join(", ");
	}

	// Extract people
	const people = doc.people().out("array");
	// ! TODO Search user's contacts to find the appropriate people

	// Extract and parse date/time
	const dates = chrono.parse(userInput);
	if (dates.length > 0 && dates[0]) {
		dateTime = dates[0].start.date().toISOString();
	}

	// Extract category (#tag)
	const categoryMatch = title.match(/#(\w+)/g);
	if (categoryMatch) {
		category = categoryMatch.map((tag: string) => tag.slice(1));
	}

	// Extract labels (@tag)
	const labelMatches = title.match(/@(\w+)/g);
	if (labelMatches) {
		labels = labelMatches.map((label: string) => label.slice(1));
	}

	return {
		content: doc.all().out("array"),
		people,
		dates: dates.map((date) => ({
			start: date.start.date().toISOString(),
			end: date.end?.date().toISOString(),
		})),
		category,
		labels,
		place: place || "No Place Found",
		date_time: dateTime || "No Date/Time Found",
	};
}
