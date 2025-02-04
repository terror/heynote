import { keymap } from "@codemirror/view"
import { Vim, vim } from "@replit/codemirror-vim"
import { EditorSelection } from "@codemirror/state"
import {
    indentLess, indentMore, redo,
} from "@codemirror/commands"

import { defaultKeymap } from '@codemirror/commands';

import { 
    insertNewBlockAtCursor, 
    addNewBlockBeforeCurrent, addNewBlockAfterCurrent,
    addNewBlockBeforeFirst, addNewBlockAfterLast,
    moveLineUp, moveLineDown, 
    selectAll, 
    gotoPreviousBlock, gotoNextBlock, 
    selectNextBlock, selectPreviousBlock,
    gotoPreviousParagraph, gotoNextParagraph, 
    selectNextParagraph, selectPreviousParagraph,
    newCursorBelow, newCursorAbove,
    deleteBlock,
} from "./block/commands.js"
import { pasteCommand, copyCommand, cutCommand } from "./copy-paste.js"

import { deleteLine } from "./block/delete-line.js"
import { formatBlockContent } from "./block/format-code.js"
import { getActiveNoteBlockFromPosition } from "./block/block"

export function keymapFromSpec(specs) {
    return keymap.of(specs.map((spec) => {
        if (spec.run) {
            if ("preventDefault" in spec) {
                return spec
            } else {
                return {...spec, preventDefault: true}
            }
        } else {
            const [key, run] = spec
            return {
                key,
                run,
                preventDefault: true,
            }
        }
    }))
}

export function heynoteKeymap(editor) {
    return keymapFromSpec([
        ["Mod-c", copyCommand(editor)],
        ["Mod-v", pasteCommand],
        ["Mod-x", cutCommand(editor)],
        ["Tab", indentMore],
        ["Shift-Tab", indentLess],
        ["Alt-Shift-Enter", addNewBlockBeforeFirst(editor)],
        ["Mod-Shift-Enter", addNewBlockAfterLast(editor)],
        ["Alt-Enter", addNewBlockBeforeCurrent(editor)],
        ["Mod-Enter", addNewBlockAfterCurrent(editor)],
        ["Mod-Alt-Enter", insertNewBlockAtCursor(editor)],
        ["Mod-a", selectAll],
        ["Alt-ArrowUp", moveLineUp],
        ["Alt-ArrowDown", moveLineDown],
        ["Mod-l", () => editor.openLanguageSelector()],
        ["Mod-p", () => editor.openBufferSelector()],
        ["Mod-s", () => editor.openMoveToBufferSelector()],
        ["Mod-n", () => editor.openCreateBuffer("new")],
        ["Mod-Shift-d", deleteBlock(editor)],
        ["Alt-Shift-f", formatBlockContent],
        ["Mod-Alt-ArrowDown", newCursorBelow],
        ["Mod-Alt-ArrowUp", newCursorAbove],
        ["Mod-Shift-k", deleteLine],
        ["Mod-Shift-z", redo],
        {key:"Mod-ArrowUp", run:gotoPreviousBlock, shift:selectPreviousBlock},
        {key:"Mod-ArrowDown", run:gotoNextBlock, shift:selectNextBlock},
        {key:"Ctrl-ArrowUp", run:gotoPreviousParagraph, shift:selectPreviousParagraph},
        {key:"Ctrl-ArrowDown", run:gotoNextParagraph, shift:selectNextParagraph},
    ])
}

export function vimKeymap(editor) {
    Vim.defineOperator("delete", function(cm, _operatorArgs, ranges, _oldAnchor, _newHead) {
        const view = cm.cm6;
        const state = view.viewState.state;

        const line = state.doc.line(ranges[0].anchor.line);

        const block = getActiveNoteBlockFromPosition(state, line.from);
        const blockContent = state.doc.sliceString(block.content.from, block.content.to);

        if (!blockContent.includes("\n")) {
            const transaction = state.update({
                selection: EditorSelection.cursor(block.content.from)
            });

            view.dispatch(transaction);
            
            return deleteBlock(state)(view);
        }
        
        return deleteLine(view);
    });

    defaultKeymap.unshift(
        { keys: "d", type: "operator", operator: "delete", context: "normal" },
        { keys: "d", type: "operator", operator: "delete", context: "visual" }
    );

    return [heynoteKeymap(editor), vim()];
}
