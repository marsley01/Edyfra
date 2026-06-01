export class LlamaService {
  private endpoint: string;
  private model: string;

  constructor(model: string = "llama3") {
    // Defaulting to local Ollama endpoint
    this.endpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434/api/generate";
    this.model = model;
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: fullPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("LlamaService Error:", error);
      throw error;
    }
  }
}
