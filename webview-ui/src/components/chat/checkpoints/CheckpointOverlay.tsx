import { useCallback, useRef, useState } from "react"
import { useClickAway, useEvent } from "react-use"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

import { ExtensionMessage } from "../../../../../src/shared/ExtensionMessage"
// import { vscode } from "../../../utils/vscode"

import {
	CheckpointControls,
	CheckpointRestoreConfirmTooltip as RestoreConfirmTooltip,
	CheckpointRestoreOption as RestoreOption,
} from "./styles"

// type ClineCheckpointRestore = "task" | "workspace" | "taskAndWorkspace"

interface CheckpointOverlayProps {
	messageTs?: number
}

export const CheckpointOverlay = ({ messageTs }: CheckpointOverlayProps) => {
	const [compareDisabled, setCompareDisabled] = useState(false)
	const [restoreTaskDisabled, setRestoreTaskDisabled] = useState(false)
	const [restoreWorkspaceDisabled, setRestoreWorkspaceDisabled] = useState(false)
	const [restoreBothDisabled, setRestoreBothDisabled] = useState(false)
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
	const [hasMouseEntered, setHasMouseEntered] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)

	useClickAway(containerRef, () => {
		if (showRestoreConfirm) {
			setShowRestoreConfirm(false)
			setHasMouseEntered(false)
		}
	})

	const handleMessage = useCallback(({ data: message }: MessageEvent<ExtensionMessage>) => {
		console.log("message", message)

		// switch (message.type) {
		// 	case "relinquishControl": {
		// 		setCompareDisabled(false)
		// 		setRestoreTaskDisabled(false)
		// 		setRestoreWorkspaceDisabled(false)
		// 		setRestoreBothDisabled(false)
		// 		setShowRestoreConfirm(false)
		// 		break
		// 	}
		// }
	}, [])

	useEvent("message", handleMessage)

	const handleRestoreTask = () => {
		setRestoreTaskDisabled(true)

		// vscode.postMessage({
		// 	type: "checkpointRestore",
		// 	number: messageTs,
		// 	text: "task" satisfies ClineCheckpointRestore,
		// })
	}

	const handleRestoreWorkspace = () => {
		setRestoreWorkspaceDisabled(true)

		// vscode.postMessage({
		// 	type: "checkpointRestore",
		// 	number: messageTs,
		// 	text: "workspace" satisfies ClineCheckpointRestore,
		// })
	}

	const handleRestoreBoth = () => {
		setRestoreBothDisabled(true)

		// vscode.postMessage({
		// 	type: "checkpointRestore",
		// 	number: messageTs,
		// 	text: "taskAndWorkspace" satisfies ClineCheckpointRestore,
		// })
	}

	const handleMouseEnter = () => {
		setHasMouseEntered(true)
	}

	const handleMouseLeave = () => {
		if (hasMouseEntered) {
			setShowRestoreConfirm(false)
			setHasMouseEntered(false)
		}
	}

	const handleControlsMouseLeave = (e: React.MouseEvent) => {
		const tooltipElement = tooltipRef.current

		if (tooltipElement && showRestoreConfirm) {
			const tooltipRect = tooltipElement.getBoundingClientRect()

			// If mouse is moving towards the tooltip, don't close it.
			if (
				e.clientY >= tooltipRect.top &&
				e.clientY <= tooltipRect.bottom &&
				e.clientX >= tooltipRect.left &&
				e.clientX <= tooltipRect.right
			) {
				return
			}
		}

		setShowRestoreConfirm(false)
		setHasMouseEntered(false)
	}

	return (
		<CheckpointControls onMouseLeave={handleControlsMouseLeave}>
			<VSCodeButton
				title="Compare"
				appearance="secondary"
				disabled={compareDisabled}
				style={{ cursor: compareDisabled ? "wait" : "pointer" }}
				onClick={() => {
					setCompareDisabled(true)

					// vscode.postMessage({
					// 	type: "checkpointDiff",
					// 	number: messageTs,
					// })
				}}>
				<i className="codicon codicon-diff-multiple" style={{ position: "absolute" }} />
			</VSCodeButton>
			<div style={{ position: "relative" }} ref={containerRef}>
				<VSCodeButton
					title="Restore"
					appearance="secondary"
					style={{ cursor: "pointer" }}
					onClick={() => setShowRestoreConfirm(true)}>
					<i className="codicon codicon-discard" style={{ position: "absolute" }} />
				</VSCodeButton>
				{showRestoreConfirm && (
					<RestoreConfirmTooltip
						ref={tooltipRef}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}>
						<RestoreOption>
							<VSCodeButton
								onClick={handleRestoreBoth}
								disabled={restoreBothDisabled}
								style={{
									cursor: restoreBothDisabled ? "wait" : "pointer",
								}}>
								Restore Task and Workspace
							</VSCodeButton>
							<p>Restores the task and your project's files back to a snapshot taken at this point</p>
						</RestoreOption>
						<RestoreOption>
							<VSCodeButton
								onClick={handleRestoreTask}
								disabled={restoreTaskDisabled}
								style={{
									cursor: restoreTaskDisabled ? "wait" : "pointer",
								}}>
								Restore Task Only
							</VSCodeButton>
							<p>Deletes messages after this point (does not affect workspace)</p>
						</RestoreOption>
						<RestoreOption>
							<VSCodeButton
								onClick={handleRestoreWorkspace}
								disabled={restoreWorkspaceDisabled}
								style={{
									cursor: restoreWorkspaceDisabled ? "wait" : "pointer",
								}}>
								Restore Workspace Only
							</VSCodeButton>
							<p>
								Restores your project's files to a snapshot taken at this point (task may become out of
								sync)
							</p>
						</RestoreOption>
					</RestoreConfirmTooltip>
				)}
			</div>
		</CheckpointControls>
	)
}
