import "dotenv/config";

import { vi } from "vitest";

vi.mock("sendgrid", () => ({
	setApiKey: vi.fn(),
	send: vi.fn(),
}));

vi.mock("../src/analytics", () => ({
	track: vi.fn(),
	EVENTS: {
		USER_EVENTS: {},
	},
}));

vi.mock("googleapis", () => ({
	google: {
		auth: {
			GoogleAuth: vi.fn(),
		},
		options: vi.fn(),
		places: vi.fn(() => ({
			places: {
				get: vi.fn(),
				photos: {
					getMedia: vi.fn(),
				},
				searchText: vi.fn(),
			},
		})),
	},
}));
