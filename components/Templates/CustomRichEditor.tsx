"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    AlignJustify, List, ListOrdered, Palette, Undo, Redo,
    RemoveFormatting, Indent, Outdent,
} from "lucide-react";

export interface CustomRichEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
    defaultHeight?: number;
    keywordsList?: any;
}

const CustomRichEditor: React.FC<CustomRichEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    defaultHeight = 400,
    keywordsList = [],
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const floatingToolbarRef = useRef<HTMLDivElement>(null);

    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false,
        justifyFull: false,
        insertUnorderedList: false,
        insertOrderedList: false,
        outdent: false,
        indent: false,
    });
    const [fontSize, setFontSize] = useState("3");
    const [fontColor, setFontColor] = useState("#000000");

    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredKeywords, setFilteredKeywords] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [searchTerm, setSearchTerm] = useState("");

    // Floating toolbar state
    const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

    const savedRangeRef = useRef<Range | null>(null);

    const checkActiveFormats = useCallback(() => {
        setActiveFormats({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            justifyLeft: document.queryCommandState("justifyLeft"),
            justifyCenter: document.queryCommandState("justifyCenter"),
            justifyRight: document.queryCommandState("justifyRight"),
            insertUnorderedList: document.queryCommandState("insertUnorderedList"),
            insertOrderedList: document.queryCommandState("insertOrderedList"),
            outdent: document.queryCommandState("outdent"),
            indent: document.queryCommandState("indent"),
            justifyFull: document.queryCommandState("justifyFull"),
        });
    }, []);

    const execCommand = (command: string, val: any = null) => {
        document.execCommand(command, false, val);
        editorRef.current?.focus();
        checkActiveFormats();
        if (editorRef.current && onChange) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current && onChange) {
            onChange(editorRef.current.innerHTML);
        }
    };

    // Parse keywords
    const parseKeywords = (): string[] => {
        if (!keywordsList) return [];
        if (Array.isArray(keywordsList)) return keywordsList;

        return String(keywordsList).split(',').map(k => {
            const keyPart = k.split(':')[0];
            return keyPart ? keyPart.trim() : '';
        }).filter(k => k);
    };

    // Get caret position for dropdown
    const getCaretPosition = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return { x: 0, y: 0 };

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        return {
            x: rect.left - (containerRect?.left || 0),
            y: rect.bottom - (containerRect?.top || 0) + 5,
        };
    };

    // Get selection position for floating toolbar
    const getSelectionPosition = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (!containerRect) return null;

        let x = rect.left - containerRect.left + (rect.width / 2) - 150;
        let y = rect.top - containerRect.top - 50;

        x = Math.max(10, Math.min(x, containerRect.width - 310));
        y = Math.max(10, y);

        return { x, y };
    };

    // Check if text is selected
    const checkSelection = () => {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : "";

        if (text.length > 0) {
            const pos = getSelectionPosition();
            if (pos) {
                setToolbarPosition(pos);
                setShowFloatingToolbar(true);
                checkActiveFormats();
            }
        } else {
            setShowFloatingToolbar(false);
        }
    };

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }
    };

    const insertKeyword = (keyword: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        // ✅ Save current scroll position BEFORE making changes
        const container = containerRef.current;
        const scrollTop = container?.scrollTop || 0;
        const scrollLeft = container?.scrollLeft || 0;

        // Don't force focus immediately - this causes scroll jump
        // editor.focus();  // ❌ COMMENT THIS OUT

        let range: Range | undefined;
        const selection = window.getSelection();
        if (!selection) return;

        if (savedRangeRef.current) {
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
            range = selection.getRangeAt(0);
        } else {
            if (selection.rangeCount === 0) return;
            range = selection.getRangeAt(0);
        }

        if (searchTerm && searchTerm.trim()) {
            const textNode = range.startContainer;
            if (textNode.nodeType === Node.TEXT_NODE) {
                const currentText = textNode.textContent || "";
                const cursorOffset = range.startOffset;

                const beforeCursor = currentText.substring(0, cursorOffset);
                const searchIndex = beforeCursor.toLowerCase().lastIndexOf(searchTerm.toLowerCase());

                if (searchIndex !== -1) {
                    range.setStart(textNode, searchIndex);
                    range.setEnd(textNode, cursorOffset);
                    range.deleteContents();
                }
            }
        }

        const textNode = document.createTextNode(keyword);
        range.insertNode(textNode);

        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        savedRangeRef.current = range.cloneRange();

        if (onChange) {
            onChange(editor.innerHTML);
        }

        // ✅ Restore scroll position
        if (container) {
            container.scrollTop = scrollTop;
            container.scrollLeft = scrollLeft;
        }

        setShowDropdown(false);
        setSearchTerm("");
        setSelectedIndex(0);
    };

    // Handle Ctrl+Space
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.ctrlKey && (e.code === "Space" || e.key === " ")) {
            e.preventDefault();

            const keywords = parseKeywords();
            if (keywords.length === 0) return;

            saveSelection();

            setFilteredKeywords(keywords);
            setSelectedIndex(0);
            setCursorPosition(getCaretPosition());
            setSearchTerm("");
            setShowDropdown(true);
            setShowFloatingToolbar(false);
            return;
        }

        if (showDropdown) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredKeywords.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredKeywords.length) % filteredKeywords.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filteredKeywords[selectedIndex]) {
                    insertKeyword(filteredKeywords[selectedIndex]);
                }
            } else if (e.key === "Escape") {
                setShowDropdown(false);
                setSearchTerm("");
            }
        }
    };

    // Handle mouse up to show floating toolbar
    const handleMouseUp = () => {
        checkActiveFormats();
        setTimeout(checkSelection, 10);
    };

    // Handle selection change
    const handleSelectionChange = () => {
        if (document.activeElement === editorRef.current) {
            setTimeout(checkSelection, 10);
        }
    };

    useEffect(() => {
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => document.removeEventListener("selectionchange", handleSelectionChange);
    }, []);

    // Filter keywords
    useEffect(() => {
        if (!showDropdown) return;

        const keywords = parseKeywords();
        const filtered = keywords.filter(k =>
            k.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredKeywords(filtered);
        setSelectedIndex(0);
    }, [searchTerm, showDropdown]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
            if (floatingToolbarRef.current && !floatingToolbarRef.current.contains(e.target as Node)) {
                if (!editorRef.current?.contains(e.target as Node)) {
                    setShowFloatingToolbar(false);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync value from parent
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || "";
        }
    }, [value]);

    // Floating Toolbar Button
    const FloatingButton = ({ command, value: btnVal, isActive, icon: Icon, title, children }: any) => (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                execCommand(command, btnVal);
                setTimeout(checkSelection, 10);
            }}
            className="p-2 rounded transition-all duration-150 hover:bg-gray-200"
            style={{
                backgroundColor: isActive ? "#3b82f6" : "transparent",
                color: isActive ? "#ffffff" : "#374151",
            }}
            title={title}
        >
            {children || (Icon && <Icon size={16} />)}
        </button>
    );

    const ToolbarButton = ({ command, value: btnVal, isActive, icon: Icon, title, children }: any) => (
        <button
            type="button"
            onClick={() => execCommand(command, btnVal)}
            className={`p-1.5 rounded transition-all duration-150 ${isActive
                ? "bg-blue-500 text-save dark:text-white"
                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
            title={title}
        >
            {children || (Icon && <Icon size={16} />)}
        </button>
    );

    const ColorPicker = () => (
        <div className="relative group">
            <button type="button" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <Palette size={16} style={{ color: fontColor }} className="dark:text-white" />
            </button>
            <input
                type="color"
                value={fontColor}
                onChange={(e) => {
                    setFontColor(e.target.value);
                    execCommand("foreColor", e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
        </div>
    );

    const FontSizeSelector = () => (
        <select
            value={fontSize}
            onChange={(e) => {
                setFontSize(e.target.value);
                execCommand("fontSize", e.target.value);
            }}
            className="px-2 py-1 rounded text-sm bg-white dark:bg-black border border-borderColor dark:border-borderColor-dark text-gray-700 dark:text-gray-300 focus:outline-none"
        >
            <option value="1">Small</option>
            <option value="2">Normal</option>
            <option value="3">Medium</option>
            <option value="4">Large</option>
            <option value="5">X-Large</option>
            <option value="6">XX-Large</option>
            <option value="7">Huge</option>
        </select>
    );

    const HeadingSelector = () => (
        <select
            onChange={(e) => {
                if (e.target.value) execCommand("formatBlock", e.target.value);
                e.target.value = "";
            }}
            className="px-2 py-1 rounded text-sm bg-white dark:bg-black border border-borderColor dark:border-borderColor-dark text-gray-700 dark:text-gray-300 focus:outline-none"
        >
            <option value="">Normal</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
            <option value="H4">Heading 4</option>
            <option value="H5">Heading 5</option>
            <option value="H6">Heading 6</option>
            <option value="P">Paragraph</option>
        </select>
    );

    return (
        <div
            ref={containerRef}
            className={`border border-borderColor dark:border-borderColor-dark rounded-lg overflow-hidden flex flex-col relative ${className || ""}`}
            style={{
                resize: "vertical",
                overflow: "auto",
                minHeight: "200px",
                maxHeight: "2000px",
                height: `${defaultHeight}px`,
            }}
        >
            {/* Main Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-100 dark:bg-black border-b border-borderColor dark:border-borderColor-dark shrink-0">
                <div className="flex gap-0.5 border-r border-borderColor dark:border-borderColor-dark pr-2 mr-1">
                    <ToolbarButton command="undo" title="Undo" icon={Undo} />
                    <ToolbarButton command="redo" title="Redo" icon={Redo} />
                </div>

                <div className="flex gap-0.5 border-r border-borderColor dark:border-borderColor-dark pr-2 mr-1">
                    <ToolbarButton command="bold" isActive={activeFormats.bold} title="Bold" icon={Bold} />
                    <ToolbarButton command="italic" isActive={activeFormats.italic} title="Italic" icon={Italic} />
                    <ToolbarButton command="underline" isActive={activeFormats.underline} title="Underline" icon={Underline} />
                    <ToolbarButton command="strikeThrough" title="Strikethrough">
                        <span className="line-through font-bold text-black dark:text-white">S</span>
                    </ToolbarButton>
                    <ToolbarButton command="removeFormat" title="Clear Formatting" icon={RemoveFormatting} />
                </div>

                <div className="flex gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-1 items-center">
                    <HeadingSelector />
                    <FontSizeSelector />
                </div>

                <div className="flex gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-1">
                    <ToolbarButton command="justifyLeft" isActive={activeFormats.justifyLeft} title="Align Left" icon={AlignLeft} />
                    <ToolbarButton command="justifyCenter" isActive={activeFormats.justifyCenter} title="Align Center" icon={AlignCenter} />
                    <ToolbarButton command="justifyRight" isActive={activeFormats.justifyRight} title="Align Right" icon={AlignRight} />
                    <ToolbarButton command="justifyFull" isActive={activeFormats.justifyFull} title="Justify" icon={AlignJustify} />
                </div>

                <div className="flex gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-1">
                    <ToolbarButton command="insertUnorderedList" isActive={activeFormats.insertUnorderedList} title="Bullet List" icon={List} />
                    <ToolbarButton command="insertOrderedList" isActive={activeFormats.insertOrderedList} title="Numbered List" icon={ListOrdered} />
                </div>

                <div className="flex gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-1">
                    <ToolbarButton command="outdent" isActive={activeFormats.outdent} title="Decrease Indent" icon={Outdent} />
                    <ToolbarButton command="indent" isActive={activeFormats.indent} title="Increase Indent" icon={Indent} />
                </div>

                <div className="flex gap-0.5">
                    <ColorPicker />
                    <div className="relative group">
                        <button type="button" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                            <span className="text-xs font-bold bg-yellow-200 px-1">A</span>
                        </button>
                        <input
                            type="color"
                            onChange={(e) => execCommand("hiliteColor", e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyUp={checkActiveFormats}
                onMouseUp={handleMouseUp}
                onClick={checkActiveFormats}
                onKeyDown={handleKeyDown}
                className="flex-1 p-4 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none overflow-y-auto"
                style={{
                    lineHeight: "1.6",
                    fontSize: "14px",
                }}
                placeholder={placeholder}
            />

            {/* Floating Toolbar */}
            {showFloatingToolbar && (
                <div
                    ref={floatingToolbarRef}
                    className="absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-lg border"
                    style={{
                        left: `${toolbarPosition.x}px`,
                        top: `${toolbarPosition.y}px`,
                        backgroundColor: "#ffffff",
                        borderColor: "#d1d5db",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <FloatingButton command="bold" isActive={activeFormats.bold} title="Bold" icon={Bold} />
                    <FloatingButton command="italic" isActive={activeFormats.italic} title="Italic" icon={Italic} />
                    <FloatingButton command="underline" isActive={activeFormats.underline} title="Underline" icon={Underline} />

                    <div className="relative">
                        <button type="button" className="p-1.5 rounded hover:bg-gray-200" style={{ color: fontColor }} title="Text Color" onMouseDown={(e) => e.preventDefault()}>
                            <Palette size={14} />
                        </button>
                        <input type="color" value={fontColor} onChange={(e) => { setFontColor(e.target.value); execCommand("foreColor", e.target.value); }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </div>

                    <div className="relative">
                        <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-xs font-bold" style={{ backgroundColor: "#fef08a" }} title="Highlight" onMouseDown={(e) => e.preventDefault()}>A</button>
                        <input type="color" onChange={(e) => execCommand("hiliteColor", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </div>

                    <div className="w-px h-5 bg-gray-300 mx-1" />

                    <FloatingButton command="justifyLeft" title="Left" icon={AlignLeft} />
                    <FloatingButton command="justifyCenter" title="Center" icon={AlignCenter} />
                    <FloatingButton command="justifyRight" title="Right" icon={AlignRight} />

                    <div className="w-px h-5 bg-gray-300 mx-1" />

                    <FloatingButton command="removeFormat" title="Clear" icon={RemoveFormatting} />
                </div>
            )}

            {/* Autocomplete Dropdown */}
            {showDropdown && filteredKeywords.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 rounded-md shadow-lg max-h-48 overflow-y-auto"
                    style={{
                        left: `${cursorPosition.x}px`,
                        top: `${cursorPosition.y}px`,
                        minWidth: "200px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                    }}
                >
                    <div className="px-3 py-2 text-xs" style={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                        Press ↑↓ to navigate, Enter to select
                    </div>
                    {filteredKeywords.map((keyword, index) => (
                        <div
                            key={keyword}
                            onClick={() => insertKeyword(keyword)}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f3f4f6"; e.currentTarget.style.color = "#1f2937"; }}
                            onMouseLeave={(e) => {
                                if (index !== selectedIndex) {
                                    e.currentTarget.style.backgroundColor = "#ffffff";
                                    e.currentTarget.style.color = "#374151";
                                } else {
                                    e.currentTarget.style.backgroundColor = "#3b82f6";
                                    e.currentTarget.style.color = "#ffffff";
                                }
                            }}
                            style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontSize: "14px",
                                backgroundColor: index === selectedIndex ? "#3b82f6" : "#ffffff",
                                color: index === selectedIndex ? "#ffffff" : "#374151",
                                transition: "background-color 0.15s ease",
                            }}
                        >
                            {keyword}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomRichEditor;
