if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
  }
  const block0 = (Comp) => {
    (Comp.$renderjs || (Comp.$renderjs = [])).push("markdownRender");
    (Comp.$renderjsModules || (Comp.$renderjsModules = {}))["markdownRender"] = "5dde2a00";
  };
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$2 = {
    props: {
      config: {
        type: Object,
        default: () => ({
          // 配置
          isStreamingParse: false,
          // 是否是流式解析 true: 使用 streaming-markdown解析；false: 使用 markdown-it解析
          isPurify: true
          // 是否启用html过滤，检测到恶意代码直接暂停
        })
      },
      source: {
        type: String,
        default: ""
      },
      showLine: {
        type: [Boolean, String],
        default: true
      }
    },
    data() {
      return {
        targetId: "md_target_" + Date.now() + Math.random().toString(36).substring(2),
        appendTextSignal: ""
      };
    },
    methods: {
      onRenderjsImageClick(detail) {
        if (detail && detail.src) {
          uni.previewImage({
            urls: [detail.src]
          });
        }
      },
      onRenderjsImageLoad(detail) {
        if (detail && detail.src) {
          formatAppLog("log", "at uni_modules/silkide-markdown-streaming/components/silkide-markdown-streaming/silkide-markdown-streaming.vue:61", "发起图片加载完毕事件");
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
                icon: "none"
              });
            },
            error() {
              uni.showToast({
                title: "复制失败",
                icon: "none"
              });
            }
          });
        }
      },
      onRenderjsLinkClick(detail) {
        if (detail && detail.href) {
          uni.navigateTo({
            url: `/pages/webview/index?url=${encodeURIComponent(detail.href)}`
          });
        }
      },
      /**
       * 对外暴露：追加文本到 fullText（通过 renderjs 的 appendText 执行）
       * @param {string} text
       */
      write(text) {
        if (text === void 0 || text === null)
          return;
        const chunk = typeof text === "string" ? text : String(text);
        this.appendTextSignal = chunk;
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "sms__markdown" }, [
      vue.createElementVNode("view", {
        class: "sms-markdown-wrapper",
        config: vue.wp($props.config),
        "change:config": _ctx.markdownRender.updateConfig,
        source: vue.wp($props.source),
        "change:source": _ctx.markdownRender.updateSource,
        "show-line": vue.wp($props.showLine),
        "change:show-line": _ctx.markdownRender.updateShowLine,
        "target-id": vue.wp($data.targetId),
        "change:target-id": _ctx.markdownRender.setTargetId,
        "append-text": vue.wp($data.appendTextSignal),
        "change:append-text": _ctx.markdownRender.appendText
      }, [
        vue.createElementVNode("view", {
          id: $data.targetId,
          class: "markdown-content-host"
        }, null, 8, ["id"])
      ], 8, ["config", "change:config", "source", "change:source", "show-line", "change:show-line", "target-id", "change:target-id", "append-text", "change:append-text"])
    ]);
  }
  if (typeof block0 === "function")
    block0(_sfc_main$2);
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-0ecf04c8"], ["__file", "C:/_My_work/_Mine/markdown-test/uni_modules/silkide-markdown-streaming/components/silkide-markdown-streaming/silkide-markdown-streaming.vue"]]);
  const _sfc_main$1 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const smsRef = vue.ref(null);
      const config = vue.ref({
        isStreamingParse: false
      });
      const source = vue.ref(`
# 标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
公式：
$$
frac{1}{2}
$$
这是个公式$\\frac{1}{2}$
  `);
      vue.onMounted(() => {
        let count = 0;
        setInterval(() => {
          count++;
          if (count > 100)
            return;
          smsRef.value.write(`
### 这是第${count}个标题 $\\frac{1}{2}$
块级复杂公式 \`const a = 1\`：
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} \\quad \\text{且} \\quad \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} \\quad \\text{以及} \\quad \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\quad \\text{其中} \\quad \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} \\quad \\text{和} \\quad \\oint_{\\partial S} \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{A}
$$
\`\`\`
const a = 1;
const b = 2;
function sum(a, b) {
  return a + b;
}

__f__('log','at pages/index/index.vue:59',sum(a, b));

\`\`\`

`);
        }, 20);
      });
      const __returned__ = { smsRef, config, source, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_silkide_markdown_streaming = resolveEasycom(vue.resolveDynamicComponent("silkide-markdown-streaming"), __easycom_0);
    return vue.openBlock(), vue.createElementBlock("scroll-view", {
      "scroll-y": "",
      "scroll-x": "",
      class: "content"
    }, [
      vue.createVNode(_component_silkide_markdown_streaming, {
        ref: "smsRef",
        source: $setup.source,
        config: $setup.config
      }, null, 8, ["source", "config"])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "C:/_My_work/_Mine/markdown-test/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "C:/_My_work/_Mine/markdown-test/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
