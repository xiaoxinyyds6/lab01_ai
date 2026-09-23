/* ==========================================================================
   data.js — 站点数据
   新增项目：在 PROJECTS 数组末尾追加一个对象即可，
   编号、分类筛选按钮、技术栈行、tag 标签都会由 main.js 自动生成。

   字段说明：
     layout   版式：'feature' 大图主打 | 'split' 左右对半 | 'banner' 全宽横图 | 'stack' 小图长文
     flip     true 时图片移到右侧（仅 split 版式有意义，用于制造杂志翻页节奏）
     category 分类（大类），用于筛选，会自动汇入筛选按钮
     tags     标签（小类），显示在项目标题上方，1-3 个为宜
     sub      英文副标题，衬线斜体
     stat     局部色块指标 { value, label }
     detail   展开后的补充说明段落数组
     date     完成时间，字符串，用于排序与展示
     stack    技术栈数组
   ========================================================================== */

const PROFILE = {
  name: '林炯汉',
  nameEn: 'Jionghan Lin',
  role: '软件工程专业 · 广州软件学院在读',
  focus: 'AI 辅助开发 / 大语言模型应用',
};

const PROJECTS = [
  {
    id: 'ai-code-reviewer',
    layout: 'banner',
    title: 'AI Code Reviewer — 让 LLM 帮你审代码',
    sub: 'Let the model read your diff',
    category: 'AI应用',
    tags: ['LLM', 'Python', '自动化'],
    date: '2025.09',
    stack: ['Python', 'LLM API', 'Git', 'CLI'],
    stat: { value: 'CI', label: '可接入流水线' },
    desc:
      '一个命令行工具，接入大语言模型 API，自动对 git diff 中的代码改动做审查——发现潜在 bug、' +
      '风格问题和性能隐患，并给出改进建议。支持配置审查规则和温度参数，可直接接入 CI 流程。',
    detail: [
      '核心流程：读取 git diff → 切分代码块 → 组装审查提示词 → 调用 LLM API → 汇总为结构化评审意见（风险等级 / 问题描述 / 修改建议）。',
      '支持自定义审查规则文件，团队可以把"禁止使用 var"这类约定写成规则，让模型按团队标准输出意见。',
      '为了控制成本，实现了 diff 去重与缓存：同一提交重复审查时直接返回缓存结果，API 调用量明显下降。',
    ],
    image:
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20editorial%20cover%20illustration%20of%20a%20glowing%20circuit%20brain%20reviewing%20lines%20of%20source%20code%2C%20ink%20drawing%20with%20one%20vermilion%20accent%20on%20textured%20cream%20paper%2C%20geometric%2C%20magazine%20artwork&image_size=landscape_16_9',
  },
  {
    id: 'llm-chat-web',
    layout: 'split',
    flip: true,
    title: 'LLM Chat — 轻量级对话 Web 应用',
    sub: 'A lightweight chat UI in TypeScript',
    category: 'AI应用',
    tags: ['TypeScript', 'Web', '流式输出'],
    date: '2025.08',
    stack: ['TypeScript', 'Next.js', 'LLM API', 'Tailwind'],
    stat: { value: '50KB', label: '前端包体积' },
    desc:
      '基于 Next.js 的轻量级 LLM 对话应用，支持流式输出、多会话管理和系统提示词配置。' +
      '前端用 TypeScript 实现打字机效果与消息渲染，后端通过 Edge Runtime 处理流式响应，' +
      '整体包体积控制在 50KB 以内。',
    detail: [
      '流式输出基于 SSE 实现，前端用 ReadableStream 逐段解析并渲染打字机效果，首字响应控制在一秒内。',
      '多会话管理使用 IndexedDB 本地存储，支持会话重命名、置顶与导出 Markdown。',
      '系统提示词支持多套预设切换，方便对比不同模型与提示词下的回答质量。',
    ],
    image:
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=editorial%20illustration%20of%20a%20glass%20chat%20interface%20window%20with%20a%20single%20vermilion%20dot%20cursor%20and%20flowing%20text%20lines%2C%20black%20ink%20on%20cream%20paper%2C%20minimalist%20geometric%2C%20magazine%20style&image_size=landscape_4_3',
  },
  {
    id: 'data-dashboard',
    layout: 'stack',
    title: '数据可视化仪表盘',
    sub: 'From raw CSV to interactive charts',
    category: '数据可视化',
    tags: ['ECharts', 'Python', 'Web'],
    date: '2025.07',
    stack: ['Python', 'Pandas', 'ECharts', 'Flask'],
    stat: { value: '12+', label: '图表组件' },
    desc:
      '基于 Python + ECharts 搭建的数据可视化仪表盘，支持多维度数据筛选、实时刷新和图表交互。' +
      '后端用 Flask 提供接口，前端通过 CDN 引入 ECharts 渲染地图、柱状图、折线图等多种图表类型。',
    detail: [
      '后端用 Pandas 完成数据清洗与聚合，Flask 只暴露轻量 JSON 接口，前端拿到数据后本地渲染，交互无需回源。',
      '图表层封装了统一的主题配置：色板、网格线、悬浮提示都继承同一套变量，新增图表只需两行配置。',
      '支持 CSV 上传导入，上传后自动识别字段类型并推荐默认图表，同学经常拿它来分析课程数据。',
    ],
    image:
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20editorial%20illustration%20of%20stacked%20bar%20and%20line%20charts%20rising%20like%20architecture%2C%20black%20ink%20with%20vermilion%20and%20amber%20accents%20on%20cream%20paper%2C%20minimalist%20geometric%2C%20magazine%20infographic&image_size=square',
  },
  {
    id: 'qingjizhang',
    layout: 'feature',
    title: '轻记账 — 极简生活记账小程序',
    sub: 'Quick records, clear spending',
    category: '移动应用',
    tags: ['微信小程序', '云开发'],
    date: '2025.04',
    stack: ['TypeScript', '微信小程序', '微信云开发', 'ECharts'],
    stat: { value: '3 秒', label: '完成一笔记账' },
    desc:
      '"轻记账"是一款面向日常生活场景的极简记账微信小程序，重点解决快速记录和查看个人收支的问题。' +
      '项目支持语音快捷记账、月度收支统计和预算提醒，并使用微信云开发完成数据存储与后端能力。',
    detail: [
      '语音记账借助微信同声传译插件，把实时识别结果自动填入金额与备注字段，双手被占用时也能快速记一笔。',
      '数据存储使用微信云开发的云数据库，省去独立服务器的维护成本；月度统计图表用 ECharts 渲染，支持按类别与时间区间切换。',
      '预算提醒在月支出接近阈值时推送订阅消息，这个功能让我第一次完整走通了微信订阅消息的申请、发送与退订流程。',
    ],
    image:
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=warm%20editorial%20still%20life%20illustration%20of%20a%20minimal%20ledger%20notebook%20beside%20a%20phone%20showing%20expense%20categories%2C%20charcoal%20ink%20with%20one%20vermilion%20checkmark%20on%20cream%20paper%2C%20geometric%2C%20magazine%20art&image_size=landscape_4_3',
  },
  {
    id: 'spring-boot-api',
    layout: 'split',
    title: 'Spring Boot RESTful 后端服务',
    sub: 'JWT auth, caching & clean layering',
    category: 'Web应用',
    tags: ['Java', 'Spring Boot', '后端'],
    date: '2025.02',
    stack: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
    stat: { value: 'P95', label: '120ms 响应' },
    desc:
      '基于 Spring Boot 的 RESTful API 服务，提供用户认证、数据 CRUD、权限管理等基础能力。' +
      '使用 JWT 做无状态鉴权，Redis 做热点数据缓存，MySQL 做持久化存储，接口响应时间 P95 控制在 120ms 以内。',
    detail: [
      '分层清晰：Controller 只做参数校验，Service 承载业务，Mapper 层管理复杂 SQL，接口文档用 Swagger 自动生成。',
      '鉴权采用 JWT 无状态方案，配合拦截器做路由级权限控制；登录签发与刷新逻辑独立成模块，方便复用。',
      'Redis 缓存热点数据并设置随机过期时间，避免缓存同时失效造成的雪崩，压测下接口 P95 稳定在 120ms 以内。',
    ],
    image:
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=editorial%20illustration%20of%20a%20helical%20spring%20forming%20a%20bridge%20between%20a%20database%20cylinder%20and%20code%20blocks%2C%20black%20ink%20with%20one%20red%20accent%20on%20cream%20paper%2C%20minimalist%20geometric%2C%20magazine%20spread&image_size=landscape_4_3',
  },
];
