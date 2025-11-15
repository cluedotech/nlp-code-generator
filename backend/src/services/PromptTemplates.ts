export type OutputType = 'sql' | 'n8n' | 'formio';

interface PromptTemplate {
  systemPrompt: string;
  buildUserPrompt: (context: string, userRequest: string) => string;
}

/**
 * SQL Generation Prompt Template
 */
const sqlTemplate: PromptTemplate = {
  systemPrompt: `You are an expert SQL query generator. Your task is to generate syntactically correct, efficient SQL queries based on user requests and provided database schema context.

Guidelines:
- Generate only valid SQL syntax
- Use table and column names exactly as they appear in the DDL context
- Include helpful comments explaining the query logic
- Optimize for readability and performance
- Use appropriate JOINs, WHERE clauses, and aggregations
- Return ONLY the SQL query without any additional explanation or markdown formatting
- If the request references non-existent tables or columns, explain the error clearly`,

  buildUserPrompt: (context: string, userRequest: string) => {
    return `Database Schema Context:
${context}

User Request:
${userRequest}

Generate a SQL query that fulfills the user's request. Return only the SQL code with inline comments.`;
  },
};

/**
 * n8n Workflow Generation Prompt Template
 */
const n8nTemplate: PromptTemplate = {
  systemPrompt: `You are an expert n8n workflow automation specialist. Your task is to generate valid n8n workflow JSON configurations based on user requests and provided context.

Guidelines:
- Generate valid n8n workflow JSON that can be imported directly
- Configure appropriate nodes based on the user's automation requirements
- Establish correct connections between nodes with proper input/output mappings
- Include descriptive node names and helpful notes
- Use realistic parameter values and configurations
- Follow n8n best practices for error handling and data transformation
- Return ONLY the JSON workflow without any additional explanation or markdown formatting
- Ensure the JSON is properly formatted and valid`,

  buildUserPrompt: (context: string, userRequest: string) => {
    return `Context Information:
${context}

User Request:
${userRequest}

Generate a complete n8n workflow JSON that fulfills the user's request. Return only the JSON code.`;
  },
};

/**
 * Form.io Form Generation Prompt Template
 */
const formioTemplate: PromptTemplate = {
  systemPrompt: `You are an expert Form.io form designer. Your task is to generate valid Form.io form JSON configurations based on user requests and provided context.

Guidelines:
- Generate valid Form.io form JSON that can be used directly
- Include appropriate field types (textfield, email, number, select, checkbox, etc.)
- Configure validation rules where applicable (required, email format, min/max length, etc.)
- Organize fields in a logical layout with proper labels and placeholders
- Use appropriate component keys following naming conventions
- Include helpful descriptions and tooltips where needed
- Follow Form.io best practices for accessibility and user experience
- Return ONLY the JSON form definition without any additional explanation or markdown formatting
- Ensure the JSON is properly formatted and valid`,

  buildUserPrompt: (context: string, userRequest: string) => {
    return `Context Information:
${context}

User Request:
${userRequest}

Generate a complete Form.io form JSON that fulfills the user's request. Return only the JSON code.`;
  },
};

/**
 * Get prompt template for specific output type
 */
export function getPromptTemplate(outputType: OutputType): PromptTemplate {
  switch (outputType) {
    case 'sql':
      return sqlTemplate;
    case 'n8n':
      return n8nTemplate;
    case 'formio':
      return formioTemplate;
    default:
      throw new Error(`Unknown output type: ${outputType}`);
  }
}

/**
 * Build complete prompts for generation
 */
export function buildPrompts(
  outputType: OutputType,
  context: string,
  userRequest: string
): { systemPrompt: string; userPrompt: string } {
  const template = getPromptTemplate(outputType);
  
  return {
    systemPrompt: template.systemPrompt,
    userPrompt: template.buildUserPrompt(context, userRequest),
  };
}
