import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { EmailMaskRouter } from "./email-mask-router.js";

const emailRouter = new EmailMaskRouter("myapp.example.com");

const app = new Hono();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.onError((err, c) => {
	console.error(err);
	return c.text("An error occurred", 500);
});

app.use(
	"/trpc/*",
	trpcServer({
		router: emailRouter.router,
	}),
);

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

const port = Number(process.env.PORT || 4445);
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
