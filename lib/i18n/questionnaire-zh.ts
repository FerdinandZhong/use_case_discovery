// Simplified-Chinese overrides for the data-defined questionnaire (lib/questionnaire.ts).
// Keyed by section id, "sectionId.questionId", and "questionId.optionValue". Any missing
// key falls back to the English source, so partial translations degrade gracefully.
//
// localizeSection() returns a Section with all nested strings swapped to ZH when
// locale === 'zh', so the existing render code (which reads .label/.help/.options) works
// unchanged.

import type { Locale } from './locale';
import type { Question, Section } from '../questionnaire';

const SECTIONS_ZH: Record<string, { title?: string; subtitle?: string; intro?: string; repeatLabel?: string }> = {
  profile: { title: '关于您', subtitle: '以便我们在研讨会中带入合适的视角。' },
  friction: { title: '识别痛点', subtitle: 'AI 通常擅长解决的痛点——重复劳动、数据过载、预测不准。' },
  platform: { title: '平台与工具', subtitle: '您当前使用的平台,以及 AI 方案需要协同的工具。' },
  data_readiness: { title: '数据与工具就绪度', subtitle: '数据、管控与审批的可用性。这是发现工作最容易受阻的首要环节。' },
  strategic_impact: { title: '战略影响', subtitle: '帮助我们对用例排定优先级,也帮助您在内部推动立项。' },
  blue_sky: { title: '畅想空间', subtitle: '大胆设想一下。' },
  use_cases: {
    title: '候选用例',
    subtitle: '添加您已经想到的具体用例——包括多步骤的内部流程。我们会逐层深入分析每一个。',
    repeatLabel: '用例',
  },
};

const QUESTIONS_ZH: Record<
  string,
  { label?: string; help?: string; placeholder?: string; deckLabel?: string; scaleMin?: string; scaleMax?: string }
> = {
  'profile.name': { label: '您的姓名', placeholder: '张三', deckLabel: '我们在与谁交流?' },
  'profile.email': { label: '工作邮箱', placeholder: 'zhangsan@company.com' },
  'profile.role': {
    label: '以下哪项最符合您的角色?',
    deckLabel: '他们的角色',
    help: '高管发起人设定北极星目标;业务专家了解日常痛点;架构师把关数据与安全;终端用户告诉我们什么方案可落地。',
  },
  'profile.department': { label: '团队 / 部门', placeholder: '例如:SRE、财务运营' },

  'friction.core_process': {
    label: '找出您团队中一个每周至少占用 20% 人工投入的核心流程。',
    help: '例如:邮件分类、从 PDF 提取数据、汇总报告、核对发票——或某个多步骤的内部流程(如模型拉取申请:提交 Jira 工单 → 人工审批 → 填写详情 → 机器学习工程师执行)。',
  },
  'friction.bottleneck': { label: '在该流程中,主要的“卡点”是什么?', deckLabel: '工作卡在哪里?' },
  'friction.if_only_knew': {
    label: '如果您能以 90% 的准确率预测某一个业务变量,哪个变量最能改变您的策略?',
    help: '例如:客户流失、设备故障、下月需求。',
  },

  'platform.current_platform': { label: '您当前使用哪些数据 / 云平台?(可多选)', deckLabel: '您当前用什么?' },
  'platform.tools_stack': { label: '团队日常主要使用哪些工具?(可多选)', deckLabel: '你们常用哪些工具?' },

  'data_readiness.data_format': { label: '该流程的信息目前存放在哪里?(可多选)', deckLabel: '数据在哪里?' },
  'data_readiness.data_quality': {
    label: '按 1–5 分,您对这些数据当前的准确性与整洁度有多信任?',
    deckLabel: '你们有多信任这些数据?',
    scaleMin: '1 — 一团糟',
    scaleMax: '5 — 可直接分析',
  },

  'strategic_impact.value_driver': { label: '如果用 AI 自动化或增强这项任务,主要收益会是什么?' },
  'strategic_impact.risk_tolerance': { label: 'AI 需要达到多高的准确率,您才会信任它?' },

  'blue_sky.magic_assistant': {
    label: '如果有一个“神奇助手”通晓您领域内的全部历史数据,并能在几秒内回答任何问题,您会问的第一个问题是什么?',
  },

  'use_cases.uc_name': { label: '用例名称', placeholder: '例如:模型拉取申请自动化' },
  'use_cases.uc_pattern': {
    label: '哪种 AI 方案最合适?(可多选)',
    help: 'AI 的呈现形式——一个预测、一个助手,或一个跨工具执行操作的智能体。',
  },
  'use_cases.uc_process_steps': {
    label: '端到端列出当前步骤——每一步由谁(或哪个系统)完成?',
    help: '记录真实的工作流,包括交接与审批。',
    placeholder:
      '例如:1) 申请人提交 Jira 工单 2) 主管人工审批 3) 申请人填写模型详情 4) 机器学习工程师拉取并注册模型 5) 通知申请人',
  },
  'use_cases.uc_systems': { label: '该方案需要对接哪些系统 / 工具?' },
  'use_cases.uc_hitl': { label: '哪些环节必须有人工参与?', help: '对会真正执行操作的流程尤为重要。' },
  'use_cases.uc_frequency': { label: '这个问题出现的频率如何?' },
  'use_cases.uc_cost_of_inaction': { label: '不解决这个问题,目前的代价是什么?' },
  'use_cases.uc_history': {
    label: '相关历史数据可追溯多久?是否有带标注的结果?',
    placeholder: '例如:2 年带处理记录的工单;Confluence 中的 SOP / 操作手册',
  },
  'use_cases.uc_compliance': { label: '是否有监管、合规或审计约束?如果 AI 不可用会怎样?' },
  'use_cases.uc_kill_the_idea': {
    label: '“否决这个想法”:给出这个用例行不通的最有力理由。',
    help: '我们特意提出这个问题,以增强方案的稳健性。',
  },
};

// Option labels keyed by "questionId.optionValue".
const OPTIONS_ZH: Record<string, string> = {
  // role (ROLE_OPTIONS)
  'role.exec_sponsor': '高管发起人',
  'role.business_sme': '产品 / 业务负责人(领域专家)',
  'role.it_data_architect': 'IT / 数据架构师',
  'role.end_user': '终端用户',
  'role.other': '其他',
  // bottleneck
  'bottleneck.approval': '等待人工审批 / 评审(审批关卡)',
  'bottleneck.handoffs': '人员或团队之间的人工交接',
  'bottleneck.swivel_chair': '多系统切换——在各工具间复制粘贴(Jira、ERP、CI/CD、Wiki)',
  'bottleneck.ticketing': '重复的工单创建、分类或分派',
  'bottleneck.queue': '排队等待专家处理',
  'bottleneck.disparate_data': '从多个分散的系统中获取数据',
  'bottleneck.dirty_data': '清洗或整理不一致的数据',
  'bottleneck.specialized': '需要专业知识的复杂决策',
  // current_platform
  'current_platform.cloudera': 'Cloudera(CDP / CDH)',
  'current_platform.snowflake': 'Snowflake',
  'current_platform.databricks': 'Databricks',
  'current_platform.aws': 'AWS(原生服务)',
  'current_platform.azure': 'Azure(原生服务)',
  'current_platform.gcp': 'Google Cloud',
  'current_platform.hadoop_onprem': '本地部署 Hadoop',
  'current_platform.other_dw': '其他数据仓库',
  'current_platform.spreadsheets': '主要是电子表格 / 手工',
  'current_platform.other': '其他',
  // tools_stack
  'tools_stack.ticketing': 'Jira / ServiceNow(工单)',
  'tools_stack.chat': 'Slack / Teams / 邮件',
  'tools_stack.scm': 'GitHub / GitLab(代码、PR)',
  'tools_stack.cicd': 'CI/CD 与编排(Jenkins、Airflow、Argo)',
  'tools_stack.ml_platform': '机器学习平台 / 模型注册表(Cloudera AI、MLflow)',
  'tools_stack.erp_crm': 'ERP / CRM',
  'tools_stack.bi': 'BI(Tableau、Power BI、Looker)',
  'tools_stack.internal_api': '内部 API / 命令行工具',
  // data_format
  'data_format.structured': '结构化数据库(SQL、Snowflake、ERP)',
  'data_format.unstructured': '非结构化文档(PDF、Word、幻灯片)',
  'data_format.comms': '内部沟通记录(Slack、邮件、Teams)',
  'data_format.tribal': '经验性知识(只存在于员工脑海中)',
  // value_driver
  'value_driver.cost': '降本——减少人力或运营支出',
  'value_driver.velocity': '提速——同样的任务快 10 倍',
  'value_driver.quality': '质量——减少人为错误,提高一致性',
  'value_driver.revenue': '营收——新产品或更好的客户体验',
  'value_driver.toil': '减负——消除人工交接与重复步骤',
  'value_driver.cycle_time': '周期——缩短端到端时长与审批等待',
  'value_driver.governance': '治理——一致性、可追溯、可审计、合规',
  'value_driver.self_service': '自助化——减少对专家 / 工单队列的依赖',
  // risk_tolerance
  'risk_tolerance.low_risk': '低风险——70% 准确率即可(如内部草稿)',
  'risk_tolerance.high_risk': '高风险——需要 99% 准确率(如财务报告、法律合规)',
  // uc_pattern
  'uc_pattern.prediction': '预测 / 预报(数值或概率)',
  'uc_pattern.classification': '分类 / 分派 / 分诊',
  'uc_pattern.extraction': '文档抽取 / 解析',
  'uc_pattern.assistant': 'RAG 助手 / 基于知识的自然语言问答',
  'uc_pattern.summarization': '长文本摘要',
  'uc_pattern.anomaly': '异常检测 / 告警',
  'uc_pattern.agent_workflow': '跨工具执行多步骤操作的智能体(含审批)',
  // uc_systems
  'uc_systems.ticketing': 'Jira / ServiceNow(工单)',
  'uc_systems.chat': 'Slack / Teams / 邮件',
  'uc_systems.scm': 'GitHub / GitLab(代码、PR)',
  'uc_systems.cicd': 'CI/CD 与编排(Jenkins、Airflow、Argo)',
  'uc_systems.ml_platform': '机器学习平台 / 模型注册表(Cloudera AI、MLflow)',
  'uc_systems.erp_crm': 'ERP / CRM',
  'uc_systems.data': '数据库 / 数据仓库',
  'uc_systems.internal_api': '内部 API / 命令行工具',
  // uc_hitl
  'uc_hitl.approve_before': '审批关卡——任何操作前必须经人工批准',
  'uc_hitl.review_output': '复核——在使用前由人工检查 / 修改 AI 输出',
  'uc_hitl.exceptions': '仅处理例外——人工只处理边缘情况',
  'uc_hitl.autonomous': '完全自动——无需人工步骤',
  // uc_frequency
  'uc_frequency.daily': '每天',
  'uc_frequency.weekly': '每周',
  'uc_frequency.adhoc': '不定期',
};

/** ZH label for a stored option value (falls back to the question's EN label). */
export function localizedOptionLabel(question: Question, value: string, locale: Locale): string {
  const en = question.options?.find((o) => o.value === value)?.label ?? value;
  if (locale !== 'zh') return en;
  return OPTIONS_ZH[`${question.id}.${value}`] ?? en;
}

function localizeQuestion(q: Question, sectionId: string, locale: Locale): Question {
  if (locale !== 'zh') return q;
  const z = QUESTIONS_ZH[`${sectionId}.${q.id}`];
  return {
    ...q,
    label: z?.label ?? q.label,
    help: z?.help ?? q.help,
    placeholder: z?.placeholder ?? q.placeholder,
    deckLabel: z?.deckLabel ?? q.deckLabel,
    scaleLabels: q.scaleLabels
      ? { min: z?.scaleMin ?? q.scaleLabels.min, max: z?.scaleMax ?? q.scaleLabels.max }
      : q.scaleLabels,
    options: q.options?.map((o) => ({ ...o, label: OPTIONS_ZH[`${q.id}.${o.value}`] ?? o.label })),
  };
}

/** Return a fully-localized copy of a section (title/subtitle/intro/repeatLabel + questions). */
export function localizeSection(section: Section, locale: Locale): Section {
  if (locale !== 'zh') return section;
  const z = SECTIONS_ZH[section.id];
  return {
    ...section,
    title: z?.title ?? section.title,
    subtitle: z?.subtitle ?? section.subtitle,
    intro: z?.intro ?? section.intro,
    repeatLabel: z?.repeatLabel ?? section.repeatLabel,
    questions: section.questions.map((q) => localizeQuestion(q, section.id, locale)),
  };
}
