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
