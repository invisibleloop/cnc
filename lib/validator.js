/**
 * Validation functions for Conventional Commits
 */

const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert'
];

/**
 * Validates if the commit type is allowed
 * @param {string} type - The commit type
 * @returns {boolean} True if valid
 */
export function validateCommitType(type) {
  return COMMIT_TYPES.includes(type);
}

/**
 * Validates the scope (optional field)
 * Scope should be alphanumeric with hyphens and underscores
 * @param {string} scope - The commit scope
 * @returns {boolean} True if valid or empty
 */
export function validateScope(scope) {
  if (!scope || scope.trim() === '') return true;
  return /^[a-zA-Z0-9_-]+$/.test(scope);
}

/**
 * Validates the description
 * Must not be empty and shouldn't end with a period
 * @param {string} description - The commit description
 * @returns {string|boolean} Error message if invalid, true if valid
 */
export function validateDescription(description) {
  if (!description || description.trim() === '') {
    return 'Description is required';
  }
  if (description.endsWith('.')) {
    return 'Description should not end with a period';
  }
  return true;
}

/**
 * Builds the complete commit message from the collected data
 * @param {Object} data - The commit data
 * @param {string} data.type - Commit type
 * @param {string} [data.scope] - Commit scope (optional)
 * @param {string} data.description - Commit description
 * @param {boolean} [data.isBreaking] - Whether this is a breaking change
 * @param {string} [data.breakingDescription] - Breaking change description
 * @param {string} [data.footer] - Footer (e.g., issue references)
 * @returns {string} The formatted commit message
 */
export function buildCommitMessage(data) {
  let message = '';

  // Build the header: type(scope): description
  message += data.type;
  if (data.scope) {
    message += `(${data.scope})`;
  }
  // Add ! for breaking changes
  if (data.isBreaking) {
    message += '!';
  }
  // Ensure description starts with lowercase for commitlint
  const description = data.description.charAt(0).toLowerCase() + data.description.slice(1);
  message += `: ${description}`;

  // Add breaking change in body if provided
  if (data.isBreaking && data.breakingDescription) {
    message += `\n\nBREAKING CHANGE: ${data.breakingDescription}`;
  }

  // Add footer if provided
  if (data.footer) {
    message += `\n\n${data.footer}`;
  }

  return message;
}

export { COMMIT_TYPES };
