import { formatGeocodeFeatures, LAYERS } from "@ponti/utils/location";

export async function GET(req: Request) {
	const searchParams = new URLSearchParams(req.url.split("?")[1]);
	const query = searchParams.get("query");

	if (!query) {
		return Response.json({ error: "Missing query parameter" }, { status: 400 });
	}

	try {
		const { GEOCODE_EARTH_API_KEY } = process.env;

		if (!GEOCODE_EARTH_API_KEY) {
			throw new Error("Missing GEOCODE_EARTH_API_KEY");
		}

		const searchParams = new URLSearchParams({
			api_key: GEOCODE_EARTH_API_KEY,
			layers: LAYERS.join(","),
			"boundary.country": "USA",
			text: query,
		});
		const response = await fetch(
			`https://api.geocode.earth/v1/autocomplete?${searchParams.toString()}`,
		);

		const results = await response.json();

		return Response.json(formatGeocodeFeatures(results), { status: 200 });
	} catch (error) {
		console.error("Error fetching city lat/lng:", error);
		return Response.json(
			{ error: "Error fetching city lat/lng" },
			{ status: 500 },
		);
	}
}
