// Deprecated REST endpoint - replaced by tRPC `events` router
export async function loader() {
  return new Response("Not Found", { status: 404 });
}

export async function action() {
  return new Response("Not Found", { status: 404 });
}
