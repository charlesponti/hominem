export interface Note {
	file: string;
	heading?: string;
	text: string;
	tag?: string;
	date?: string;
}

export interface DateFromText {
	fullDate?: string;
	year?: string;
}

export interface ProcessedContent {
	headings: string[];
	paragraphs: Note[];
	bulletPoints: Note[];
	others: Note[];
}
