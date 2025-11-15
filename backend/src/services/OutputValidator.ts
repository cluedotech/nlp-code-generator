import { OutputType } from './PromptTemplates';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
}

/**
 * Validate SQL syntax
 */
function validateSQL(code: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Basic SQL validation checks
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    errors.push('Generated SQL is empty');
    return { isValid: false, errors, suggestions };
  }

  // Check for common SQL keywords
  const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i;
  if (!sqlKeywords.test(trimmedCode)) {
    errors.push('Generated code does not appear to be valid SQL');
    suggestions.push('Ensure the request clearly describes a database operation');
  }

  // Check for balanced parentheses
  const openParens = (trimmedCode.match(/\(/g) || []).length;
  const closeParens = (trimmedCode.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unbalanced parentheses in SQL query');
    suggestions.push('Check for missing opening or closing parentheses');
  }

  // Check for unterminated strings
  const singleQuotes = (trimmedCode.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    errors.push('Unterminated string literal in SQL query');
    suggestions.push('Check for missing closing quotes');
  }

  // Check for SELECT without FROM (except for special cases like SELECT 1)
  if (/\bSELECT\b/i.test(trimmedCode) && !/\bFROM\b/i.test(trimmedCode)) {
    const isSimpleSelect = /SELECT\s+[\d'"][^;]*$/i.test(trimmedCode);
    if (!isSimpleSelect) {
      errors.push('SELECT statement missing FROM clause');
      suggestions.push('Add a FROM clause to specify the table(s) to query');
    }
  }

  // Warn about potential SQL injection patterns (though this is generated code)
  if (/\$\{|\$\(|`/.test(trimmedCode)) {
    suggestions.push('Generated SQL contains template literals or shell syntax - verify this is intentional');
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Validate n8n workflow JSON
 */
function validateN8nWorkflow(code: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];

  try {
    const workflow = JSON.parse(code);

    // Check required n8n workflow structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('n8n workflow must contain a "nodes" array');
    } else if (workflow.nodes.length === 0) {
      errors.push('n8n workflow must contain at least one node');
    }

    if (!workflow.connections || typeof workflow.connections !== 'object') {
      errors.push('n8n workflow must contain a "connections" object');
    }

    // Validate nodes structure
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      workflow.nodes.forEach((node: any, index: number) => {
        if (!node.name) {
          errors.push(`Node at index ${index} is missing a "name" property`);
        }
        if (!node.type) {
          errors.push(`Node at index ${index} is missing a "type" property`);
        }
        if (!node.position || typeof node.position !== 'object') {
          errors.push(`Node at index ${index} is missing valid "position" coordinates`);
        }
        if (!node.parameters || typeof node.parameters !== 'object') {
          suggestions.push(`Node "${node.name || index}" has no parameters - verify this is intentional`);
        }
      });
    }

    // Check for isolated nodes (nodes without connections)
    if (workflow.nodes && workflow.connections && workflow.nodes.length > 1) {
      const connectedNodes = new Set<string>();
      Object.keys(workflow.connections).forEach(nodeName => {
        connectedNodes.add(nodeName);
        const nodeConnections = workflow.connections[nodeName];
        if (nodeConnections && typeof nodeConnections === 'object') {
          Object.values(nodeConnections).forEach((connections: any) => {
            if (Array.isArray(connections)) {
              connections.forEach((conn: any) => {
                if (Array.isArray(conn)) {
                  conn.forEach((c: any) => {
                    if (c && c.node) {
                      connectedNodes.add(c.node);
                    }
                  });
                }
              });
            }
          });
        }
      });

      workflow.nodes.forEach((node: any) => {
        if (!connectedNodes.has(node.name)) {
          suggestions.push(`Node "${node.name}" appears to be isolated (no connections)`);
        }
      });
    }

  } catch (error: any) {
    errors.push(`Invalid JSON: ${error.message}`);
    suggestions.push('Ensure the generated code is valid JSON format');
    return { isValid: false, errors, suggestions };
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Validate Form.io form JSON
 */
function validateFormioForm(code: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];

  try {
    const form = JSON.parse(code);

    // Check required Form.io structure
    if (!form.components || !Array.isArray(form.components)) {
      errors.push('Form.io form must contain a "components" array');
    } else if (form.components.length === 0) {
      errors.push('Form.io form must contain at least one component');
    }

    // Validate components structure
    if (form.components && Array.isArray(form.components)) {
      const componentKeys = new Set<string>();

      form.components.forEach((component: any, index: number) => {
        if (!component.type) {
          errors.push(`Component at index ${index} is missing a "type" property`);
        }
        if (!component.key) {
          errors.push(`Component at index ${index} is missing a "key" property`);
        } else {
          // Check for duplicate keys
          if (componentKeys.has(component.key)) {
            errors.push(`Duplicate component key found: "${component.key}"`);
          }
          componentKeys.add(component.key);

          // Validate key format (should be camelCase or snake_case)
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(component.key)) {
            errors.push(`Component key "${component.key}" contains invalid characters`);
          }
        }
        if (!component.label && component.type !== 'button') {
          suggestions.push(`Component "${component.key || index}" is missing a "label" property`);
        }

        // Validate specific component types
        if (component.type === 'select' || component.type === 'radio' || component.type === 'selectboxes') {
          if (!component.data || !component.data.values) {
            suggestions.push(`Component "${component.key}" of type "${component.type}" should have data.values defined`);
          }
        }

        // Check for validation rules
        if (component.validate && typeof component.validate === 'object') {
          if (component.validate.required && !component.label) {
            suggestions.push(`Required component "${component.key}" should have a label`);
          }
        }
      });
    }

    // Check for submit button
    if (form.components && Array.isArray(form.components)) {
      const hasSubmitButton = form.components.some((c: any) => 
        c.type === 'button' && (c.action === 'submit' || !c.action)
      );
      if (!hasSubmitButton) {
        suggestions.push('Form does not contain a submit button');
      }
    }

  } catch (error: any) {
    errors.push(`Invalid JSON: ${error.message}`);
    suggestions.push('Ensure the generated code is valid JSON format');
    return { isValid: false, errors, suggestions };
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Validate generated output based on type
 */
export function validateOutput(code: string, outputType: OutputType): ValidationResult {
  switch (outputType) {
    case 'sql':
      return validateSQL(code);
    case 'n8n':
      return validateN8nWorkflow(code);
    case 'formio':
      return validateFormioForm(code);
    default:
      return {
        isValid: false,
        errors: [`Unknown output type: ${outputType}`],
        suggestions: [],
      };
  }
}
