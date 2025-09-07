/* eslint-disable */

/**
 * markdown-it-math-lite
 * 一个轻量的 $...$ / $$...$$ 解析插件：
 * - 解析行内数学 $...$ → token: math_inline
 * - 解析块级数学 $$...$$（同一行或多行） → token: math_block
 * - 提供默认渲染为自定义标签（可替换为 KaTeX/MathJax 渲染）
 *
 * 用法：
 *   import MarkdownIt from 'markdown-it';
 *   import math from './markdown-it-math-lite';
 *   const md = new MarkdownIt().use(math, { /* 可选项 * / });
 *   const html = md.render('这是行内 $a^2+b^2$，块级：\\n$$\\nE=mc^2\\n$$');
 */

function defaultOptions(user) {
  return {
    // 行内显示的包装标签
    tagInline: "equation-inline",
    // 块级显示的包装标签
    tagBlock: "equation-block",
    // 是否允许 $$...$$ 作为“行内数学”（大多数情况下关闭）
    allowInlineDouble: false,
    // 输出时是否裁剪首尾空白
    trimContent: true,
    // 是否在遇到不合法分隔符（空格相邻等）时放弃数学解析
    strictDelimiters: true,
    // 自定义转义函数（默认使用 md.utils.escapeHtml）
    escape: null,
    ...user,
  };
}

/**
 * 判断是否是空白（空格/制表/换行）
 */
function isSpace(ch) {
  return ch === 0x20 || ch === 0x0a || ch === 0x09 || ch === 0x0d;
}

/**
 * 判断 $ 作为“起始/结束分隔符”的合法性（简化版，符合常见直觉）
 * - 起始 $ 后面不能是空白
 * - 结束 $ 前面不能是空白
 */
function isValidOpenDelim(src, pos) {
  const next = pos + 1 < src.length ? src.charCodeAt(pos + 1) : -1;
  if (next === -1) return false;
  return !isSpace(next);
}
function isValidCloseDelim(src, pos) {
  const prev = pos - 1 >= 0 ? src.charCodeAt(pos - 1) : -1;
  if (prev === -1) return false;
  return !isSpace(prev);
}

/**
 * 判断当前位置的 $ 是否被反斜杠转义（奇数个反斜杠）
 */
function isEscaped(src, pos) {
  let backslashes = 0;
  let i = pos - 1;
  while (i >= 0 && src.charCodeAt(i) === 0x5c /* \ */) {
    backslashes++;
    i--;
  }
  return (backslashes & 1) === 1;
}

/**
 * 从 start 开始查找未转义的 $ 或 $$（根据 markerLen）
 * 返回匹配的起始位置索引；若找不到则返回 -1
 */
function findClosing(src, start, markerLen) {
  const marker = markerLen === 2 ? "$$" : "$";
  let pos = start;
  while (pos < src.length) {
    const idx = src.indexOf(marker, pos);
    if (idx === -1) return -1;
    if (!isEscaped(src, idx)) return idx;
    pos = idx + markerLen;
  }
  return -1;
}

/**
 * 行内数学解析器：$...$ 或（可选）$$...$$
 */
function mathInline(state, silent, options) {
  const src = state.src;
  const pos = state.pos;

  // 必须是 $
  if (src.charCodeAt(pos) !== 0x24 /* $ */) return false;

  // 支持 $$ 行内（可选）
  const isDouble =
    options.allowInlineDouble && src.charCodeAt(pos + 1) === 0x24;

  // 分隔符合法性检查
  if (options.strictDelimiters) {
    if (isDouble) {
      if (!isValidOpenDelim(src, pos + 1)) return false; // $$ 后的字符
    } else {
      if (!isValidOpenDelim(src, pos)) return false;
    }
  }

  // 起始分隔符不可被转义（交给 escape 规则更稳，但这里做兜底）
  if (isEscaped(src, pos)) return false;

  const markerLen = isDouble ? 2 : 1;
  const start = pos + markerLen;

  const close = findClosing(src, start, markerLen);
  if (close === -1) return false;

  if (options.strictDelimiters && !isValidCloseDelim(src, close)) {
    return false;
  }

  const content = options.trimContent
    ? src.slice(start, close).trim()
    : src.slice(start, close);

  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.markup = isDouble ? "$$" : "$";
    token.content = content;
  }

  state.pos = close + markerLen;
  return true;
}

/**
 * 块级数学解析器：$$...$$
 * - 支持同一行： $$ E=mc^2 $$
 * - 支持多行：
 *    $$
 *    E=mc^2
 *    $$
 * - 结束行必须只包含（可缩进的） $$ 和空白
 */
function mathBlock(state, startLine, endLine, silent, options) {
  const CH_DOLLAR = 0x24;

  let pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const src = state.src;

  // 该行必须以 $$ 开始（允许缩进，但不超过 3 空格更符合常规）
  if (pos + 2 > max) return false;
  if (
    src.charCodeAt(pos) !== CH_DOLLAR ||
    src.charCodeAt(pos + 1) !== CH_DOLLAR
  ) {
    return false;
  }

  // 防止被转义
  if (isEscaped(src, pos)) return false;

  // 若仅是：$$[空白/结尾]，可能是多行块；否则尝试单行块
  pos += 2;
  let firstLine = src.slice(pos, max);

  // 单行：... $$（且 $$ 后只有空白）
  let singleLineCloseIdx = -1;
  {
    const idx = firstLine.indexOf("$$");
    if (idx !== -1) {
      // $$ 后应只有空白
      let tailOk = true;
      for (let i = pos + idx + 2; i < state.eMarks[startLine]; i++) {
        if (!isSpace(src.charCodeAt(i))) {
          tailOk = false;
          break;
        }
      }
      if (tailOk) singleLineCloseIdx = idx;
    }
  }

  if (singleLineCloseIdx !== -1) {
    if (silent) return true;

    let content = firstLine.slice(0, singleLineCloseIdx);
    content = options.trimContent ? content.trim() : content;

    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.markup = "$$";
    token.map = [startLine, startLine + 1];
    token.content = content;

    state.line = startLine + 1;
    return true;
  }

  // 多行模式：向后找仅包含 $$ 的结束行
  let nextLine = startLine;
  let endFound = false;
  let contentStart = pos;
  let contentEnd = src.length;

  while (++nextLine < endLine) {
    let lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const lineMax = state.eMarks[nextLine];

    if (
      lineStart < lineMax &&
      src.charCodeAt(lineStart) === CH_DOLLAR &&
      src.charCodeAt(lineStart + 1) === CH_DOLLAR &&
      !isEscaped(src, lineStart)
    ) {
      // $$ 后仅允许空白
      let onlyDollarsAndSpace = true;
      for (let i = lineStart + 2; i < lineMax; i++) {
        if (!isSpace(src.charCodeAt(i))) {
          onlyDollarsAndSpace = false;
          break;
        }
      }
      if (onlyDollarsAndSpace) {
        endFound = true;
        contentEnd = lineStart;
        break;
      }
    }
  }

  if (!endFound) return false;
  if (silent) return true;

  let content = src.slice(contentStart, contentEnd);
  // 去掉首行与末行的一个换行（更“自然”的块体）
  if (content.charCodeAt(0) === 0x0a) content = content.slice(1);
  if (content.charCodeAt(content.length - 1) === 0x0a)
    content = content.slice(0, -1);
  if (options.trimContent) content = content.trim();

  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.markup = "$$";
  token.map = [startLine, nextLine + 1];
  token.content = content;

  state.line = nextLine + 1;
  return true;
}

/**
 * 默认渲染器：仅包裹为自定义标签
 * 你也可以在外部覆盖 renderer.rules.math_inline / math_block
 */
function applyDefaultRenderer(md, options) {
  const escape =
    typeof options.escape === "function"
      ? options.escape
      : (s) => md.utils.escapeHtml(s);

  md.renderer.rules.math_inline = (tokens, idx) => {
    const c = tokens[idx].content;
    return `<${options.tagInline}>${escape(c)}</${options.tagInline}>`;
  };

  md.renderer.rules.math_block = (tokens, idx) => {
    const c = tokens[idx].content;
    return `<${options.tagBlock}>${escape(c)}</${options.tagBlock}>\n`;
  };
}

function mathPlugin(md, userOptions) {
  const options = defaultOptions(userOptions);

  // 行内规则：放在 escape 之后，避免与转义冲突
  md.inline.ruler.after("escape", "math_inline", function (state, silent) {
    return mathInline(state, silent, options);
  });

  // 块级规则：在 fence 之前，防止被当作普通段落/代码块
  md.block.ruler.before(
    "fence",
    "math_block",
    function (state, startLine, endLine, silent) {
      return mathBlock(state, startLine, endLine, silent, options);
    },
    {
      alt: ["paragraph", "reference", "blockquote", "list"],
    }
  );

  applyDefaultRenderer(md, options);
}

// 兼容 ESM / CJS
if (typeof module !== "undefined") {
  module.exports = mathPlugin;
}
export default mathPlugin;
