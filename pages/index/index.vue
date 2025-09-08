<template>
  <scroll-view scroll-y scroll-x class="content">
    <silkide-markdown-streaming
      ref="smsRef"
      :source="source"
      :config="config"
    />
  </scroll-view>
</template>

<script setup>
import { ref, onMounted } from "vue";

const smsRef = ref(null);

const config = ref({
  isStreamingParse: true,
});

onMounted(() => {
  let count = 0;
  setInterval(() => {
    count++;
    if (count > 5) return;
    smsRef.value.write(`
### 这是第${count}个标题 $\\frac{1}{2}$
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} \\quad \\text{且} \\quad \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} \\quad \\text{以及} \\quad \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\quad \\text{其中} \\quad \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} \\quad \\text{和} \\quad \\oint_{\\partial S} \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{A}
$$

块级复杂公式 \`const a = 1\`：
\`\`\`javascript
const a = 1;
const b = 2;
function sum(a, b) {
  return a + b;
}

$\\frac{1}{2}$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} \\quad \\text{且} \\quad \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} \\quad \\text{以及} \\quad \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\quad \\text{其中} \\quad \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} \\quad \\text{和} \\quad \\oint_{\\partial S} \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{A}
$$

console.log(sum(a, b));

\`\`\`

| 列1 | 列2 | 列3 | 列4 | 列5 | 列6 | 列7 | 列8 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| 普通文本 | 包含换行的文本<br>第二行内容<br>第三行内容 | 行内公式 $\\frac{a}{b}$ | 第四列内容 | 第五列内容 | 第六列内容 | 第七列内容 | 第八列内容 |
| 代码块示例 | 复杂公式<br>$$\\int_{0}^{\\infty} x^2 e^{-x} dx = 2$$ | 多行内容包含粗体和斜体 |更多数据 | 测试内容 | 示例文本 | 额外信息 | 最后数据 |
| \`inline code\` | 表格中的代码块：<br>\`\`\`python<br>def hello():<br>    print("Hello World")<br>    return True<br>\`\`\` | 更多公式<br>$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$ | 代码示例 | 函数调用 | 变量定义 | 逻辑处理 | 返回值|
| 复杂内容 | 混合内容：<br>1. 列表项1<br>2. 列表项2<br>公式：$E = mc^2$<br>代码：\`var x = 10;\` | 数学公式<br>$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$<br>结束 | 物理常数 | 化学方程 | 生物概念 | 地理信息 | 历史事件 |

`);
  }, 50);
});
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}
</style>
