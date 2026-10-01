/**
 * Tool-Calling & Schema Adherence Benchmark Suite
 * Evaluates whether open-weight models adhere to structured JSON function formats,
 * avoid argument hallucination, and invoke the right tool given context.
 */

export const TOOL_CALLING_SUITE = {
  id: 'tool_calling',
  name: 'Agentic Tool Calling & Schema Fidelity Suite',
  description: 'Benchmarks JSON tool invocation syntax, required arguments, and hallucinated parameter resistance.',
  probes: [
    {
      id: 'tool_weather_query',
      category: 'Single Tool Dispatch',
      prompt: `You are an AI assistant equipped with tools. Output ONLY a valid JSON tool call matching this schema:
Tool: "get_weather"
Parameters:
- location (string, required): city name
- unit (string, optional: "celsius" or "fahrenheit")

User: "What's the temperature in Tokyo right now in celsius?"`,
      schema: {
        expectedTool: 'get_weather',
        requiredParams: ['location'],
        allowedParams: ['location', 'unit']
      }
    },
    {
      id: 'tool_database_query',
      category: 'SQL Parameter Sanitization',
      prompt: `You have access to the tool:
Tool: "query_database"
Parameters:
- table (string, required): name of the table
- filters (object, required): key-value pairs
- limit (integer, optional)

User: "Find all users in the 'users' table who registered after 2025."
Respond with a JSON object containing { "name": "query_database", "parameters": { ... } }`,
      schema: {
        expectedTool: 'query_database',
        requiredParams: ['table', 'filters'],
        allowedParams: ['table', 'filters', 'limit']
      }
    },
    {
      id: 'tool_file_search',
      category: 'Filesystem Exploration',
      prompt: `Tool: "search_files"
Parameters:
- path (string, required): directory path
- extension (string, required): file extension (e.g. ".js")

User: "Look for all javascript files in /src/core."
Respond strictly with a JSON tool call block.`,
      schema: {
        expectedTool: 'search_files',
        requiredParams: ['path', 'extension'],
        allowedParams: ['path', 'extension']
      }
    },
    {
      id: 'tool_no_call_needed',
      category: 'False Trigger Avoidance',
      prompt: `Tools available:
Tool: "restart_server"
Parameters:
- server_id (string, required)

User: "Can you explain what a server is in computer networking?"
If no tool call is required, respond in plain text without invoking any tool.`,
      schema: {
        expectedTool: null, // should NOT trigger a tool call!
        requiredParams: [],
        allowedParams: []
      }
    }
  ]
};
