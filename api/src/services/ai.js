// AI 服务层：统一封装大模型调用，未配置或调用失败时自动降级为本地规则算法
const LANG_NAMES = {
  zh: '简体中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

const RISK_WORDS = ['赌博', '博彩', '色情', '代购', '刷单', '办证', '枪支', '毒品', '诈骗'];
const CONTACT_PATTERN = /(加|扫)\s*(微信|wx|vx)|(微信|QQ|qq)\s*[:：]?\s*[A-Za-z0-9_-]{5,}|1[3-9]\d{9}|公众号/i;

const TYPO_RULES = [
  [/登陆/g, '登录'],
  [/帐户/g, '账户'],
  [/做为/g, '作为'],
  [/在次/g, '再次'],
  [/既使/g, '即使'],
  [/因该/g, '应该'],
  [/以经/g, '已经'],
  [/按装/g, '安装'],
  [/布署/g, '部署'],
  [/竟争/g, '竞争'],
  [/须要/g, '需要'],
];

export class AIUnavailableError extends Error {}

const provider = () => {
  const explicit = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  if (['openai', 'coze', 'ollama', 'local'].includes(explicit)) return explicit;
  if (process.env.AI_API_KEY) return 'openai';
  if (process.env.COZE_API_TOKEN) return 'coze';
  return 'local';
};

export const getAIStatus = () => {
  const name = provider();
  return {
    provider: name,
    configured: name !== 'local',
    model: name === 'openai' || name === 'ollama' ? process.env.AI_MODEL : undefined,
  };
};

async function chatOpenAI(system, user, maxTokens = 1500) {
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI 接口返回 ${res.status}: ${text.slice(0, 160)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } finally {
    clearTimeout(timer);
  }
}

// Ollama 原生接口：关闭思考模式，避免推理内容占满输出
async function chatOllama(system, user, maxTokens = 1500) {
  const base = (process.env.AI_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
        think: false,
        options: { temperature: 0.3, num_predict: maxTokens },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama 接口返回 ${res.status}: ${text.slice(0, 160)}`);
    }
    const data = await res.json();
    return data.message?.content?.trim() || '';
  } finally {
    clearTimeout(timer);
  }
}

async function chatCoze(prompt) {
  const token = process.env.COZE_API_TOKEN;
  const botId = process.env.COZE_BOT_ID;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const createRes = await fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bot_id: botId,
      user_id: 'techforum_ai',
      stream: false,
      auto_save_history: true,
      additional_messages: [{ role: 'user', content: prompt, content_type: 'text' }],
    }),
  });
  const created = await createRes.json();
  if (created.code !== 0) throw new Error(created.msg || '扣子接口调用失败');

  const chatId = created.data.id;
  const conversationId = created.data.conversation_id;
  const deadline = Date.now() + 90000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const retrieveRes = await fetch(
      `https://api.coze.cn/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const detail = await retrieveRes.json();
    const status = detail.data?.status;

    if (status === 'completed') {
      const msgRes = await fetch(
        `https://api.coze.cn/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msgData = await msgRes.json();
      const answer = (msgData.data || [])
        .filter((m) => m.type === 'answer' && m.role === 'assistant')
        .map((m) => m.content)
        .join('\n')
        .trim();
      if (!answer) throw new Error('扣子未返回有效内容');
      return answer;
    }

    if (status === 'failed' || status === 'requires_action') {
      throw new Error(detail.data?.last_error?.msg || '扣子执行失败');
    }
  }

  throw new Error('扣子调用超时');
}

// 尝试调用大模型；失败返回 null，由调用方降级
async function tryChat(system, user) {
  try {
    const name = provider();
    if (name === 'openai' && process.env.AI_API_KEY) return await chatOpenAI(system, user);
    if (name === 'ollama') return await chatOllama(system, user);
    if (name === 'coze' && process.env.COZE_API_TOKEN) return await chatCoze(`${system}\n\n${user}`);
    return null;
  } catch (err) {
    console.warn('[AI] 调用失败，已降级为本地算法:', err.message);
    return null;
  }
}

// 必须成功的大模型调用（用于翻译，无法本地降级）
async function requiredChat(system, user) {
  const name = provider();
  if (name === 'openai' && process.env.AI_API_KEY) return chatOpenAI(system, user);
  if (name === 'ollama') return chatOllama(system, user);
  if (name === 'coze' && process.env.COZE_API_TOKEN) return chatCoze(`${system}\n\n${user}`);
  throw new AIUnavailableError('AI 服务未配置，请在 api/.env 中填写 AI_API_KEY、COZE_API_TOKEN，或将 AI_PROVIDER 设为 ollama');
}

function extractJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }
  return null;
}

function clampScore(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return 80;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/* ---------------- 摘要 ---------------- */

function localSummary(title, content, commentCount) {
  const text = String(content || '').replace(/\r/g, '').trim();
  const sentences = text
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const summary = (sentences.slice(0, 3).join('') || text).slice(0, 180);
  let oneLiner = (sentences[0] || title || text).slice(0, 40);
  if (commentCount > 0) oneLiner = `${oneLiner}（${commentCount} 条讨论）`;

  return {
    summary: summary || '暂无足够内容生成摘要',
    oneLiner: oneLiner || '暂无摘要',
  };
}

export async function generateSummary({ title, content, commentCount = 0, commentSample = [] }) {
  const prompt = [
    `标题：${title}`,
    '',
    '正文：',
    String(content || '').slice(0, 6000),
    commentSample.length ? `\n讨论摘录：\n${commentSample.slice(0, 12).join('\n')}` : '',
  ].join('\n');

  const raw = await tryChat(
    '你是论坛内容编辑。请阅读帖子正文和讨论摘录，输出 JSON：{"summary":"2-4 句详细摘要，不超过 180 字","oneLiner":"一句话总结，不超过 40 字"}。只输出 JSON，不要解释。',
    prompt
  );
  const data = extractJSON(raw);

  if (data && typeof data.summary === 'string' && typeof data.oneLiner === 'string') {
    return {
      summary: data.summary.trim(),
      oneLiner: data.oneLiner.trim(),
      source: 'ai',
    };
  }

  return { ...localSummary(title, content, commentCount), source: 'local' };
}

/* ---------------- 翻译 ---------------- */

export async function translateTexts(texts, targetLang = 'en') {
  const lang = LANG_NAMES[targetLang] || targetLang;
  const prompt = texts
    .map((text, index) => `[${index}]\n${text}`)
    .join('\n\n');

  const raw = await requiredChat(
    `你是专业翻译。将每条文本翻译成${lang}，保持原有顺序、段落换行和编号，不要增删信息，不要解释。只输出 JSON：{"translations":["译文1","译文2"]}`,
    prompt
  );
  const data = extractJSON(raw);

  if (!data || !Array.isArray(data.translations)) {
    throw new Error('翻译结果解析失败');
  }

  return {
    translations: texts.map((text, index) =>
      typeof data.translations[index] === 'string' && data.translations[index].trim()
        ? data.translations[index]
        : text
    ),
    source: 'ai',
  };
}

/* ---------------- 正文扩写 ---------------- */

export async function expandContent({ title, content }) {
  const draft = String(content || '').trim();
  const raw = await requiredChat(
    '你是技术论坛写作助手。请根据标题和用户草稿，扩写成一篇结构清晰、语句连贯的技术分享正文：必须保留草稿中的全部技术要点和事实，可以补充背景、实现步骤和总结，但不要编造未经证实的结论，不要添加联系方式或广告。输出 300-800 字纯文本，用空行分段，不要输出标题、Markdown 代码围栏或任何解释。',
    `标题：${title}\n\n草稿：\n${draft.slice(0, 4000)}`
  );

  const text = String(raw || '')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  if (!text) throw new Error('AI 未返回扩写内容');

  return { content: text, source: 'ai' };
}

/* ---------------- 发帖自检 ---------------- */

function localCheck(title, content) {
  const issues = [];
  let score = 100;

  const addIssue = (severity, type, message, suggestion) => {
    issues.push({ type, severity, message, suggestion });
    score -= severity === 'high' ? 20 : severity === 'medium' ? 10 : 5;
  };

  const titleText = String(title || '').trim();
  const contentText = String(content || '').trim();

  if (titleText.length < 5) {
    addIssue('medium', '内容', '标题过短，信息量不足', '建议补充更具体的主题，例如「Vue 3 组合式 API 实践总结」');
  }
  if (contentText.length < 30) {
    addIssue('medium', '内容', '正文过短，读者可能难以理解', '建议补充背景、过程和结论');
  }

  const repeatedPunctuation = contentText.match(/([，。！？、,.!?])\1{1,}/g) || [];
  if (repeatedPunctuation.length) {
    addIssue('low', '标点', `存在重复标点：${repeatedPunctuation.slice(0, 3).join('、')}`, '保留一个标点即可');
  }

  const repeatedChars = contentText.match(/([\u4e00-\u9fa5])\1{2,}/g) || [];
  if (repeatedChars.length) {
    addIssue('low', '语法', `存在重复用字：${repeatedChars.slice(0, 3).join('、')}`, '删除多余的重复字');
  }

  TYPO_RULES.forEach(([pattern, correct]) => {
    const matched = contentText.match(pattern);
    if (matched) {
      addIssue('medium', '错别字', `疑似错别字「${matched[0]}」`, `建议改为「${correct}」`);
    }
  });

  const longParagraph = contentText
    .split(/\n+/)
    .map((p) => p.trim())
    .find((p) => p.length > 500);
  if (longParagraph) {
    addIssue('low', '排版', '存在超过 500 字的超长段落', '建议按语义拆分为多个段落，提升可读性');
  }
  if (contentText.length > 400 && !contentText.includes('\n')) {
    addIssue('low', '排版', '长文没有分段', '建议用空行分隔段落');
  }

  if (CONTACT_PATTERN.test(contentText)) {
    addIssue('high', '内容', '疑似包含联系方式或站外引流信息', '社区内不允许发布联系方式');
  }
  RISK_WORDS.forEach((word) => {
    if (contentText.includes(word) || titleText.includes(word)) {
      addIssue('high', '内容', `包含敏感词「${word}」`, '请修改或删除相关内容');
    }
  });

  return {
    score: Math.max(0, score),
    issues,
    summary: issues.length
      ? `共发现 ${issues.length} 处可优化项，建议修改后再发布。`
      : '未发现明显问题，内容整体通顺。',
  };
}

export async function checkPost({ title, content }) {
  const raw = await tryChat(
    '你是中文内容校对助手。检查标题和正文中的错别字、语法错误、标点误用和排版问题。输出 JSON：{"score":0-100,"issues":[{"type":"错别字|语法|标点|排版|内容","severity":"high|medium|low","message":"问题说明","suggestion":"修改建议"}],"summary":"总体评价"}。只输出 JSON。',
    `标题：${title}\n\n正文：\n${String(content || '').slice(0, 6000)}`
  );
  const data = extractJSON(raw);

  if (data && Array.isArray(data.issues)) {
    return {
      score: clampScore(data.score),
      issues: data.issues.slice(0, 12).map((item) => ({
        type: String(item.type || '内容'),
        severity: ['high', 'medium', 'low'].includes(item.severity) ? item.severity : 'low',
        message: String(item.message || ''),
        suggestion: String(item.suggestion || ''),
      })),
      summary: String(data.summary || ''),
      source: 'ai',
    };
  }

  return { ...localCheck(title, content), source: 'local' };
}

/* ---------------- 后台内容审批 ---------------- */

function localReview(title, content) {
  const full = `${title}\n${content}`;
  const reasons = [];
  let score = 100;

  RISK_WORDS.forEach((word) => {
    if (full.includes(word)) {
      score -= 25;
      reasons.push(`包含敏感词「${word}」`);
    }
  });

  if (CONTACT_PATTERN.test(full)) {
    score -= 35;
    reasons.push('疑似包含联系方式或站外引流信息');
  }

  const links = full.match(/https?:\/\//g) || [];
  if (links.length >= 3) {
    score -= 15;
    reasons.push('正文中外链数量过多，疑似广告');
  }

  score = Math.max(0, score);
  const risk = score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high';
  const decision = score >= 80 ? 'approved' : score >= 50 ? 'manual' : 'rejected';

  if (!reasons.length) reasons.push('未发现明显违规内容');

  return { decision, risk, score, reasons };
}

export async function reviewPost({ title, content }) {
  const raw = await tryChat(
    '你是社区内容审核员。判断帖子是否包含广告引流、色情、暴力、赌博、违法、人身攻击或敏感信息。输出 JSON：{"decision":"approved|manual|rejected","risk":"low|medium|high","score":0-100,"reasons":["原因1","原因2"]}。score 越高表示越安全。只输出 JSON。',
    `标题：${title}\n\n正文：\n${String(content || '').slice(0, 6000)}`
  );
  const data = extractJSON(raw);

  if (data && Array.isArray(data.reasons)) {
    const score = clampScore(data.score);
    const decision = ['approved', 'manual', 'rejected'].includes(data.decision)
      ? data.decision
      : score >= 80
        ? 'approved'
        : score >= 50
          ? 'manual'
          : 'rejected';
    const risk = ['low', 'medium', 'high'].includes(data.risk)
      ? data.risk
      : score >= 80
        ? 'low'
        : score >= 50
          ? 'medium'
          : 'high';

    return {
      decision,
      risk,
      score,
      reasons: data.reasons.slice(0, 8).map(String),
      source: 'ai',
    };
  }

  return { ...localReview(title, content), source: 'local' };
}
