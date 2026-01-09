/**
 * Git commit execution
 */

import { execSync } from 'child_process';

/**
 * Gets the diff of staged changes
 * @returns {string|null} The git diff or null if error/no changes
 */
export function getStagedDiff() {
  try {
    const diff = execSync('git diff --cached', { encoding: 'utf8' });
    return diff.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts the reference from the current git branch name
 * Takes the text after the first "/" in the branch name
 * @returns {string|null} The branch reference or null if not found
 */
export function getBranchReference() {
  try {
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();

    // Extract text after the first "/"
    const slashIndex = branchName.indexOf('/');
    if (slashIndex !== -1 && slashIndex < branchName.length - 1) {
      return branchName.substring(slashIndex + 1);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Executes a git commit with the provided message
 * @param {string} message - The commit message
 * @returns {Object} Result object with success status and optional error
 */
export function executeCommit(message) {
  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch (error) {
    return {
      success: false,
      error: 'Not a git repository. Please run this command inside a git repository.'
    };
  }

  try {
    // Check if there are staged changes
    const status = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    if (!status.trim()) {
      return {
        success: false,
        error: 'No changes staged for commit. Use "git add" to stage changes first.'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check git status.'
    };
  }

  try {
    // Execute the commit
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit'
    });

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create commit. The commit may have been aborted by a git hook.'
    };
  }
}
