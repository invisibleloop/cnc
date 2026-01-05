/**
 * Interactive prompts for collecting commit information
 */

import * as p from '@clack/prompts';
import { COMMIT_TYPES, validateDescription } from './validator.js';

/**
 * Runs the interactive prompt flow to collect commit information
 * @returns {Promise<Object|null>} The collected commit data or null if cancelled
 */
export async function runPrompts() {
  const commitData = await p.group(
    {
      type: () =>
        p.select({
          message: 'Select commit type:',
          options: [
            { value: 'feat', label: 'feat', hint: 'A new feature' },
            { value: 'fix', label: 'fix', hint: 'A bug fix' },
            { value: 'docs', label: 'docs', hint: 'Documentation only changes' },
            { value: 'style', label: 'style', hint: 'Code style changes (formatting, etc)' },
            { value: 'refactor', label: 'refactor', hint: 'Code refactoring' },
            { value: 'perf', label: 'perf', hint: 'Performance improvements' },
            { value: 'test', label: 'test', hint: 'Adding or updating tests' },
            { value: 'build', label: 'build', hint: 'Build system or dependencies' },
            { value: 'ci', label: 'ci', hint: 'CI/CD changes' },
            { value: 'chore', label: 'chore', hint: 'Other changes' },
            { value: 'revert', label: 'revert', hint: 'Revert a previous commit' }
          ]
        }),

      scope: () =>
        p.text({
          message: 'Commit scope (optional):',
          placeholder: 'e.g., parser, api, ui',
          validate: (value) => {
            if (!value) return;
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
              return 'Scope should only contain letters, numbers, hyphens, and underscores';
            }
          }
        }),

      description: () =>
        p.text({
          message: 'Short description:',
          placeholder: 'e.g., add ability to parse arrays',
          validate: (value) => {
            const result = validateDescription(value);
            return result === true ? undefined : result;
          }
        }),

      isBreaking: () =>
        p.confirm({
          message: 'Is this a breaking change?',
          initialValue: false
        }),

      breakingDescription: ({ results }) =>
        results.isBreaking
          ? p.text({
              message: 'Describe the breaking change:',
              placeholder: 'e.g., arrays are now parsed differently',
              validate: (value) => {
                if (!value || value.trim() === '') {
                  return 'Breaking change description is required';
                }
              }
            })
          : undefined,

      footer: () =>
        p.text({
          message: 'Footer (optional):',
          placeholder: 'e.g., Closes #123, Refs #456'
        })
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  );

  return commitData;
}

/**
 * Shows a preview of the commit message and asks for confirmation
 * @param {string} message - The commit message to preview
 * @returns {Promise<boolean>} True if confirmed, false otherwise
 */
export async function confirmCommit(message) {
  p.note(message, 'Commit message preview:');

  const shouldCommit = await p.confirm({
    message: 'Create commit with this message?',
    initialValue: true
  });

  if (p.isCancel(shouldCommit)) {
    p.cancel('Operation cancelled.');
    return false;
  }

  return shouldCommit;
}

/**
 * Shows a success message
 * @param {string} message - The message to display
 */
export function showSuccess(message) {
  p.outro(message);
}

/**
 * Shows an error message
 * @param {string} message - The error message to display
 */
export function showError(message) {
  p.cancel(message);
}

/**
 * Shows AI-generated commit suggestion and gets user action
 * @param {Object} commitData - The AI-generated commit data
 * @param {string} message - The formatted commit message
 * @returns {Promise<string>} Action: 'accept', 'edit', 'regenerate', or 'manual'
 */
export async function reviewAiSuggestion(commitData, message) {
  p.note(message, '🤖 AI-generated commit message:');

  const action = await p.select({
    message: 'What would you like to do?',
    options: [
      { value: 'accept', label: 'Accept', hint: 'Use this commit message' },
      { value: 'edit', label: 'Edit', hint: 'Modify the AI suggestion' },
      { value: 'regenerate', label: 'Regenerate', hint: 'Ask AI to try again' },
      { value: 'manual', label: 'Manual', hint: 'Create commit manually' }
    ]
  });

  if (p.isCancel(action)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return action;
}

/**
 * Allows user to edit AI-generated commit data
 * @param {Object} commitData - The initial commit data
 * @returns {Promise<Object>} The edited commit data
 */
export async function editAiSuggestion(commitData) {
  const edited = await p.group(
    {
      type: () =>
        p.select({
          message: 'Commit type:',
          initialValue: commitData.type,
          options: [
            { value: 'feat', label: 'feat', hint: 'A new feature' },
            { value: 'fix', label: 'fix', hint: 'A bug fix' },
            { value: 'docs', label: 'docs', hint: 'Documentation only changes' },
            { value: 'style', label: 'style', hint: 'Code style changes (formatting, etc)' },
            { value: 'refactor', label: 'refactor', hint: 'Code refactoring' },
            { value: 'perf', label: 'perf', hint: 'Performance improvements' },
            { value: 'test', label: 'test', hint: 'Adding or updating tests' },
            { value: 'build', label: 'build', hint: 'Build system or dependencies' },
            { value: 'ci', label: 'ci', hint: 'CI/CD changes' },
            { value: 'chore', label: 'chore', hint: 'Other changes' },
            { value: 'revert', label: 'revert', hint: 'Revert a previous commit' }
          ]
        }),

      scope: () =>
        p.text({
          message: 'Commit scope (optional):',
          placeholder: commitData.scope || 'e.g., parser, api, ui',
          initialValue: commitData.scope,
          validate: (value) => {
            if (!value) return;
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
              return 'Scope should only contain letters, numbers, hyphens, and underscores';
            }
          }
        }),

      description: () =>
        p.text({
          message: 'Short description:',
          placeholder: commitData.description,
          initialValue: commitData.description,
          validate: (value) => {
            const result = validateDescription(value);
            return result === true ? undefined : result;
          }
        }),

      isBreaking: () =>
        p.confirm({
          message: 'Is this a breaking change?',
          initialValue: commitData.isBreaking || false
        }),

      breakingDescription: ({ results }) =>
        results.isBreaking
          ? p.text({
              message: 'Describe the breaking change:',
              placeholder: commitData.breakingDescription || 'e.g., API endpoint changed',
              initialValue: commitData.breakingDescription || '',
              validate: (value) => {
                if (!value || value.trim() === '') {
                  return 'Breaking change description is required';
                }
              }
            })
          : undefined
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  );

  // Preserve the footer from the original
  edited.footer = commitData.footer;

  return edited;
}

/**
 * Shows a spinner while AI is generating
 * @returns {Object} Spinner object with stop method
 */
export function showAiGenerating() {
  return p.spinner();
}
