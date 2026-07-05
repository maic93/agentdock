import { loadConfig } from "@agentdock/foundation-config";
import { buildDependencies } from "./composition.js";
import { createServer } from "./server.js";

const config = loadConfig();
const dependencies = buildDependencies(config);
const server = createServer(dependencies);

server.listen(config.port, () => {
  console.warn(`AgentDock API listening on port ${config.port}`);
});
