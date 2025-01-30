import styled from "styled-components"

import { CODE_BLOCK_BG_COLOR } from "../../common/CodeBlock"

export const CheckpointControls = styled.div`
	position: absolute;
	top: 3px;
	right: 6px;
	display: flex;
	gap: 6px;
	opacity: 0;
	background-color: var(--vscode-sideBar-background);
	padding: 3px 0 3px 3px;

	& > vscode-button,
	& > div > vscode-button {
		width: 24px;
		height: 24px;
		position: relative;
	}

	& > vscode-button i,
	& > div > vscode-button i {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
	}
`

export const CheckpointRestoreConfirmTooltip = styled.div`
	position: absolute;
	z-index: 1000;
	top: calc(100% - 0.5px);
	right: 0;
	background: ${CODE_BLOCK_BG_COLOR};
	border: 1px solid var(--vscode-editorGroup-border);
	padding: 12px;
	border-radius: 3px;
	margin-top: 8px;
	width: calc(100vw - 57px);
	min-width: 0px;
	max-width: 100vw;

	&::before {
		content: "";
		position: absolute;
		top: -8px; // Same as margin-top.
		left: 0;
		right: 0;
		height: 8px;
	}

	&::after {
		content: "";
		position: absolute;
		z-index: 1; // Ensure arrow stays above the padding.
		top: -6px;
		right: 6px;
		width: 10px;
		height: 10px;
		background: ${CODE_BLOCK_BG_COLOR};
		border-left: 1px solid var(--vscode-editorGroup-border);
		border-top: 1px solid var(--vscode-editorGroup-border);
		transform: rotate(45deg);
	}

	p {
		margin: 0 0 6px 0;
		color: var(--vscode-descriptionForeground);
		font-size: 12px;
		white-space: normal;
		word-wrap: break-word;
	}
`

export const CheckpointRestoreOption = styled.div`
	&:not(:last-child) {
		margin-bottom: 10px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--vscode-editorGroup-border);
	}

	p {
		margin: 0 0 2px 0;
		color: var(--vscode-descriptionForeground);
		font-size: 11px;
		line-height: 14px;
	}

	&:last-child p {
		margin: 0 0 -2px 0;
	}

	vscode-button {
		width: 100%;
		margin-bottom: 10px;
	}
`
