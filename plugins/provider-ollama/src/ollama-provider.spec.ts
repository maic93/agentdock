import { describe, expect, it, vi } from "vitest";
import { ProviderTimeoutError, ProviderUnavailableError } from "@agentdock/provider-abstraction";
import { OllamaProvider } from "./ollama-provider.js";
import type { OllamaProviderConfig } from "./config.js";

const CONFIG: OllamaProviderConfig = {
  baseUrl: "http://localhost:11434",
  model: "llama3.2",
  timeoutMs: 5000,
};

function abortError(): Error {
  return Object.assign(new Error("The operation was aborted."), { name: "AbortError" });
}

describe("OllamaProvider identity", () => {
  it('has provider id "ollama" and the text-generation capability', () => {
    const provider = new OllamaProvider(CONFIG, vi.fn());
    expect(provider.id).toBe("ollama");
    expect(provider.capabilities).toEqual(["text-generation"]);
  });
});

describe("OllamaProvider.checkHealth", () => {
  it("reports healthy on a 200 response from /api/tags", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    const health = await provider.checkHealth();

    expect(health.healthy).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("/api/tags", CONFIG.baseUrl),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("reports unhealthy on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    const health = await provider.checkHealth();

    expect(health.healthy).toBe(false);
    expect(health.message).toContain("500");
  });

  it("reports unhealthy when the request throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    const health = await provider.checkHealth();

    expect(health.healthy).toBe(false);
    expect(health.message).toContain("ECONNREFUSED");
  });
});

describe("OllamaProvider.listModels", () => {
  it("returns the model names from /api/tags", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: "llama3.2" }, { name: "mistral" }] }), {
        status: 200,
      }),
    );
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    const models = await provider.listModels();

    expect(models).toEqual(["llama3.2", "mistral"]);
  });

  it("returns an empty list when Ollama reports no models", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    expect(await provider.listModels()).toEqual([]);
  });

  it("throws ProviderUnavailableError on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("error", { status: 503 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    await expect(provider.listModels()).rejects.toThrow(ProviderUnavailableError);
  });
});

describe("OllamaProvider.execute", () => {
  it("sends the configured default model and the objective as the prompt", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ response: "Hi there!" }), { status: 200 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    const result = await provider.execute({ objective: "Hello", capability: "text-generation" });

    expect(result).toEqual({ output: "Hi there!", model: "llama3.2" });
    const [, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      model: "llama3.2",
      prompt: "Hello",
      stream: false,
    });
  });

  it("uses an explicit model override instead of the configured default", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ response: "ok" }), { status: 200 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    const result = await provider.execute({
      objective: "Hello",
      capability: "text-generation",
      model: "mistral",
    });

    expect(result.model).toBe("mistral");
  });

  it("throws ProviderTimeoutError when the request aborts", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(abortError());
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    await expect(
      provider.execute({ objective: "Hello", capability: "text-generation" }),
    ).rejects.toThrow(ProviderTimeoutError);
  });

  it("throws ProviderUnavailableError on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    await expect(
      provider.execute({ objective: "Hello", capability: "text-generation" }),
    ).rejects.toThrow(ProviderUnavailableError);
  });

  it('throws ProviderUnavailableError when the response is missing "response"', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    await expect(
      provider.execute({ objective: "Hello", capability: "text-generation" }),
    ).rejects.toThrow(ProviderUnavailableError);
  });

  it("throws ProviderUnavailableError when the underlying fetch rejects for a non-abort reason", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const provider = new OllamaProvider(CONFIG, fetchImpl);

    await expect(
      provider.execute({ objective: "Hello", capability: "text-generation" }),
    ).rejects.toThrow(ProviderUnavailableError);
  });
});
