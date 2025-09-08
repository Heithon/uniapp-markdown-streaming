/**
 * 判断元素的直接子节点是否全为 Text 节点
 * @param {Element} el
 * @param {Object} [opts]
 * @param {boolean} [opts.ignoreWhitespace=true] 是否忽略仅包含空白的文本节点
 */
export function isTextOnlyShallow(el) {
  if (el.querySelector("*")) return false;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_COMMENT, null);
  return !walker.nextNode();
}

/**
 * 获取代码块信息
 * @param {*} pre 代码块dom
 * @returns
 */
export function getCodeInfo(pre) {
  const first = pre.firstElementChild;
  const code = first && first.tagName === "CODE" ? first : null;
  const isPending = !!code && pre.classList.length === 0;
  let lang;
  if (code) {
    const cn = code.className || "";
    const space = cn.indexOf(" ");
    lang = space === -1 ? cn : cn.slice(0, space);
  }
  const str = code ? code.textContent || "" : "";
  return {
    isPending,
    lang,
    str,
  };
}
