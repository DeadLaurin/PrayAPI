import { buildServer } from "./server.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

const app = await buildServer();

try {
  await app.listen({ port, host });
  console.log(`PrayAPI listening on http://${host}:${port}`);
  console.log(`Swagger UI: http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
