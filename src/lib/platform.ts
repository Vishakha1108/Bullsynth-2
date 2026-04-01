export function isMac(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

export function formatModifierKey(key: string): string {
    const mac = isMac();
    if (key === 'Ctrl') return mac ? '⌘' : 'Ctrl';
    if (key === 'Alt') return mac ? '⌥' : 'Alt';
    if (key === 'Shift') return mac ? '⇧' : 'Shift';
    return key;
}

export function formatShortcutLabel(label: string): string {
    const mac = isMac();
    if (!mac) return label;
    return label
        .replace(/\bCtrl\b/g, '⌘')
        .replace(/\bAlt\b/g, '⌥')
        .replace(/\bShift\b/g, '⇧');
}
