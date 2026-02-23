(function () {
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");
  const editorMeta = document.getElementById("editorMeta");
  const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const toolbar = document.querySelector(".toolbar");
  const defaultMarkdown = document.getElementById("defaultMarkdown").textContent.trim();
  const storageKey = "elegant-markdown-editor-content";

  const initialContent = localStorage.getItem(storageKey) || defaultMarkdown;
  editor.value = initialContent;

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function applyInline(text) {
    let html = escapeHtml(text);

    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

    return html;
  }

  function sanitizeLanguageTag(lang) {
    const value = (lang || "").trim().toLowerCase();
    if (!value) return "";
    return value.replace(/[^a-z0-9_+-]/g, "");
  }

  function parseMarkdown(markdown) {
    if (!markdown.trim()) {
      return '<p class="empty-preview">Start typing markdown to see a live preview.</p>';
    }

    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const out = [];

    let inCodeBlock = false;
    let codeFenceLanguage = "";
    let codeBuffer = [];
    let inMathBlock = false;
    let mathBuffer = [];
    let inUl = false;
    let inOl = false;
    let inBlockquote = false;
    let tableHeader = null;
    let tableRows = [];

    function closeLists() {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
    }

    function closeBlockquote() {
      if (inBlockquote) {
        out.push("</blockquote>");
        inBlockquote = false;
      }
    }

    function flushTable() {
      if (!tableHeader) return;
      out.push("<table><thead><tr>");
      tableHeader.forEach((cell) => out.push(`<th>${applyInline(cell.trim())}</th>`));
      out.push("</tr></thead><tbody>");
      tableRows.forEach((row) => {
        out.push("<tr>");
        row.forEach((cell) => out.push(`<td>${applyInline(cell.trim())}</td>`));
        out.push("</tr>");
      });
      out.push("</tbody></table>");
      tableHeader = null;
      tableRows = [];
    }

    function closeParagraphContexts() {
      closeLists();
      closeBlockquote();
      flushTable();
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const trimmed = line.trim();

      if (inMathBlock) {
        if (trimmed === "$$") {
          out.push(`<div class="math-display">$$\n${escapeHtml(mathBuffer.join("\n"))}\n$$</div>`);
          inMathBlock = false;
          mathBuffer = [];
        } else {
          mathBuffer.push(line);
        }
        continue;
      }

      if (trimmed.startsWith("```")) {
        flushTable();
        closeLists();
        closeBlockquote();

        if (!inCodeBlock) {
          inCodeBlock = true;
          codeFenceLanguage = sanitizeLanguageTag(trimmed.slice(3).trim().split(/\s+/)[0] || "");
          codeBuffer = [];
        } else {
          const languageClass = codeFenceLanguage ? ` class="language-${codeFenceLanguage}"` : "";
          const languageLabel = codeFenceLanguage ? ` data-language="${codeFenceLanguage}"` : "";
          out.push(`<pre${languageLabel}><code${languageClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
          inCodeBlock = false;
          codeFenceLanguage = "";
          codeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      if (!trimmed) {
        closeParagraphContexts();
        continue;
      }

      if (trimmed === "$$") {
        closeParagraphContexts();
        inMathBlock = true;
        mathBuffer = [];
        continue;
      }

      if (/^\$\$[\s\S]+\$\$$/.test(trimmed) && trimmed.length > 4) {
        closeParagraphContexts();
        out.push(`<div class="math-display">${escapeHtml(trimmed)}</div>`);
        continue;
      }

      if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
        closeParagraphContexts();
        out.push("<hr />");
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        closeParagraphContexts();
        const level = headingMatch[1].length;
        out.push(`<h${level}>${applyInline(headingMatch[2])}</h${level}>`);
        continue;
      }

      if (/^\|(.+)\|$/.test(trimmed) && i + 1 < lines.length && /^\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1].trim())) {
        closeLists();
        closeBlockquote();
        const cells = trimmed.slice(1, -1).split("|");
        tableHeader = cells;
        tableRows = [];
        i += 1;
        continue;
      }

      if (tableHeader && /^\|(.+)\|$/.test(trimmed)) {
        tableRows.push(trimmed.slice(1, -1).split("|"));
        continue;
      }

      if (tableHeader && !/^\|(.+)\|$/.test(trimmed)) {
        flushTable();
      }

      const quoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        flushTable();
        closeLists();
        if (!inBlockquote) {
          out.push("<blockquote>");
          inBlockquote = true;
        }
        out.push(`<p>${applyInline(quoteMatch[1])}</p>`);
        continue;
      } else {
        closeBlockquote();
      }

      const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      if (ulMatch) {
        flushTable();
        if (inOl) {
          out.push("</ol>");
          inOl = false;
        }
        if (!inUl) {
          out.push("<ul>");
          inUl = true;
        }
        out.push(`<li>${applyInline(ulMatch[1])}</li>`);
        continue;
      }

      const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (olMatch) {
        flushTable();
        if (inUl) {
          out.push("</ul>");
          inUl = false;
        }
        if (!inOl) {
          out.push("<ol>");
          inOl = true;
        }
        out.push(`<li>${applyInline(olMatch[1])}</li>`);
        continue;
      }

      closeLists();
      out.push(`<p>${applyInline(trimmed)}</p>`);
    }

    if (inCodeBlock) {
      const languageClass = codeFenceLanguage ? ` class="language-${codeFenceLanguage}"` : "";
      const languageLabel = codeFenceLanguage ? ` data-language="${codeFenceLanguage}"` : "";
      out.push(`<pre${languageLabel}><code${languageClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    }

    if (inMathBlock) {
      out.push(`<div class="math-display">$$\n${escapeHtml(mathBuffer.join("\n"))}\n$$</div>`);
    }

    closeParagraphContexts();

    return out.join("");
  }

  function wordCount(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function render() {
    const value = editor.value;
    preview.innerHTML = parseMarkdown(value);
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(preview, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      } catch {
        // Ignore math rendering errors so typing remains uninterrupted.
      }
    }
    if (window.hljs) {
      preview.querySelectorAll("pre code").forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
    editorMeta.textContent = `${wordCount(value)} word${wordCount(value) === 1 ? "" : "s"}`;
    localStorage.setItem(storageKey, value);
  }

  function surroundSelection(wrapper) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const selection = value.slice(start, end) || "text";
    const next = value.slice(0, start) + wrapper + selection + wrapper + value.slice(end);
    editor.value = next;
    editor.focus();
    editor.setSelectionRange(start + wrapper.length, start + wrapper.length + selection.length);
    render();
  }

  function insertAtLineStart(prefix) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selected = value.slice(lineStart, end);
    const updated = selected
      .split("\n")
      .map((line) => (line.trim() ? prefix + line : line))
      .join("\n");

    editor.value = value.slice(0, lineStart) + updated + value.slice(end);
    editor.focus();
    editor.setSelectionRange(lineStart, lineStart + updated.length);
    render();
  }

  function insertText(snippet) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const payload = snippet === "---" ? "\n---\n" : snippet;
    editor.value = value.slice(0, start) + payload + value.slice(end);
    const cursor = start + payload.length;
    editor.focus();
    editor.setSelectionRange(cursor, cursor);
    render();
  }

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const wrap = button.dataset.wrap;
    const block = button.dataset.block;
    const insert = button.dataset.insert;

    if (wrap) surroundSelection(wrap);
    if (block) insertAtLineStart(block);
    if (insert) insertText(insert);
  });

  editor.addEventListener("input", render);
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      insertText("  ");
    }
  });

  copyMarkdownBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      copyMarkdownBtn.textContent = "Copied";
      setTimeout(() => {
        copyMarkdownBtn.textContent = "Copy";
      }, 1200);
    } catch {
      copyMarkdownBtn.textContent = "Failed";
      setTimeout(() => {
        copyMarkdownBtn.textContent = "Copy";
      }, 1200);
    }
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "notes.md";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  render();
})();
