import { existsSync } from "fs"
import path from "path"

import simpleGit, { SimpleGit, VersionResult, SimpleGitOptions } from "simple-git"

export interface Checkpoint {
	hash: string
	message: string
	timestamp?: Date
}

export type CheckpointerOptions = {
	workspacePath: string
	mainBranch: string
	hiddenBranch: string
}

export class LocalCheckpointer {
	public readonly workspacePath: string
	public readonly mainBranch: string
	public readonly hiddenBranch: string
	private git: SimpleGit
	public gitVersion?: VersionResult

	public static async create(options: CheckpointerOptions) {
		const checkpointer = new LocalCheckpointer(options)
		await checkpointer.ensureGitInstalled()
		await checkpointer.ensureGitRepo()
		await checkpointer.initGitConfig()
		await checkpointer.initHiddenBranch()
		return checkpointer
	}

	constructor({ workspacePath, mainBranch, hiddenBranch }: CheckpointerOptions) {
		this.workspacePath = workspacePath
		this.mainBranch = mainBranch
		this.hiddenBranch = hiddenBranch

		const options: SimpleGitOptions = {
			baseDir: workspacePath,
			binary: "git",
			maxConcurrentProcesses: 1,
			config: [],
			trimmed: true,
		}

		this.git = simpleGit(options)
	}

	/**
	 * Ensure that Git is installed.
	 */
	private async ensureGitInstalled() {
		try {
			this.gitVersion = await this.git.version()

			if (!this.gitVersion?.installed) {
				throw new Error()
			}
		} catch (err) {
			throw new Error(`Git is not installed. Please install Git if you wish to use checkpoints.`)
		}
	}

	/**
	 * Checks if .git directory exists. If not, either throw or initialize Git.
	 */
	private async ensureGitRepo() {
		const gitDir = path.join(this.workspacePath, ".git")
		const isGitRepo = existsSync(gitDir)

		if (!isGitRepo) {
			throw new Error(`No .git directory found at ${gitDir}. Please initialize a Git repository first.`)
		}
	}

	/**
	 * Initialize git configuration. Should be called after constructor.
	 */
	private async initGitConfig() {
		try {
			await this.git.addConfig("user.name", "Roo Code")
			await this.git.addConfig("user.email", "support@roo.vet")
		} catch (err) {
			throw new Error(`Failed to configure Git: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	/**
	 * Create the hidden branch if it doesn't exist. Otherwise, do nothing.
	 * If the branch is missing, we base it off the main branch.
	 */
	private async initHiddenBranch(): Promise<void> {
		// Check if the branch already exists.
		const branchSummary = await this.git.branch()

		if (!branchSummary.all.includes(this.hiddenBranch)) {
			// Create the new branch from main.
			await this.git.checkoutBranch(this.hiddenBranch, this.mainBranch)

			// Switch back to main.
			await this.git.checkout(this.mainBranch)
		}
	}

	private async pushStash() {
		try {
			const status = await this.git.status()

			if (status.files.length > 0) {
				await this.git.stash() // This stashes both tracked and untracked files by default.
				return true
			} else {
				return undefined
			}
		} catch (err) {
			return false
		}
	}

	private async applyStash() {
		try {
			const stashList = await this.git.stashList()

			if (stashList.all.length > 0) {
				await this.git.stash(["apply"]) // Apply the most recent stash.
				return true
			} else {
				return undefined
			}
		} catch (err) {
			return false
		}
	}

	private async popStash() {
		try {
			const stashList = await this.git.stashList()

			if (stashList.all.length > 0) {
				await this.git.stash(["pop"]) // Pop the most recent stash.
				return true
			} else {
				return undefined
			}
		} catch (err) {
			return false
		}
	}

	private async dropStash() {
		try {
			const stashList = await this.git.stashList()

			if (stashList.all.length > 0) {
				await this.git.stash(["drop", "0"]) // Drop the most recent stash.
				return true
			} else {
				return undefined
			}
		} catch (err) {
			return false
		}
	}

	/**
	 * List commits on the hidden branch as checkpoints.
	 * We can parse the commit log to build an array of `Checkpoint`.
	 */
	public async listCheckpoints(): Promise<Checkpoint[]> {
		const log = await this.git.log({ "--all": null, "--branches": this.hiddenBranch })

		return log.all.map((commit) => ({
			hash: commit.hash,
			message: commit.message,
			timestamp: commit.date ? new Date(commit.date) : undefined,
		}))
	}

	/**
	 * Commit changes in the working directory (on the hidden branch) as a new checkpoint.
	 * Preserves the current state of the main branch.
	 */
	public async saveCheckpoint(message: string) {
		const branch = await this.git.revparse(["--abbrev-ref", "HEAD"])

		if (branch.trim() !== this.mainBranch) {
			throw new Error(`Must be on ${this.mainBranch} branch to save checkpoints. Currently on: ${branch}`)
		}

		const pendingChanges = await this.pushStash()

		if (!pendingChanges) {
			return undefined
		}

		try {
			// Get the latest commit on the hidden branch before we reset it.
			const latestHash = await this.git.revparse([this.hiddenBranch])

			// Reset hidden branch to match main and apply the pending changes.
			await this.git.checkout(this.hiddenBranch)
			await this.git.reset(["--hard", this.mainBranch])
			await this.applyStash()

			// If there are no changes, we don't need to commit.
			const diff = await this.git.diff([latestHash])

			if (!diff) {
				await this.git.checkout(this.mainBranch)
				await this.popStash()
				return undefined
			}

			// Otherwise, commit the changes.
			await this.git.add(["."])
			const commit = await this.git.commit(message)
			await this.git.checkout(this.mainBranch)
			await this.popStash()
			return commit
		} catch (err) {
			// Ensure we return to main branch and pop stash even if something fails.
			// @TODO: Disable checkpointing since we encountered an error.
			await this.git.checkout(this.mainBranch)
			await this.popStash()
			throw err
		}
	}

	/**
	 * Revert the workspace to a specific commit by resetting the hidden branch to
	 * that commit.
	 */
	public async restoreCheckpoint(commitHash: string) {
		const branch = await this.git.revparse(["--abbrev-ref", "HEAD"])

		if (branch.trim() !== this.mainBranch) {
			throw new Error(`Must be on ${this.mainBranch} branch to restore checkpoints. Currently on: ${branch}`)
		}

		// Persist pending changes in a checkpoint and then discard them.
		const commit = await this.saveCheckpoint(`restoreCheckpoint ${commitHash}`)

		if (commit) {
			await this.pushStash()
			await this.dropStash()
		}

		await this.git.raw(["restore", "--source", commitHash, "--worktree", "--", "."])
	}
}
