<div align=center>  # uniapp-markdown-streaming ✨ </div>
<div align=center>  高性能 Markdown 流式渲染 uni-app 插件  </div>

**🚧 开发中...**

## ✨ 特点

本项目思路参考谷歌开发者文档[呈现流式 LLM 回答的最佳实践](https://developer.chrome.com/docs/ai/render-llm-responses?hl=zh-cn)一文，专为处理流式场景下的 markdown 渲染问题。

### 双 Markdown 解析引擎

本插件集成了广为人知的 [markdown-it](https://github.com/markdown-it/markdown-it) 库，和支持流式解析的 [streaming-markdown](https://github.com/thetarnav/streaming-markdown) 库。

前者历史悠久，且有着相当丰富的生态，可扩展性强，解决方案多。但是在**流式解析**场景下有诸多局限。比如在 LLM 项目中，若使用 markdown-it 之类的传统 markdown 解析库来处理流式数据，都是将新接收到的 chunk 拼接到已有字符串中，组成完整的字符再做全量解析。因此每个 chunk 到达时，都会进行一次全量解析，好在 markdown-it 的解析速度够快，所以一般情况是够用的。

得益于[最佳实践](https://developer.chrome.com/docs/ai/render-llm-responses?hl=zh-cn)，本项目添加了 streaming-markdown，它内部维护了一个状态机和缓存层，能进行增量解析，大大提高了流式场景下的性能。但是这个库还非常年轻，使用也不广泛，因此才作为附加选项集成进来。

### 渲染优化

[最佳实践](https://developer.chrome.com/docs/ai/render-llm-responses?hl=zh-cn) 中还建议使用诸如 `appendChild` 之类的 API 增量地更改 DOM。

本插件引入了[增量 DOM](https://github.com/google/incremental-dom)，在 markdown-it 全量解析之后，进行增量渲染，防止每次 chunk 到达时重新渲染所有 DOM 影响性能。而使用 streaming-markdown 天然是增量渲染，因此没有做额外处理。

### DOM 清洗

[最佳实践](https://developer.chrome.com/docs/ai/render-llm-responses?hl=zh-cn) 中提出，LLM 被提示词注入攻击后，可能会产出恶意代码。因此需要对 Markdown 文本中的代码进行清洗。本项目集成了[DOMPurify](https://github.com/cure53/DOMPurify)，一旦检测出恶意代码，立即停止渲染。

## 🧪 基础用法

```vue
<silkide-markdown-streaming ref="smsRef" :config="config" />
<script setup>
import { ref, onMounted } from "vue";
const smsRef = ref(null);
const config = ref({
  isStreaming: false, // 是否使用 streaming-markdown渲染
});
// 模拟llm输入
onMounted(() => {
  setInterval(() => {
    smsRef.value.write("chunk");
  });
});
</script>
```

## 🧩 组件说明

### 属性

| 属性名 | 类型   | 说明         |
| ------ | ------ | ------------ |
| config | Object | 用于配置组件 |

### 实例方法

`write( chunk: string )` ：添加新的文本块

### config 配置项

| 字段名      | 类型    | 默认值 | 说明                                                                 |
| ----------- | ------- | ------ | -------------------------------------------------------------------- |
| isStreaming | Boolean | false  | true：使用 streaming-markdown 渲染<br />false：使用 markdown-it 渲染 |

## 🚀 功能列表

- [x] 支持 markdown-it 解析
  - [x] 支持公式
  - [x] 支持代码块
  - [ ] 自定义文本预处理
- [x] 支持 streaming-markdown 解析
  - [x] 支持公式
  - [ ] 支持代码块
- [x] 切换渲染方式
- [x] 文本片段输入
- [ ] 优化 markdown-it 公式和代码块渲染机制 ⚙️
- [ ] 中止渲染功能
- [ ] 节流控制
- [ ] 自定义样式
- [ ] 自定义交互事件
