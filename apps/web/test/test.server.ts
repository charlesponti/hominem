import type { RequestHandler, WebSocketHandler } from "msw";
import { setupServer } from "msw/node";

const routeHandlers: (RequestHandler | WebSocketHandler)[] = [];

// Create and export the server so it can be imported by other files
export const server = setupServer(...routeHandlers);
