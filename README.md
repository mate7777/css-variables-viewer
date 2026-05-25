# CSS Variables Viewer

Chrome extension to inspect and temporarily edit CSS custom properties on the current page.

It lists detected CSS variables, groups them by category, and lets you test value changes directly in the browser. This is useful when adjusting a design system, debugging theme variables, or exploring how a WordPress theme uses CSS custom properties.

## Why

CSS variables are often spread across theme files, blocks, plugins, and inline styles. During front-end debugging, it can be useful to quickly inspect them without searching through the whole codebase.

This extension helps answer questions such as:

- Which CSS custom properties are defined on this page?
- Which values control colors, spacing, or typography?
- What happens if a variable value changes temporarily?
- Are some `var(--...)` references undefined?

The extension is meant for inspection and temporary browser-side edits. It does not write changes back to your theme or site files.

## Features

- Lists detected CSS custom properties.
- Groups variables into:
  - colors;
  - spacing;
  - typography;
  - other.
- Provides a search field.
- Shows color previews and color inputs for color-like values.
- Applies temporary variable changes to the current page.
- Supports undo and redo during the current popup session.
- Exports detected variables as CSS.
- Checks for undefined CSS variable references.
- Can inject a CSS variables ponyfill for legacy testing.

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extension folder.

## Usage

1. Open a page that uses CSS custom properties.
2. Click the extension icon.
3. Browse or search variables.
4. Edit a value and click **Apply**.
5. Use **Undo** or **Redo** to move through temporary changes.
6. Use **Export** to download the current variable list as CSS.

## Screenshots

If you add screenshots later, place them in a `screenshots/` folder and reference them here.

Suggested screenshots:

- variable list grouped by category;
- color variable with preview and color picker;
- exported CSS file or undefined variable check.

## Permissions

The extension uses:

- `activeTab`: to inspect the current tab;
- `scripting`: to run variable collection and temporary updates on the page;
- `storage`: to keep last-used values locally;
- `<all_urls>` host permission: to allow inspection on any page you explicitly open.

The extension does not send collected data to a remote server.

## Limits

- It only edits values temporarily in the browser.
- Changes disappear when the page reloads.
- Cross-origin stylesheets may be inaccessible because of browser security rules.
- Variable grouping is based on naming heuristics.
- It does not replace a full design token management workflow.

## Development Notes

The popup logic lives in `popup.js`.

Variable collection scans accessible stylesheets and extracts properties whose names start with `--`. Temporary changes are applied with:

```js
document.documentElement.style.setProperty(name, value)
```

## Roadmap Ideas

- Improve variable deduplication across cascade sources.
- Add import from a CSS file.
- Show the stylesheet or selector where each variable was found.
- Add copy buttons for individual variables.
- Add better naming heuristics for categories.

## License

MIT License. See [LICENSE](LICENSE).
