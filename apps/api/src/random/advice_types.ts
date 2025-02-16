export type AdviceCategory =
	| "mental"
	| "physical"
	| "emotional"
	| "social"
	| "professional"
	| "spiritual";

export type AdviceType = "task" | "habit" | "reflection" | "goal";

export interface AdviceItem {
	action: string;
	description: string;
	type: AdviceType;
	duration?: string;
	frequency?: string;
	difficulty?: "easy" | "medium" | "hard";
	resources?: string[];
}

export interface TrackingData {
	completed: boolean;
	dateStarted: Date;
	dateCompleted?: Date;
	notes?: string;
	rating?: number;
}

export type ADVICE_JSON = {
	[key in AdviceCategory]: AdviceItem;
};

export interface UserAdvice extends ADVICE_JSON {
	userId: string;
	dateGenerated: Date;
	tracking: {
		[key in AdviceCategory]: TrackingData;
	};
}
