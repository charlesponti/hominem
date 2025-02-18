import quotes from "./steve-jobs.json";

export async function GET() {
	return Response.json({
		data: quotes[Math.floor(Math.random() * quotes.length)],
	});
}
