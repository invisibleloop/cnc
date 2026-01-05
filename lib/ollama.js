/**
 * Ollama AI integration for commit message generation
 */

/**
 * Default configuration for Ollama
 */
const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:latest', // Good for code understanding
  timeout: 30000
};

/**
 * Checks if Ollama is available and running
 * @returns {Promise<boolean>} True if Ollama is available
 */
export async function isOllamaAvailable() {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a commit message using Ollama
 * @param {string} diff - The git diff of staged changes
 * @returns {Promise<Object>} Object with type, scope, description, isBreaking, breakingDescription
 */
export async function generateCommitMessage(diff) {
  const prompt = `You are a git commit message expert. Analyze the following git diff and generate a conventional commit message.

Git diff:
\`\`\`
${diff}
\`\`\`

Generate a conventional commit following these rules:
1. Type must be one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
2. Scope is optional (e.g., parser, api, ui)
3. Description should be short, start with lowercase, no period at end
4. Identify if this is a breaking change

Respond ONLY with a JSON object in this exact format:
{
  "type": "feat|fix|docs|etc",
  "scope": "optional-scope or empty string",
  "description": "short description in lowercase",
  "isBreaking": true or false,
  "breakingDescription": "description of breaking change or empty string"
}

Do not include any markdown formatting, code blocks, or extra text. Only respond with the JSON object.`;

  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more consistent output
          num_predict: 200
        }
      }),
      signal: AbortSignal.timeout(OLLAMA_CONFIG.timeout)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.response.trim();

    // Try to parse the JSON response
    try {
      // Remove markdown code blocks if present
      let jsonText = generatedText;
      if (jsonText.includes('```')) {
        const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) {
          jsonText = match[1];
        }
      }

      const commitData = JSON.parse(jsonText);

      // Validate the response structure
      if (!commitData.type || !commitData.description) {
        throw new Error('Invalid commit data structure');
      }

      // Ensure values are the right type
      return {
        type: String(commitData.type),
        scope: commitData.scope || '',
        description: String(commitData.description),
        isBreaking: Boolean(commitData.isBreaking),
        breakingDescription: commitData.breakingDescription || '',
        footer: '' // Will be populated with branch reference later
      };
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError.message}\nResponse: ${generatedText}`);
    }
  } catch (error) {
    throw new Error(`Failed to generate commit with Ollama: ${error.message}`);
  }
}

/**
 * Gets the configured model name
 * @returns {string} The model name
 */
export function getModelName() {
  return OLLAMA_CONFIG.model;
}

/**
 * Sets a custom model
 * @param {string} model - The model name to use
 */
export function setModel(model) {
  OLLAMA_CONFIG.model = model;
}
