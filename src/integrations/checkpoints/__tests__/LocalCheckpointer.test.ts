// npx jest src/integrations/checkpoints/__tests__/LocalCheckpointer.test.ts

import fs from "fs/promises"
import path from "path"
import os from "os"

import { CommitResult, simpleGit, SimpleGit } from "simple-git"

import { LocalCheckpointer } from "../LocalCheckpointer"

describe("LocalCheckpointer", () => {
	let git: SimpleGit
	let testFile: string
	let initialCommit: CommitResult
	const mainBranch = "main"
	const hiddenBranch = "checkpoints"
	let checkpointer: LocalCheckpointer

	beforeEach(async () => {
		// Create a temporary directory for testing.
		const workspacePath = path.join(os.tmpdir(), `checkpointer-test-${Date.now()}`)
		await fs.mkdir(workspacePath)

		// Initialize git repo.
		git = simpleGit(workspacePath)
		await git.init(["--initial-branch", mainBranch])
		await git.addConfig("user.name", "Roo Code")
		await git.addConfig("user.email", "support@roo.vet")

		// Create test file.
		testFile = path.join(workspacePath, "test.txt")
		await fs.writeFile(testFile, "Hello, world!")

		// Create initial commit.
		await git.add(".")
		initialCommit = await git.commit("Initial commit")!

		// Create checkpointer instance.
		checkpointer = await LocalCheckpointer.create({ workspacePath, mainBranch, hiddenBranch })
	})

	afterEach(async () => {
		await fs.rm(checkpointer.workspacePath, { recursive: true, force: true })
	})

	it("creates a hidden branch on initialization", async () => {
		const { all: branches } = await git.branch()
		expect(branches).toContain(mainBranch)
		expect(branches).toContain(hiddenBranch)
	})

	it("saves and lists checkpoints", async () => {
		const commitMessage = "Test checkpoint"

		await fs.writeFile(testFile, "Ahoy, world!")
		const commit = await checkpointer.saveCheckpoint(commitMessage)
		expect(commit?.commit).toBeTruthy()

		const checkpoints = await checkpointer.listCheckpoints()
		expect(checkpoints.length).toBe(2)
		expect(checkpoints[0].message).toBe(commitMessage)
		expect(checkpoints[0].hash).toBe(commit?.commit)
	})

	it("saves and restores checkpoints", async () => {
		await fs.writeFile(testFile, "Ahoy, world!")
		const commit1 = await checkpointer.saveCheckpoint("First checkpoint")
		expect(commit1?.commit).toBeTruthy()
		const details1 = await git.show([commit1!.commit])
		expect(details1).toContain("-Hello, world!")
		expect(details1).toContain("+Ahoy, world!")

		await fs.writeFile(testFile, "Hola, world!")
		const commit2 = await checkpointer.saveCheckpoint("Second checkpoint")
		expect(commit2?.commit).toBeTruthy()
		const details2 = await git.show([commit2!.commit])
		expect(details2).toContain("-Hello, world!")
		expect(details2).toContain("+Hola, world!")

		// Switch to checkpoint 1.
		await checkpointer.restoreCheckpoint(commit1!.commit)
		expect(await fs.readFile(testFile, "utf-8")).toBe("Ahoy, world!")

		// Switch to checkpoint 2.
		await checkpointer.restoreCheckpoint(commit2!.commit)
		expect(await fs.readFile(testFile, "utf-8")).toBe("Hola, world!")

		// Switch back to initial commit.
		await checkpointer.restoreCheckpoint(initialCommit.commit)
		expect(await fs.readFile(testFile, "utf-8")).toBe("Hello, world!")
	})

	it("does nothing if no changes are made since the last checkpoint", async () => {
		await fs.writeFile(testFile, "Ahoy, world!")
		const commit = await checkpointer.saveCheckpoint("First checkpoint")
		expect(commit?.commit).toBeTruthy()

		const commit2 = await checkpointer.saveCheckpoint("Second checkpoint")
		expect(commit2?.commit).toBeFalsy()
	})

	it("preserves pending changes when restoring a checkpoint", async () => {
		await fs.writeFile(testFile, "Ahoy, world!")
		const commit1 = await checkpointer.saveCheckpoint("First checkpoint")
		expect(commit1?.commit).toBeTruthy()

		await fs.writeFile(testFile, "Hola, world!")
		const commit2 = await checkpointer.saveCheckpoint("Second checkpoint")
		expect(commit2?.commit).toBeTruthy()

		await fs.writeFile(testFile, "Bonjour, world!")

		// Restore first checkpoint - this should create a new checkpoint with
		// the pending changes.
		await checkpointer.restoreCheckpoint(commit1!.commit)

		// Verify the pending changes were saved as a checkpoint.
		const checkpoints = await checkpointer.listCheckpoints()
		expect(checkpoints[0].message).toBe(`restoreCheckpoint ${commit1!.commit}`)

		// Verify the content is now from checkpoint1.
		expect(await fs.readFile(testFile, "utf-8")).toBe("Ahoy, world!")
	})
})
