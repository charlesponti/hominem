// Load environment variables
import "dotenv/config";

import readline from "node:readline/promises";
import type { ElementHandle, Page } from "playwright";
import { chromium } from "playwright";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

(async () => {
	const browser = await chromium.launch({
		headless: false,
	});
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto(
		"https://www.ubereats.com/?mod=feedLocationRequestModal&modctx=%257B%2522mode%2522%253A%2522REQUEST%2522%257D&ps=1",
	);

	try {
		await page.getByRole("button", { name: "Close" }).click();
	} catch (error) {
		console.log("Close button not found, continuing...");
	}

	await page
		.getByTestId("header-v2-wrapper")
		.getByRole("link", { name: "Log in" })
		.click();

	// Complete email field
	await page.getByRole("textbox", { name: /email/gi }).click();
	await page
		.getByRole("textbox", { name: /email/gi })
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		.fill(process.env.UBER_EMAIL!);
	await page.getByTestId("forward-button").click();

	// Uber provides multiple options for logging in, so we must select the password option.
	await page.getByTestId("More options").click();
	await page.getByTestId("Password").click();

	// Complete the password field
	await page.getByRole("textbox", { name: /password/gi }).click();
	await page
		.getByRole("textbox", { name: /password/gi })
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		.fill(process.env.UBER_PASSWORD!);
	await page.getByTestId("forward-button").click();

	// Uber may require an SMS code to be entered.
	try {
		await page
			.getByRole("main")
			.locator("div")
			.filter({ hasText: "Send code via SMS" })
			.nth(3)
			.click();
		await page.getByTestId("Send code via SMS").click();
		await page.locator("#PHONE_SMS_OTP-0").press("Escape");

		// Prompt user for SMS code.
		const smsCode = await rl.question("Enter the SMS code: ");
		const smsDigits = smsCode.split("");

		// Uber uses a 4-digit OTP code entered into 4 individual text fields,
		// so we must fill each digit individually.
		for (let i = 0; i < 4; i++) {
			await page.locator(`#PHONE_SMS_OTP-${i}`).fill(smsDigits[i]);
		}
	} catch (error) {
		console.log("SMS code not required, continuing...");
	}

	// Uber often displays a modal when logging in, so we must close it.
	await page.getByLabel("Close").click();

	// Navigate to the *Orders* page
	await page.getByTestId("menu-button").click();
	await page.getByTestId("menu-orders-button").click();

	// Load all orders
	while (true) {
		try {
			await page.getByRole("button", { name: "Show more" }).click();
			// Wait a bit to let content load
			await page.waitForTimeout(1000);
		} catch {
			// No more "Show more" button found, exit loop
			break;
		}
	}

	const results = await scrapeUberEatsOrders(page);

	console.log("Total spent on Uber Eats: $", results);

	// ---------------------
	await context.close();
	await browser.close();
})();

type Order = {
	restaurant: string;
	numOfItems: number;
	price: string;
	date: string;
};

type PlaywrightElement = ElementHandle<SVGElement | HTMLElement>;
async function findChildMatchingQuery(
	parentEl: PlaywrightElement,
	query: (element: PlaywrightElement) => Promise<boolean>,
): Promise<PlaywrightElement[]> {
	// Get all elements within the parent element
	const elements = await parentEl.$$("*");
	const results: PlaywrightElement[] = [];

	for (const element of elements) {
		// Get all children of the current element
		const children = await element.$$("*");

		if (children) {
			const hasMatchingChild = children.some(query);

			if (!hasMatchingChild) {
				results.push(element);
			}
		}
	}

	return results;
}

export async function scrapeUberEatsOrders(page: Page) {
	const main = await page.$("main");
	if (!main) return console.error("Could not find main element");

	const orders = await findChildMatchingQuery(main, async (e) => {
		const t = await e.textContent();
		const href = await e.getAttribute("href");

		if (!t || !href) return false;

		return (
			Boolean(t.match(/\$\d+\.\d+/)) &&
			Boolean(t.includes("items for")) &&
			Boolean(href.includes("/store"))
		);
	});

	const result = {
		total: 0,
		restaurants: {} as { [key: string]: { visits: number; total: number } },
		orders: [] as Order[],
	};

	for (const element of orders) {
		const restaurantLink = await element.$('a[href*="/store"]');
		if (!restaurantLink) continue;

		const restaurant = await restaurantLink.textContent();
		if (!restaurant) continue;

		const infoElement = await findChildMatchingQuery(element, async (e) => {
			const text = await e.textContent();
			return Boolean(text?.includes("items for"));
		});

		if (!infoElement.length) continue;

		const infoText = await infoElement[0].textContent();
		const info = infoText
			?.split("•")
			.map((s) => s.trim())
			.slice(0, 2);

		if (!info) continue;

		const itemsAndPrice = info[0].split(" items for ");
		const numOfItems = Number(itemsAndPrice[0]);
		const price = Number.parseFloat(itemsAndPrice[1].slice(1));

		// Update result object
		result.total += price;

		if (result.restaurants[restaurant]) {
			result.restaurants[restaurant].visits += 1;
			result.restaurants[restaurant].total += price;
		} else {
			result.restaurants[restaurant] = { visits: 1, total: price };
		}

		result.orders.push({
			restaurant,
			numOfItems,
			price: itemsAndPrice[1],
			date: info[1],
		});
	}

	return result;
}
