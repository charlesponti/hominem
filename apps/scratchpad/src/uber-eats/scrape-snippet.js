function findMatchingChild(parent, query) {
	const results = new Set();

	function traverse(element) {
		// Skip if this is not an element node
		if (element.nodeType !== Node.ELEMENT_NODE) return;

		// Check if current element matches the query
		// We need to check each element because matches could be anywhere in the tree
		if (query(element)) {
			// If this element matches, we need to check if it has matching children
			// Only elements with no matching children are considered "leaf" matches
			let hasMatchingChildren = false;
			for (const child of element.children) {
				if (query(child)) {
					hasMatchingChildren = true;
					break;
				}
			}

			// Add to results only if this is a "leaf" match
			if (!hasMatchingChildren) {
				results.add(element);
			}
		}

		// We must traverse all children regardless of whether the parent matches
		// because matching elements could exist in any branch of the tree
		for (const child of element.children) {
			traverse(child);
		}
	}

	traverse(parent);
	return Array.from(results);
}

async function scrapeUberEatsOrders() {
	const main = document.querySelector("main");
	if (!main) throw new Error("Could not find main element");

	// Load all orders first
	while (true) {
		const showMoreBtn = Array.from(document.querySelectorAll("button")).find(
			(e) => e.textContent === "Show more",
		);
		if (!showMoreBtn) break;

		showMoreBtn.click();
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	// Find all order elements
	const orders = findMatchingChild(main, (el) => {
		return (
			/\d+\s+items\s+for\s+\$\d+\.\d+/.test(el.textContent || "") &&
			el.querySelector("a[href*='/store']") !== null
		);
	});

	const result = {
		total: 0,
		restaurants: {},
		orders: [],
	};

	// biome-ignore lint/complexity/noForEach: <explanation>
	orders.forEach((element) => {
		const restaurantLink = element.querySelector('a[href*="/store"]');
		if (!restaurantLink) return;

		const restaurant = restaurantLink.textContent;
		if (!restaurant) return;

		const infoElement = Array.from(element.querySelectorAll("*")).find((el) =>
			el.textContent?.includes("items for"),
		);

		if (!infoElement) return;

		const info = infoElement.textContent
			.split("•")
			.map((s) => s.trim())
			.slice(0, 2);

		const [itemsAndPrice, date] = info;
		const [numOfItems, priceText] = itemsAndPrice.split(" items for ");
		const price = Number.parseFloat(priceText.slice(1));

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
			numOfItems: Number(numOfItems),
			price: priceText,
			date,
		});
	});

	return result;
}

scrapeUberEatsOrders().then(console.log).catch(console.error);
