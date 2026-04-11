import app from "./app";
import { config } from "./config/env";
import "./services/budgetWorker";
import "./services/reportWorker";

const server = app.listen(config.port, () => {
  console.log(`
  Server running!
  Port: ${config.port}
  Health: http://localhost:${config.port}/health
  `);
});
