/**
 * Thrown by {@link loadConfig} when a required environment variable is
 * missing or invalid. AgentDock fails fast on bad configuration: this
 * error is meant to crash startup with a clear message, not to be caught
 * and worked around.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
