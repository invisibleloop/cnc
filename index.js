/**
 * Conventional Commit Creator
 * Main entry point for the CLI tool
 */

import { runPrompts, confirmCommit, showSuccess, showError, reviewAiSuggestion, editAiSuggestion, showAiGenerating } from './lib/prompts.js';
import { buildCommitMessage } from './lib/validator.js';
import { executeCommit, getBranchReference, getStagedDiff } from './lib/commit.js';
import { isOllamaAvailable, generateCommitMessage } from './lib/ollama.js';
import * as p from '@clack/prompts';

/**
 * Gets commit data using AI or manual prompts
 * @returns {Promise<Object>} The commit data
 */
async function getCommitData() {
  // Check if Ollama is available
  const ollamaReady = await isOllamaAvailable();

  if (ollamaReady) {
    // Try AI-generated commit
    const diff = getStagedDiff();

    if (!diff) {
      p.log.warn('No staged changes found for AI analysis. Using manual mode.');
      return await runPrompts();
    }

    // Generate commit with AI
    let commitData;
    while (true) {
      const spinner = showAiGenerating();
      spinner.start('Generating commit message with AI...');

      try {
        commitData = await generateCommitMessage(diff);
        spinner.stop('AI generation complete!');
      } catch (error) {
        spinner.stop('AI generation failed.');
        p.log.error(`Failed to generate with AI: ${error.message}`);
        p.log.warn('Falling back to manual mode.');
        return await runPrompts();
      }

      // Add branch reference
      const branchRef = getBranchReference();
      if (branchRef) {
        const refText = `Refs #${branchRef}`;
        commitData.footer = commitData.footer
          ? `${commitData.footer}\n${refText}`
          : refText;
      }

      // Build message and show to user
      const message = buildCommitMessage(commitData);
      const action = await reviewAiSuggestion(commitData, message);

      if (action === 'accept') {
        return commitData;
      } else if (action === 'edit') {
        return await editAiSuggestion(commitData);
      } else if (action === 'manual') {
        return await runPrompts();
      }
      // If 'regenerate', loop continues
    }
  } else {
    // Ollama not available, use manual prompts
    p.log.info('Ollama not available. Using manual mode.');
    return await runPrompts();
  }
}

async function main() {
  try {
    p.intro('Conventional Commit Creator');

    // Get commit data (AI or manual)
    const commitData = await getCommitData();

    // If manual mode was used, add branch reference
    if (!commitData.footer || !commitData.footer.includes('Refs #')) {
      const branchRef = getBranchReference();
      if (branchRef) {
        const refText = `Refs #${branchRef}`;
        commitData.footer = commitData.footer
          ? `${commitData.footer}\n${refText}`
          : refText;
      }
    }

    // Build the commit message from the collected data
    const message = buildCommitMessage(commitData);

    // Show preview and ask for confirmation
    const confirmed = await confirmCommit(message);

    if (!confirmed) {
      process.exit(0);
    }

    // Execute the git commit
    const result = executeCommit(message);

    if (result.success) {
      showSuccess('Commit created successfully!');
    } else {
      showError(result.error);
      process.exit(1);
    }
  } catch (error) {
    showError(`An error occurred: ${error.message}`);
    process.exit(1);
  }
}

main();
