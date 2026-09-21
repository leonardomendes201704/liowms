import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildServer();
await app.listen({ port, host });
console.log(`@liowms/api listening on ${host}:${port}`);
