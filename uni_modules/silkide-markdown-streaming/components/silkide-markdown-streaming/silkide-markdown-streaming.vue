<template>
  <view class="sms__markdown">
    <view
      class="sms-markdown-wrapper"
      :config="config"
      :change:config="markdownRender.updateConfig"
      :source="source"
      :change:source="markdownRender.updateSource"
      :show-line="showLine"
      :change:show-line="markdownRender.updateShowLine"
      :target-id="targetId"
      :change:target-id="markdownRender.setTargetId"
      :append-text="appendTextSignal"
      :change:append-text="markdownRender.appendText"
    >
      <view :id="targetId" class="markdown-content-host"></view>
    </view>
  </view>
</template>

<script>
import "./lib/highlight/atom-one-dark.css";
import "./lib/katex/katex.min.css";
export default {
  props: {
    config: {
      type: Object,
      default: () => ({
        // 配置
        isStreamingParse: false, // 是否是流式解析 true: 使用 streaming-markdown解析；false: 使用 markdown-it解析
        isPurify: true, // 是否启用html过滤，检测到恶意代码直接暂停
      }),
    },
    source: {
      type: String,
      default: "",
    },
    showLine: {
      type: [Boolean, String],
      default: true,
    },
  },
  data() {
    return {
      targetId:
        "md_target_" + Date.now() + Math.random().toString(36).substring(2),
      appendTextSignal: "",
    };
  },
  methods: {
    onRenderjsImageClick(detail) {
      if (detail && detail.src) {
        uni.previewImage({
          urls: [detail.src],
        });
      }
    },
    onRenderjsImageLoad(detail) {
      if (detail && detail.src) {
        // 发出图片加载完毕事件，方便父组件处理（如自动滚动到底部）
        console.log("发起图片加载完毕事件");
        this.$emit("image-loaded", detail);
      }
    },
    onRenderjsCopyCode(detail) {
      if (detail && typeof detail.text === "string") {
        uni.setClipboardData({
          data: detail.text,
          showToast: false,
          success() {
            uni.showToast({
              title: "复制成功",
              icon: "none",
            });
          },
          error() {
            uni.showToast({
              title: "复制失败",
              icon: "none",
            });
          },
        });
      }
    },
    onRenderjsLinkClick(detail) {
      if (detail && detail.href) {
        uni.navigateTo({
          url: `/pages/webview/index?url=${encodeURIComponent(detail.href)}`,
        });
      }
    },
    /**
     * 对外暴露：追加文本到 fullText（通过 renderjs 的 appendText 执行）
     * @param {string} text
     */
    write(text) {
      if (text === undefined || text === null) return;
      const chunk = typeof text === "string" ? text : String(text);
      this.appendTextSignal = chunk;
    },
  },
};
</script>

<script module="markdownRender" lang="renderjs">
import MarkdownIt from "./lib/markdown-it.min.js";
import hljs from "./lib/highlight/uni-highlight.min.js";
import katex from "./lib/katex/katex.mjs";
import * as smd from "./lib/smd.min.js"
import { isTextOnlyShallow } from "./utils/index.js";
// h5中直接执行脚本挂在到全局对象
// #ifdef H5
import "./lib/markdown-it-incremental-dom/markdown-it-incremental-dom.js";
import "./lib/incremental-dom/incremental-dom.js";
import './lib/purify.min.js';
// #endif
// #ifdef APP-PLUS
import DOMPurify from './lib/purify.min.js';
import MarkdownItIncrementalDOM from "./lib/markdown-it-incremental-dom/markdown-it-incremental-dom.js";
import IncrementalDOM from "./lib/incremental-dom/incremental-dom.js";
// #endif

// 确保将需要的库暴露到全局
if (typeof window !== 'undefined') {
  window.MarkdownIt = MarkdownIt;
  window.hljs = hljs;
  window.katex = katex;
  // app中单独挂载到window上
  // #ifdef APP-PLUS
  window.DOMPurify = DOMPurify;
  window.IncrementalDOM = IncrementalDOM;
  window.MarkdownItIncrementalDOM = MarkdownItIncrementalDOM;
  // #endif
}

export default {
  data() {
    return {
      fullText: "", // 全量markdown文本
      config: {},
      copyCodeData: [], // 存储代码块内容用于复制, renderjs self-manages this now
      markdownParser: null, // Markdown解析器实例
      showLineValue: true, // 是否显示行号
      currentSource: "", // md源文本
      katexCache: {}, // KaTeX 解析缓存
      targetMdElement: null, // 目标md元素
      throttleTimeout: null, // 用于节流的定时器ID
      lastRenderCallTime: 0, // 上次调用renderContent的时间戳
      throttleTime: 150, // 节流时间
      gate: {
        isConfigUpdated: false,
        isTargetIdUpdated: false,
        isSourceUpdated: false,
        isShowLineUpdated: false,
      }
    }
  },
  mounted() {
    // this.initMarkdownParser();
    console.log('smd', smd.default_renderer)
    console.log('DOMPurify', DOMPurify)
    console.log('this.config', this.config.isPurify)
    // this.setTargetId(this.targetId, null, this, this);
  },
  methods: {
    tryInitMarkdownParser() {
      console.log('尝试初始化Markdown解析器')
      if(this.gate.isConfigUpdated && this.gate.isTargetIdUpdated && this.gate.isSourceUpdated && this.gate.isShowLineUpdated) {
        console.log('tryInitMarkdownParser')
        this.initMarkdownParser();
      }
    },
    /**
     * 添加文本内部方法
     */
    appendText(newChunk, oldChunk, ownerVm, vm) {
      let maxTime = 0;
      let time = performance.now();
      if (typeof newChunk !== 'string' || newChunk.length === 0) return;
      this.fullText = (this.fullText || '') + newChunk;
      // 检测恶意代码
      if (this.config.isPurify) {
        DOMPurify.sanitize(this.fullText);
        if (DOMPurify.removed.length) {
          // 终止渲染
          return;
        }
      }
      // markdown-it解析可以进行预处理
      if(!this.config.isStreamingParse) {
        // markdown-it 全量解析
        if(this.config.preProcessText && typeof this.config.preProcessText === 'function') {
          try {
            this.fullText = this.config.preProcessText(this.fullText);
          } catch (error) {
            console.error('预处理文本失败', error);
          }
        }
        this.renderContent(newChunk);
      } else {
        // 流式解析
        this.renderContentSmd(newChunk);
      }
      if(performance.now() - time > maxTime) {
        maxTime = performance.now() - time;
      }
      console.log('appendText time', performance.now() - time, maxTime)
    },
    /**
     * 更新配置
     */
    updateConfig(newConfig, oldConfig, ownerVm, vm) {
      this.config = newConfig;
      this.gate.isConfigUpdated = true;
      console.log('this.config2', this.config)
      this.tryInitMarkdownParser();
    },
    /**
     * 设置目标md元素
     */
    setTargetId(newId, oldId, ownerVm, vm) {
      console.log('setTargetId', newId)
      this.targetId = newId;
      this.targetMdElement = document.getElementById(this.targetId); // 获取目标md元素
      this.gate.isTargetIdUpdated = true;
      console.log('this.targetMdElement', this.targetMdElement);
      this.tryInitMarkdownParser();
      // this.renderContent();
    },
    /**
     * 更新源文本
     */
    updateSource(newSource, oldSource, ownerVm, vm) {
      console.log('updateSource', newSource)
      this.currentSource = newSource; // 立即更新 currentSource
      this.gate.isSourceUpdated = true;
      this.tryInitMarkdownParser();
      const now = Date.now();

      // 如果存在一个挂起的节流定时器，清除它
      if (this.throttleTimeout) {
        clearTimeout(this.throttleTimeout);
      }

      const timeSinceLastCall = now - (this.lastRenderCallTime || 0);

      if (timeSinceLastCall >= this.throttleTime) {
        // this.renderContent();
        this.lastRenderCallTime = now; // 更新上次渲染时间
      } else {
        this.throttleTimeout = setTimeout(() => {
          // this.renderContent();
          this.lastRenderCallTime = Date.now(); // 更新上次渲染时间
        }, this.throttleTime - timeSinceLastCall);
      }
    },
    /**
     * 更新显示行号
     */
    updateShowLine(newShowLine, oldShowLine, ownerVm, vm) {
      console.log('updateShowLine', newShowLine)
      const newBoolValue = newShowLine === true || newShowLine === 'true';
      this.gate.isShowLineUpdated = true;
      this.tryInitMarkdownParser();
      if (this.showLineValue !== newBoolValue) {
        this.showLineValue = newBoolValue;
        if (this.hostElement && this.currentSource) {
          // this.renderContent();
        }
      }
    },
    /**
     * 初始化Markdown解析器
     */
    initMarkdownParser() {
      console.log('initMarkdownParser', this.config.isStreamingParse)
      if (this.markdownParser) return;
      if (this.config.isStreamingParse) {
        console.log('smd渲染器初始化了')
        const renderer = smd.default_renderer(this.targetMdElement);
        console.log('renderer', renderer)
        this.markdownParser = smd.parser(renderer);
        console.log('this.markdownParser', this.markdownParser)
      } else {
        this.markdownParser = new window.MarkdownIt({
          html: true,
          highlight: (str, lang) => {
            let preCode = "";
            try {
              preCode = window.hljs.highlightAuto(str).value;
            } catch (err) {
              preCode = this.markdownParser.utils.escapeHtml(str);
            }
            const lines = preCode.split(/\n/).slice(0, -1);
            let html = lines
              .map((item, index) => {
                if (item == "") {
                  return "";
                }
                return (
                  '<li><span class="line-num" data-line="' +
                  (index + 1) +
                  '"></span>' +
                  item +
                  "</li>"
                );
              })
              .join("");
            if (this.showLineValue) {
              html = '<ol style="padding: 0px 30px;">' + html + "</ol>";
            } else {
              html = '<ol style="padding: 0px 7px;list-style:none;">' + html + "</ol>";
            }
            this.copyCodeData.push(str); // copyCodeData is managed by renderjs
            let htmlCode = `<div class="markdown-wrap">`;
            htmlCode += `<div style="color: #aaa;text-align: right;font-size: 12px;padding:8px;">`;
            htmlCode += `${lang}<a class="copy-btn" code-data-index="${
              this.copyCodeData.length - 1
            }" style="margin-left: 8px;">复制代码</a>`;
            htmlCode += `</div>`;
            if (str.trim().length > 0) {
              htmlCode += `<pre class="hljs" style="padding:10px 8px 0;margin-bottom:5px;overflow: auto;display: block;border-radius: 5px;"><code>${html}</code></pre>`;
              // htmlCode += `<pre class="hljs" style="padding:10px 8px 0;margin-bottom:5px;overflow: auto;display: block;border-radius: 5px;">${html}</pre>`;
            } else {
              htmlCode += `<pre class="hljs" style="display: none;"></pre>`;
            }
            htmlCode += "</div>";
            return htmlCode;
          },
          // #ifdef H5
        }).use(markdownitIncrementalDOM, IncrementalDOM);
        // #endif
        // #ifdef APP-PLUS
        }).use(MarkdownItIncrementalDOM, IncrementalDOM);
        // #endif
      }
    },
    renderContentSmd(chunk) {
      smd.parser_write(this.markdownParser, chunk)
      this.applyLaTeX();
    },
    renderContent() {
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now(); // 记录开始时间

      if (!this.markdownParser) {
        this.initMarkdownParser(); //  确保初始化
        if (!this.markdownParser) return; // 仍然没有，跳过
      }

      if (!this.fullText && this.targetMdElement) {
        this.targetMdElement.innerHTML = "";
        return;
      }

      this.copyCodeData = []; // 重置复制数据
      let value = this.fullText;

            // --- 开始处理markdown ---
      // 保护表格中的<br>标签，避免被替换成换行符导致表格截断
      const tableBrPlaceholders = [];

      // 先将表格行中的<br>标签替换为临时占位符
      // 使用循环处理，直到没有更多的表格中的<br>标签需要替换
      let hasTableBr = true;
      while (hasTableBr) {
        const beforeReplace = value;
        value = value.replace(/(\|[^|\n]*?)(<br>|<br\/>|<br \/>)([^|\n]*)/g, (match, before, brTag, after) => {
          const placeholder = `__TABLE_BR_${tableBrPlaceholders.length}__`;
          tableBrPlaceholders.push(brTag);
          return before + placeholder + after;
        });
        hasTableBr = beforeReplace !== value;
      }

      // 现在可以安全地替换其他地方的<br>标签
      value = value.replace(/<br>|<br\/>|<br \/>/g, "\n");
      value = value.replace(/&nbsp;/g, " ");

      // 保护代码块
      const codeBlocks = [];
      const inlineCodeBlocks = [];

      value = value.replace(/```[\s\S]*?```/g, (match) => {
        const id = `CODE_BLOCK_${codeBlocks.length}`;
        codeBlocks.push(match);
        return id;
      });

      value = value.replace(/`[^`]*`/g, (match) => {
        const id = `INLINE_CODE_${inlineCodeBlocks.length}`;
        inlineCodeBlocks.push(match);
        return id;
      });

      // 处理块级公式
      value = value.replace(/\$\$([\s\S]*?)\$\$/g, (match, p1) => {
        const formula = p1.trim();
        const cacheKey = `block||${formula}`; // 使用 'block||' 作为块级公式的前缀
        if (this.katexCache[cacheKey]) {
          // console.log('命中缓存: ', cacheKey)
          return this.katexCache[cacheKey];
        }
        try {
          const renderedHtml = window.katex.renderToString(formula, {
            displayMode: true,
            throwOnError: false
          });
          this.katexCache[cacheKey] = renderedHtml;
          return renderedHtml;
        } catch (err) {
          console.error('KaTeX rendering error (block):', err);
          return match; // 发生错误时返回原始匹配
        }
      });

      // 处理行内公式
      value = value.replace(/\$([^$]+?)\$/g, (match, p1) => {
        const trimmedContent = p1.trim();
        if (!trimmedContent || /^\d+(\.\d+)?$/.test(trimmedContent)) {
          return match;
        }
        const cacheKey = `inline||${trimmedContent}`; // 使用 'inline||' 作为行内公式的前缀
        if (this.katexCache[cacheKey]) {
          // console.log('命中缓存: ', cacheKey)
          return this.katexCache[cacheKey];
        }
        try {
          const renderedHtml = window.katex.renderToString(trimmedContent, {
            displayMode: false,
            throwOnError: false
          });
          this.katexCache[cacheKey] = renderedHtml;
          return renderedHtml;
        } catch (err) {
          console.error('KaTeX rendering error (inline):', err);
          return match; // 发生错误时返回原始匹配
        }
      });

      // 恢复行内代码块
      inlineCodeBlocks.forEach((block, index) => {
        value = value.replace(`INLINE_CODE_${index}`, block);
      });

      // 恢复多行代码块
      codeBlocks.forEach((block, index) => {
        value = value.replace(`CODE_BLOCK_${index}`, block);
      });

      // 恢复表格中的<br>标签
      tableBrPlaceholders.forEach((br, index) => {
        value = value.replace(`__TABLE_BR_${index}__`, br);
      });
      // --- markdown处理结束 ---

      let htmlString = ''
      // 偶数个```，末尾加上\n
      if (value.split("```").length % 2) {
        let mdtext = value;
        // console.log('mdtext: ', mdtext)
        if (mdtext[mdtext.length - 1] != "\n") {
          mdtext += "\n";
        }
        // 使用增量dom渲染
        IncrementalDOM.patch(
            this.targetMdElement,
            this.markdownParser.renderToIncrementalDOM(mdtext)
          )
          // htmlString = this.markdownParser.render(mdtext)
      } else {
        // 使用增量dom渲染
        IncrementalDOM.patch(
            this.targetMdElement,
            this.markdownParser.renderToIncrementalDOM(value)
          )
        // htmlString = this.markdownParser.render(value)
      }

      // this.targetMdElement.innerHTML = htmlString

      // 表格标签添加类名，修复表格样式
      if (this.targetMdElement) {
        // 处理表格相关元素
        const tables = this.targetMdElement.querySelectorAll('table');
        tables.forEach(table => {
          table.classList.add('table');
          // 将表格包装在table-box div中
          if (!table.parentElement.classList.contains('table-box')) {
            const tableBox = document.createElement('div');
            tableBox.classList.add('table-box');
            table.parentNode.insertBefore(tableBox, table);
            tableBox.appendChild(table);
          }
        });

        // 处理表格行
        const trs = this.targetMdElement.querySelectorAll('tr');
        trs.forEach(tr => tr.classList.add('tr'));

        // 处理表头单元格
        const ths = this.targetMdElement.querySelectorAll('th');
        ths.forEach(th => th.classList.add('th'));

        // 处理表格数据单元格
        const tds = this.targetMdElement.querySelectorAll('td');
        tds.forEach(td => td.classList.add('td'));

        // 处理水平分割线
        const hrs = this.targetMdElement.querySelectorAll('hr');
        hrs.forEach(hr => hr.classList.add('hr'));
      }

      this.attachEventListeners();
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now(); // 记录结束时间
      console.log(`markdown渲染时间: ${(endTime - startTime).toFixed(2)} ms`);
      this.throttleTime = endTime - startTime + 80; // 动态调整节流时间
    },
    applyLaTeX() {
      this.targetMdElement.querySelectorAll('equation-inline').forEach(el => {
        if(!isTextOnlyShallow(el)) {
          return;
        }
        katex.render(el.textContent, el, {
          displayMode: false,  // Inline mode
          throwOnError: false  // Optional: Don't throw errors on invalid LaTeX
        });
      });
      // Manually render block math in <equation-block> tags
      this.targetMdElement.querySelectorAll('equation-block').forEach(el => {
        if(!isTextOnlyShallow(el)) {
          return;
        }
        katex.render(el.textContent, el, {
          displayMode: true,   // Display (block) mode
          throwOnError: false  // Optional: Don't throw errors on invalid LaTeX
        });
      });
    },
    /**
     * 点击事件监听器
     */
     attachEventListeners() {
      if (!this.targetMdElement) return;
      const imgs = this.targetMdElement.querySelectorAll('img');
      imgs.forEach(img => {
        // 添加点击事件监听器
        if (!img.hasAttribute('data-click-listener-attached')) {
          img.addEventListener('click', (event) => {
            event.stopPropagation();
            const src = img.getAttribute('src');
            if (src) {
              this.$ownerInstance.callMethod('onRenderjsImageClick', { src });
            }
          });
          img.setAttribute('data-click-listener-attached', 'true');
        }

        // 添加图片加载完毕事件监听器
        if (!img.hasAttribute('data-load-listener-attached')) {
          img.addEventListener('load', (event) => {
            const src = img.getAttribute('src');
            if (src) {
              this.$ownerInstance.callMethod('onRenderjsImageLoad', { src });
            }
          });
          img.setAttribute('data-load-listener-attached', 'true');
        }

        // 如果图片已经加载完毕（缓存情况），立即触发事件
        if (img.complete && img.naturalHeight !== 0) {
          console.log('图片加载完毕: ', img.getAttribute('src'))
          const src = img.getAttribute('src');
          if (src) {
            // 使用setTimeout确保在下一个事件循环中执行
            setTimeout(() => {
              this.$ownerInstance.callMethod('onRenderjsImageLoad', { src });
            }, 0);
          }
        }
      });

      const copyBtns = this.targetMdElement.querySelectorAll('a.copy-btn');
      copyBtns.forEach(btn => {
        if (!btn.hasAttribute('data-listener-attached')) {
          btn.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            const codeDataIndexStr = btn.getAttribute('code-data-index');
            const codeDataIndex = parseInt(codeDataIndexStr);
            if (codeDataIndexStr !== null && !isNaN(codeDataIndex) && this.copyCodeData[codeDataIndex]) {
              this.$ownerInstance.callMethod('onRenderjsCopyCode', {
                text: this.copyCodeData[codeDataIndex]
              });
            } else {
              console.warn('[ua-markdown renderjs] 复制按钮被点击，数据未找到: ', codeDataIndexStr, this.copyCodeData);
            }
          });
          btn.setAttribute('data-listener-attached', 'true');
        }
      });
      // 排除copy-btn的a标签
      // 使用webview页面打开
      const links = this.targetMdElement.querySelectorAll('a:not(.copy-btn)');
      links.forEach(link => {
        link.addEventListener('click', (event) => {
          event.stopPropagation();
          event.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            this.$ownerInstance.callMethod('onRenderjsLinkClick', { href });
          }
        });
      });
    }

  },
}
</script>

<style lang="scss" scoped>
.sms__markdown {
  .sms-markdown-wrapper {
    :deep(.markdown-content-host) {
      font-size: 30rpx;
      line-height: 42rpx;
      word-break: break-all;
      text-align: justify;
      text-justify: inter-word;
      // 允许划选复制
      -webkit-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        font-family: inherit;
        font-weight: bold;
        line-height: 1.1;
        color: inherit;
      }

      h1,
      h2,
      h3 {
        margin-top: 30rpx;
        margin-bottom: 20rpx;
      }

      h4,
      h5,
      h6 {
        margin-top: 16rpx;
        margin-bottom: 16rpx;
      }

      .h1,
      h1 {
        font-size: 40rpx;
      }

      .h2,
      h2 {
        font-size: 36rpx;
      }

      .h3,
      h3 {
        font-size: 32rpx;
      }

      .h4,
      h4 {
        font-size: 32rpx;
      }

      .h5,
      h5 {
        font-size: 32rpx;
      }

      .h6,
      h6 {
        font-size: 32rpx;
      }

      a {
        background-color: transparent;
        color: #2196f3;
        text-decoration: none;
      }

      hr,
      .hr {
        margin-top: 20px;
        margin-bottom: 20px;
        border: 0;
        border-top: 1px solid #e5e5e5;
      }

      img {
        // max-width: 35%;
        display: block;
        // max-height: 140px;
        max-width: 100%;
        object-fit: scale-down;
        margin: 16px 0;
        border-radius: 6px;
        padding: 4px;
        background: #fff;
        box-sizing: border-box;
      }

      p {
        margin: 0 0 16rpx;
      }

      em {
        font-style: italic;
        font-weight: inherit;
      }

      ol,
      ul {
        margin-top: 0;
        margin-bottom: 20rpx;
        padding-left: 32rpx;
      }

      ol ol,
      ol ul,
      ul ol,
      ul ul {
        margin-bottom: 16rpx;
      }

      ol ol,
      ul ol {
        list-style-type: lower-roman;
      }

      ol ol ol,
      ul ul ol {
        list-style-type: lower-alpha;
      }

      dl {
        margin-top: 0;
        margin-bottom: 20px;
      }

      dt {
        font-weight: 600;
      }

      dt,
      dd {
        line-height: 1.4;
      }

      .task-list-item {
        list-style-type: none;
      }

      .task-list-item input {
        margin: 0 0.2em 0.25em -1.6em;
        vertical-align: middle;
      }

      pre {
        position: relative;
        z-index: 11;
      }

      code,
      kbd,
      pre,
      samp {
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
      }

      code:not(.hljs) {
        padding: 2px 4px;
        font-size: 90%;
        background-color: #ffe7ee;
        border-radius: 4px;
      }

      code:empty {
        display: none;
      }

      pre code.hljs {
        color: var(--vg__text-1);
        border-radius: 16px;
        background: var(--vg__bg-1);
        font-size: 12px;
      }

      .markdown-wrap {
        font-size: 12px;
        margin-bottom: 10px;
      }

      pre.code-block-wrapper {
        background: #2b2b2b;
        color: #f8f8f2;
        border-radius: 4px;
        overflow-x: auto;
        padding: 1em;
        position: relative;
      }

      pre.code-block-wrapper code {
        padding: auto;
        font-size: inherit;
        color: inherit;
        background-color: inherit;
        border-radius: 0;
      }

      .code-block-header__copy {
        font-size: 16px;
        margin-left: 5px;
      }

      abbr[data-original-title],
      abbr[title] {
        cursor: help;
        border-bottom: 1px dotted #777;
      }

      blockquote {
        padding: 10px 20px;
        margin: 0 0 20px;
        font-size: 17.5px;
        border-left: 5px solid #e5e5e5;
      }

      blockquote ol:last-child,
      blockquote p:last-child,
      blockquote ul:last-child {
        margin-bottom: 0;
      }

      blockquote .small,
      blockquote footer,
      blockquote small {
        display: block;
        font-size: 80%;
        line-height: 1.42857143;
        color: #777;
      }

      blockquote .small:before,
      blockquote footer:before,
      blockquote small:before {
        content: "\2014 \00A0";
      }

      .blockquote-reverse,
      blockquote.pull-right {
        padding-right: 15px;
        padding-left: 0;
        text-align: right;
        border-right: 5px solid #eee;
        border-left: 0;
      }

      .blockquote-reverse .small:before,
      .blockquote-reverse footer:before,
      .blockquote-reverse small:before,
      blockquote.pull-right .small:before,
      blockquote.pull-right footer:before,
      blockquote.pull-right small:before {
        content: "";
      }

      .blockquote-reverse .small:after,
      .blockquote-reverse footer:after,
      .blockquote-reverse small:after,
      blockquote.pull-right .small:after,
      blockquote.pull-right footer:after,
      blockquote.pull-right small:after {
        content: "\00A0 \2014";
      }

      .footnotes {
        -moz-column-count: 2;
        -webkit-column-count: 2;
        column-count: 2;
      }

      .footnotes-list {
        padding-left: 2em;
      }

      .katex-html {
        white-space: normal;
        overflow-wrap: break-word;
        text-align: start;
      }

      .katex .base,
      .katex .strut {
        margin: 5px 0;
      }

      table,
      .table {
        // display: block;
        border-spacing: 0;
        border-collapse: collapse;
        width: 100%;
        max-width: 65em;
        overflow: auto;
        margin-top: 0;
        margin-bottom: 32rpx;
      }

      table tr,
      .table .tr {
        border-top: 1px solid #e5e5e5;
      }

      table th,
      table td,
      .table .th,
      .table .td {
        padding: 6px 13px;
        border: 1px solid #e5e5e5;
      }

      table th,
      .table .th {
        font-weight: 600;
        background-color: #eee;
        text-align: left;
      }

      .table-box {
        width: 100%;
        overflow-x: auto;
        .table {
          min-width: 100%;
          max-width: none;
          width: max-content;
          border-collapse: collapse;
          td {
            // max-width: 100px;
            max-width: 800rpx;
          }
        }
      }

      // 隐藏pre标签的code
      pre code:not(.hljs) {
        padding: 0;
        background-color: transparent;
      }

      .hljs[class*="language-"]:before {
        position: absolute;
        z-index: 3;
        top: 0.8em;
        right: 1em;
        font-size: 0.8em;
        color: #999;
      }

      .hljs[class~="language-js"]:before {
        content: "js";
      }

      .hljs[class~="language-ts"]:before {
        content: "ts";
      }

      .hljs[class~="language-html"]:before {
        content: "html";
      }

      .hljs[class~="language-md"]:before {
        content: "md";
      }

      .hljs[class~="language-vue"]:before {
        content: "vue";
      }

      .hljs[class~="language-css"]:before {
        content: "css";
      }

      .hljs[class~="language-sass"]:before {
        content: "sass";
      }

      .hljs[class~="language-scss"]:before {
        content: "scss";
      }

      .hljs[class~="language-less"]:before {
        content: "less";
      }

      .hljs[class~="language-stylus"]:before {
        content: "stylus";
      }

      .hljs[class~="language-go"]:before {
        content: "go";
      }

      .hljs[class~="language-java"]:before {
        content: "java";
      }

      .hljs[class~="language-c"]:before {
        content: "c";
      }

      .hljs[class~="language-sh"]:before {
        content: "sh";
      }

      .hljs[class~="language-yaml"]:before {
        content: "yaml";
      }

      .hljs[class~="language-py"]:before {
        content: "py";
      }

      .hljs[class~="language-docker"]:before {
        content: "docker";
      }

      .hljs[class~="language-dockerfile"]:before {
        content: "dockerfile";
      }

      .hljs[class~="language-makefile"]:before {
        content: "makefile";
      }

      .hljs[class~="language-javascript"]:before {
        content: "js";
      }

      .hljs[class~="language-typescript"]:before {
        content: "ts";
      }

      .hljs[class~="language-markup"]:before {
        content: "html";
      }

      .hljs[class~="language-markdown"]:before {
        content: "md";
      }

      .hljs[class~="language-json"]:before {
        content: "json";
      }

      .hljs[class~="language-ruby"]:before {
        content: "rb";
      }

      .hljs[class~="language-python"]:before {
        content: "py";
      }

      .hljs[class~="language-bash"]:before {
        content: "sh";
      }

      .hljs[class~="language-php"]:before {
        content: "php";
      }
    }
  }
}
</style>
