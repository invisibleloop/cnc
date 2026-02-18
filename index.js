/**
 * Conventional Commit Creator
 * Main entry point for the CLI tool
 */

import { runPrompts, confirmCommit, showSuccess, showError, reviewAiSuggestion, editAiSuggestion, showAiGenerating, askBranchReferencePlacement, PUBLISHABLE_TYPES } from './lib/prompts.js';
import { buildCommitMessage, validateHeaderLength } from './lib/validator.js';
import { executeCommit, getBranchReference, getStagedDiff } from './lib/commit.js';
import { isOllamaAvailable, generateCommitMessage } from './lib/ollama.js';
import * as p from '@clack/prompts';

/**
 * Parses CLI flags from process.argv
 * -p    commit will be published to npm
 * -h    include branch reference in header
 * -ns   do not use scope
 * -nai  skip AI generation and use manual prompts
 * @returns {{ publish: boolean, branchInHeader: boolean, noScope: boolean, noAi: boolean }}
 */
function parseFlags() {
  const args = process.argv.slice(2);
  return {
    publish: args.includes('-p'),
    branchInHeader: args.includes('-h'),
    noScope: args.includes('-ns'),
    noAi: args.includes('-nai')
  };
}

/**
 * Gets commit data using AI or manual prompts
 * @param {Object} flags - CLI flags
 * @param {string|null} branchRef - Branch reference to be appended if -h flag is set
 * @returns {Promise<Object>} The commit data
 */
async function getCommitData(flags, branchRef) {
  // Skip AI if -nai flag is set
  if (flags.noAi) {
    return { data: await runPrompts(flags), wasEdited: true };
  }

  // Check if Ollama is available
  const ollamaReady = await isOllamaAvailable();

  if (ollamaReady) {
    // Try AI-generated commit
    const diff = getStagedDiff();

    // Generate commit with AI
    let commitData;
    const publishableTypeValues = PUBLISHABLE_TYPES.map(t => t.value);
    const generateOptions = flags.publish ? { allowedTypes: publishableTypeValues } : {};

    while (true) {
      const spinner = showAiGenerating();
      spinner.start('Generating commit message with AI...');

      try {
        commitData = await generateCommitMessage(diff, generateOptions);
        spinner.stop('AI generation complete!');
      } catch (error) {
        spinner.stop('AI generation failed.');
        p.log.error(`Failed to generate with AI: ${error.message}`);
        p.log.warn('Falling back to manual mode.');
        return { data: await runPrompts(flags), wasEdited: true };
      }

      // Apply flags to AI-generated data before preview
      if (flags.noScope) {
        commitData.scope = '';
      }

      // If -p flag is set, ensure the AI-chosen type is publishable
      if (flags.publish && !publishableTypeValues.includes(commitData.type)) {
        p.log.warn(`Flag -p: AI selected non-publishable type "${commitData.type}". Please correct it.`);
        return { data: await editAiSuggestion(commitData, flags), wasEdited: true };
      }

      // Validate header length, accounting for branch ref overhead if -h is set
      const refOverhead = flags.branchInHeader && branchRef ? ` [${branchRef}]`.length : 0;
      const headerValidation = validateHeaderLength({
        ...commitData,
        description: commitData.description + ' '.repeat(refOverhead)
      });
      if (!headerValidation.valid) {
        p.log.warn(
          `⚠️  Header is too long: ${headerValidation.length}/${headerValidation.limit} characters.\n` +
          `   Consider editing to shorten the scope or description.`
        );
      }

      // Build message and show to user (include ref in preview if available)
      const previewData = branchRef
        ? { ...commitData, description: `${commitData.description} [${branchRef}]` }
        : commitData;
      const message = buildCommitMessage(previewData);
      const action = await reviewAiSuggestion(commitData, message);

      if (action === 'accept') {
        return { data: commitData, wasEdited: false };
      } else if (action === 'edit') {
        return { data: await editAiSuggestion(commitData, flags), wasEdited: true };
      } else if (action === 'manual') {
        return { data: await runPrompts(flags), wasEdited: true };
      }
      // If 'regenerate', loop continues
    }
  } else {
    // Ollama not available, use manual prompts
    p.log.info('Ollama not available. Using manual mode.');
    return { data: await runPrompts(flags), wasEdited: true };
  }
}

async function main() {
  try {
    const flags = parseFlags();

    p.intro('Conventional Commit Creator');

    // Check for staged changes first
    const diff = getStagedDiff();
    if (!diff) {
      showError('No changes staged for commit. Use "git add" to stage changes first.');
      process.exit(1);
    }

    // Resolve branch ref early so header validation can account for it
    const branchRef = getBranchReference();

    // Get commit data (AI or manual)
    const { data: commitData, wasEdited } = await getCommitData(flags, branchRef);

    // Apply flags that affect the final commit data
    if (flags.noScope) {
      commitData.scope = undefined;
    }

    if (flags.branchInHeader && !branchRef) {
      p.log.warn('Flag -h: no branch reference found. Branch must contain a "/" (e.g. feat/CNC-123).');
    }
    if (branchRef) {
      const placement = (flags.branchInHeader && !wasEdited)
        ? 'header'
        : await askBranchReferencePlacement(branchRef);
      if (placement === 'header') {
        commitData.description = `${commitData.description} [${branchRef}]`;
      } else if (placement === 'footer') {
        // Add to footer with Refs # format
        const footerRef = `Refs #${branchRef}`;
        if (commitData.footer) {
          commitData.footer = `${commitData.footer}\n${footerRef}`;
        } else {
          commitData.footer = footerRef;
        }
      }
      // If 'none', do nothing
    }

    // Validate header length before building
    const headerValidation = validateHeaderLength(commitData);
    if (!headerValidation.valid) {
      p.log.warn(
        `⚠️  Header is too long: ${headerValidation.length}/${headerValidation.limit} characters.\n` +
        `   The commit will likely fail validation. Consider shortening the scope or description.`
      );
    }

    // Show preview, allow editing, and ask for confirmation
    let message;
    while (true) {
      message = buildCommitMessage(commitData);
      const action = await confirmCommit(message);

      if (action === 'yes') {
        break;
      } else if (action === 'edit') {
        const edited = await editAiSuggestion(commitData, flags);
        Object.assign(commitData, edited);
        const headerValidation = validateHeaderLength(commitData);
        if (!headerValidation.valid) {
          p.log.warn(
            `⚠️  Header is too long: ${headerValidation.length}/${headerValidation.limit} characters.\n` +
            `   Consider shortening the scope or description.`
          );
        }
      } else {
        process.exit(0);
      }
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
