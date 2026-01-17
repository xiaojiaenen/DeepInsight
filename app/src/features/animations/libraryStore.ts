import type { KnowledgePoint } from './animationTypes'

const STORAGE_KEY = 'deepinsight:animationLibrary:v1'

const builtins: KnowledgePoint[] = [
  {
    id: 'linear-regression-gd',
    title: '线性回归：梯度下降',
    description: '用最小二乘与梯度下降理解“拟合一条直线”。',
    script: {
      durationMs: 60_000,
      events: [
        { atMs: 0, title: '问题', body: '给定 (x, y) 数据点，找到一条直线 y = wx + b 来拟合它们。' },
        { atMs: 8000, title: '损失函数', body: '用 MSE：loss = mean((wx+b - y)^2)。loss 越小，拟合越好。' },
        { atMs: 16000, title: '梯度', body: '对 w、b 求导得到 dw、db，用它们指示“往哪走能让 loss 下降”。' },
        { atMs: 26000, title: '更新规则', body: 'w -= lr * dw;  b -= lr * db。lr 太大会震荡，太小会收敛慢。' },
        { atMs: 38000, title: '训练曲线', body: '把每一步的 loss 记录成指标（__METRIC__），就能在 Runs 里看到是否真的变好。' },
        { atMs: 52000, title: '你要做的事', body: '在 Lab 里补全 TODO：实现梯度下降，并让 loss 下降到目标阈值。' },
      ],
    },
  },
  {
    id: 'loss-functions-mse-ce',
    title: '损失函数：MSE vs 交叉熵',
    description: '回归与分类的目标函数，以及它们为什么常用。',
    script: {
      durationMs: 70_000,
      events: [
        { atMs: 0, title: '目标', body: '训练=最小化一个标量目标：loss。loss 把“效果好不好”变成可优化的数。' },
        { atMs: 9000, title: 'MSE（回归）', body: 'MSE = mean((y_pred - y)^2)。误差越大惩罚越大，适合连续值回归。' },
        { atMs: 20000, title: '交叉熵（分类）', body: '二分类常用 BCE：-y*log(p) - (1-y)*log(1-p)。多分类用 Softmax-CE。' },
        { atMs: 34000, title: '为什么交叉熵更合适', body: '分类输出是概率分布；交叉熵直接度量“预测分布和真实分布差多远”。' },
        { atMs: 52000, title: '从 loss 看训练', body: '在 Runs 里记录 loss（__METRIC__）是最小 MLOps：能比较参数/代码改动带来的变化。' },
      ],
    },
  },
  {
    id: 'logistic-regression',
    title: '逻辑回归：从线性到分类',
    description: 'sigmoid + 交叉熵，把直线变成分类器。',
    script: {
      durationMs: 75_000,
      events: [
        { atMs: 0, title: '直觉', body: '线性模型输出 z = wx + b。分类想要的是概率 p∈(0,1)。' },
        { atMs: 10000, title: 'Sigmoid', body: 'p = sigmoid(z) = 1/(1+exp(-z))。z 越大，p 越接近 1。' },
        { atMs: 23000, title: '决策边界', body: 'p=0.5 等价 z=0，所以边界是 wx+b=0（依然是线性）。' },
        { atMs: 36000, title: '损失与梯度', body: '用 BCE。梯度让你沿着“减少分类错误概率”的方向更新参数。' },
        { atMs: 56000, title: '如何评估', body: '除了 loss，还能记录 accuracy/precision/recall 等指标，形成可复盘的训练过程。' },
      ],
    },
  },
  {
    id: 'softmax-classification',
    title: 'Softmax：多分类概率',
    description: '把 logits 变成概率分布，配合交叉熵训练。',
    script: {
      durationMs: 70_000,
      events: [
        { atMs: 0, title: '从二分类到多分类', body: '二分类输出一个 p。K 类分类需要一个长度为 K 的概率向量。' },
        { atMs: 11000, title: 'Softmax', body: 'softmax(z)_i = exp(z_i)/sum_j exp(z_j)。输出非负且和为 1。' },
        { atMs: 25000, title: 'Logits 的意义', body: 'z_i 是“偏好分数”。差值越大，概率差距越大。' },
        { atMs: 39000, title: '交叉熵', body: 'CE = -log(p_true)。鼓励真实类别概率变大。' },
        { atMs: 56000, title: '训练时看什么', body: '记录 loss、top-1 acc、top-5 acc 等，比较不同模型/超参。' },
      ],
    },
  },
  {
    id: 'backprop-intro',
    title: '反向传播：链式法则',
    description: '为什么深度学习能训练：把梯度从输出层传回输入层。',
    script: {
      durationMs: 80_000,
      events: [
        { atMs: 0, title: '核心问题', body: '我们需要 loss 对每个参数的导数：dL/dθ，才能做梯度下降。' },
        { atMs: 12000, title: '链式法则', body: '复合函数导数：dL/dx = dL/dy * dy/dx。层层相乘。' },
        { atMs: 26000, title: '计算图', body: '把前向过程看成图：节点是张量，边是运算。反向传播就是沿图回传梯度。' },
        { atMs: 42000, title: '为什么高效', body: '每个中间量的梯度只算一次并复用（动态规划思想）。' },
        { atMs: 60000, title: '调试训练', body: '如果 loss 不降，可能是梯度为 0/爆炸、学习率不合适、数据没归一化等。' },
      ],
    },
  },
  {
    id: 'bias-variance',
    title: '偏差-方差：过拟合的语言',
    description: '解释训练集好但测试集差的根因。',
    script: {
      durationMs: 70_000,
      events: [
        { atMs: 0, title: '现象', body: '训练集 loss 很低，但验证/测试 loss 很高：过拟合。' },
        { atMs: 12000, title: '偏差', body: '模型太简单，表达能力不足：训练误差都降不下来（欠拟合）。' },
        { atMs: 26000, title: '方差', body: '模型太复杂，对数据噪声敏感：训练很强但泛化差。' },
        { atMs: 42000, title: '如何诊断', body: '看 train/val 曲线：两者都高→偏差；train 低 val 高→方差。' },
        { atMs: 56000, title: '常用手段', body: '正则化、更多数据、数据增强、早停、降低模型容量。' },
      ],
    },
  },
  {
    id: 'regularization',
    title: '正则化：L2 / Dropout / 早停',
    description: '让模型更泛化的三种常用做法。',
    script: {
      durationMs: 75_000,
      events: [
        { atMs: 0, title: '目标', body: '减少过拟合：让模型对新数据更稳。' },
        { atMs: 11000, title: 'L2 正则', body: '在 loss 里加 λ||w||^2，鼓励权重更小，避免过度拟合噪声。' },
        { atMs: 27000, title: 'Dropout', body: '训练时随机丢弃部分神经元，相当于集成很多子网络，提升鲁棒性。' },
        { atMs: 45000, title: '早停', body: '当验证集指标不再提升就停止训练，避免继续拟合噪声。' },
        { atMs: 61000, title: '如何记录', body: '在 Runs 里同时记录 train_loss/val_loss，才能看到正则化是否真正改善泛化。' },
      ],
    },
  },
  {
    id: 'data-normalization',
    title: '数据归一化：为什么训练更稳定',
    description: '特征尺度影响梯度与学习率，归一化能显著改善收敛。',
    script: {
      durationMs: 65_000,
      events: [
        { atMs: 0, title: '问题', body: '不同特征尺度差异大时，梯度方向会被大尺度特征主导，训练变慢/不稳定。' },
        { atMs: 12000, title: '标准化', body: 'x = (x-mean)/std，让特征均值为 0、方差为 1。' },
        { atMs: 26000, title: 'Min-Max', body: '把特征缩放到 [0,1] 或 [-1,1]，便于数值稳定。' },
        { atMs: 42000, title: '和学习率的关系', body: '归一化后更容易用一个统一的学习率，不用反复试错。' },
        { atMs: 54000, title: '实践', body: '训练前先做归一化，并记录 loss 曲线，通常会看到更平滑的下降。' },
      ],
    },
  },
  {
    id: 'metrics-precision-recall',
    title: '指标：Precision / Recall / F1',
    description: '分类任务中比 accuracy 更重要的指标。',
    script: {
      durationMs: 80_000,
      events: [
        { atMs: 0, title: '为什么不只看 accuracy', body: '类别不平衡时 accuracy 会“虚高”。需要更细的指标。' },
        { atMs: 14000, title: 'Precision', body: '预测为正的样本里，有多少是真的正：TP/(TP+FP)。' },
        { atMs: 28000, title: 'Recall', body: '所有真正的正样本里，有多少被找出来：TP/(TP+FN)。' },
        { atMs: 42000, title: 'F1', body: 'F1 是 Precision 与 Recall 的调和平均，平衡两者。' },
        { atMs: 56000, title: '阈值与权衡', body: '调阈值会改变 P/R：更严格→precision 高、recall 低；更宽松相反。' },
        { atMs: 70000, title: '如何在软件里用', body: '训练时输出多个 __METRIC__：loss、precision、recall、f1，Runs 面板就能对比实验。' },
      ],
    },
  },
]

type Listener = (items: KnowledgePoint[]) => void

let custom: KnowledgePoint[] = []
const listeners = new Set<Listener>()

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    custom = parsed as KnowledgePoint[]
  } catch (e) {
    void e
  }
}

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  } catch (e) {
    void e
  }
}

load()

export function getKnowledgePoints(): KnowledgePoint[] {
  return [...builtins, ...custom]
}

export function subscribeKnowledgePoints(listener: Listener) {
  listeners.add(listener)
  listener(getKnowledgePoints())
  return () => {
    listeners.delete(listener)
  }
}

const notify = () => {
  const items = getKnowledgePoints()
  for (const l of listeners) l(items)
}

export function addKnowledgePoint(item: KnowledgePoint) {
  custom = [item, ...custom.filter((x) => x.id !== item.id)]
  persist()
  notify()
}

export function removeKnowledgePoint(id: string) {
  custom = custom.filter((x) => x.id !== id)
  persist()
  notify()
}
