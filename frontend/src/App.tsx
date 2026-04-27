import { saveAs } from 'file-saver'
import { useMemo, useState, type ReactNode } from 'react'
import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Flag,
  Lightbulb,
  LoaderCircle,
  Megaphone,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

type PlanningRequest = {
  context: string
  objectives: string
  audience: string
  participant_count: string
  budget: string
  tone: string
  reference_notes: string
}

type InsightResponse = {
  title: string
  summary: string
  activity_overview: string
  core_goals: string[]
  audience_analysis: string[]
  market_analysis: string[]
  audience_personas: string[]
  pain_points: string[]
  opportunities: string[]
}

type CreativeCard = {
  title: string
  description: string
  accent: string
  icon: string
}

type StrategyResponse = {
  slogan: string
  theme: string
  theme_options: string[]
  tags: string[]
  creative_highlights: string[]
  creative_matrix: CreativeCard[]
  promotion_plan: string[]
}

type TimelineStage = {
  id: number
  name: string
  range: string
  tasks: string[]
  accent: string
  icon: string
}

type BudgetItem = {
  name: string
  amount: string
  ratio: number
  accent: string
  purpose: string
  market_reference: string
  saving_tip: string
}

type RiskItem = {
  title: string
  level: string
  response: string
  accent: string
}

type StaffingItem = {
  role: string
  owner: string
  responsibilities: string[]
}

type ReferenceCase = {
  name: string
  summary: string
  highlights: string[]
}

type ExecutionResponse = {
  project_period: string
  execution_modules: string[]
  sop: string[]
  resources: string[]
  timeline: TimelineStage[]
  budget_total: string
  budget_warning: string
  budget_items: BudgetItem[]
  budget_optimization: string[]
  staffing_plan: StaffingItem[]
  safety_plan: string[]
  risks: RiskItem[]
  backup_plans: string[]
  reference_cases: ReferenceCase[]
  key_notes: string[]
}

type PlanningResponse = {
  request: PlanningRequest
  insight: InsightResponse
  strategy: StrategyResponse
  execution: ExecutionResponse
}

type StepKey = 'insight' | 'strategy' | 'execution'
type StepStatus = 'waiting' | 'loading' | 'done'

type StepItem = {
  key: StepKey
  title: string
  description: string
  status: StepStatus
}

const API_BASE = 'http://127.0.0.1:8000'

const iconMap = {
  FileText,
  Lightbulb,
  TrendingUp,
  Users,
  Settings,
  Megaphone,
  Rocket,
  Flag,
}

const audienceOptions = [
  '企业员工与管理层',
  '合作客户与渠道伙伴',
  '消费者 / 品牌用户',
  '高校学生 / 青年群体',
  '媒体 / KOL / 行业嘉宾',
]

const budgetOptions = [
  '10万以内',
  '10万 - 30万',
  '30万 - 50万',
  '50万 - 80万',
  '80万以上',
]

const toneOptions = [
  '科技感 / 未来感',
  '轻奢质感 / 高级感',
  '年轻活力 / 社交传播',
  '国潮文化 / 东方美学',
  '专业商务 / 品牌发布',
]

const defaultForm: PlanningRequest = {
  context: '',
  objectives: '',
  audience: '',
  participant_count: '',
  budget: '',
  tone: '',
  reference_notes: '',
}

const stepTemplate: StepItem[] = [
  { key: 'insight', title: '步骤 1', description: '活动洞察与目标拆解', status: 'waiting' },
  { key: 'strategy', title: '步骤 2', description: '创意玩法与传播设计', status: 'waiting' },
  { key: 'execution', title: '步骤 3', description: '执行排期与预算落地', status: 'waiting' },
]

function App() {
  const [form, setForm] = useState(defaultForm)
  const [plan, setPlan] = useState<PlanningResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [streamStep, setStreamStep] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [steps, setSteps] = useState(stepTemplate)

  const budgetData = useMemo(() => plan?.execution.budget_items ?? [], [plan])
  const referenceCases = useMemo(() => plan?.execution.reference_cases ?? [], [plan])

  const updateField = (key: keyof PlanningRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateSteps = (currentStep: StepKey) => {
    let isReached = false
    setSteps(
      stepTemplate.map((step) => {
        if (step.key === currentStep) {
          isReached = true
          return { ...step, status: 'loading' }
        }

        if (!isReached) {
          return { ...step, status: 'done' }
        }

        return { ...step, status: 'waiting' }
      }),
    )
  }

  const completeSteps = () => {
    setSteps(stepTemplate.map((step) => ({ ...step, status: 'done' })))
  }

  const resetSteps = () => {
    setSteps(stepTemplate)
  }

  const validateForm = () => {
    if (form.context.trim().length < 10) {
      return '请先填写至少 10 个字的活动背景'
    }

    if (form.objectives.trim().length < 5) {
      return '请先填写至少 5 个字的活动目的'
    }

    if (!form.audience.trim()) {
      return '请填写参与人群'
    }

    return ''
  }

  const handleGenerate = async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setErrorMessage(validationMessage)
      setStreamStep('')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setPlan(null)
    resetSteps()
    updateSteps('insight')
    setStreamStep('步骤 1/3：正在分析活动背景与目标...')

    try {
      const response = await fetch(`${API_BASE}/api/plan/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        let message = '生成失败，请检查输入内容后重试'

        try {
          const errorData = await response.json()
          const firstIssue = Array.isArray(errorData.detail) ? errorData.detail[0] : null
          if (typeof errorData.detail === 'string') {
            message = `生成失败：${errorData.detail}`
          } else if (firstIssue?.msg) {
            message = `生成失败：${firstIssue.msg}`
          }
        } catch {
          // ignore parse errors
        }

        throw new Error(message)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('生成失败：未收到流式返回内容')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      const partialPlan: Partial<PlanningResponse> = { request: form }

      const updatePartialPlan = () => {
        if (partialPlan.insight && partialPlan.strategy && partialPlan.execution) {
          setPlan(partialPlan as PlanningResponse)
        }
      }

      const processEventBlock = (eventBlock: string) => {
        const lines = eventBlock.split('\n').filter(Boolean)
        const eventLine = lines.find((line) => line.startsWith('event:'))
        const dataLines = lines.filter((line) => line.startsWith('data:'))
        const eventName = eventLine ? eventLine.slice(6).trim() : 'message'
        const dataText = dataLines.map((line) => line.slice(5).trim()).join('\n')

        if (!dataText) {
          return
        }

        const payload = JSON.parse(dataText)

        if (eventName === 'error') {
          throw new Error(payload.message || '生成失败，请稍后重试')
        }

        if (eventName === 'done') {
          setPlan(payload as PlanningResponse)
          completeSteps()
          setStreamStep('三步生成完成')
          return
        }

        const step = payload.step as StepKey
        if (step === 'insight') {
          partialPlan.insight = payload.content as InsightResponse
          updateSteps('strategy')
          setStreamStep('步骤 1/3 已完成：正在生成创意玩法与传播方案...')
        }
        if (step === 'strategy') {
          partialPlan.strategy = payload.content as StrategyResponse
          updateSteps('execution')
          setStreamStep('步骤 2/3 已完成：正在生成执行流程与预算...')
        }
        if (step === 'execution') {
          partialPlan.execution = payload.content as ExecutionResponse
          updatePartialPlan()
          completeSteps()
          setStreamStep('步骤 3/3 已完成：正在汇总完整方案...')
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventBlock of events) {
          processEventBlock(eventBlock)
        }

        if (done) {
          break
        }
      }

      if (buffer.trim()) {
        processEventBlock(buffer)
      }
    } catch (error) {
      setStreamStep('')
      resetSteps()
      setErrorMessage(error instanceof Error ? error.message : '后端连接失败，请稍后重试')
    } finally {
      setLoading(false)
      setTimeout(() => setStreamStep(''), 3200)
    }
  }

  const handleExportPdf = () => {
    window.print()
  }

  const handleExportWord = async () => {
    if (!plan) {
      return
    }

    const document = buildWordDocument(plan)
    const blob = await Packer.toBlob(document)
    saveAs(blob, `${sanitizeFileName(plan.strategy.theme || plan.strategy.slogan || '活动策划方案')}.docx`)
  }

  return (
    <div className="page-shell">
      <div className="backdrop backdrop-left" />
      <div className="backdrop backdrop-right" />

      <header className="hero-card">
        <div>
          <div className="brand-row">
            <span className="brand-mark">EventMaster AI</span>
            <span className="brand-subtitle">智能策划工作台</span>
          </div>
          <h1>商业活动策划方案</h1>
          <p>基于真实商业活动打法，输出可直接汇报、执行、控预算、做复盘的完整活动方案。</p>
        </div>
        <div className="hero-badge">
          <Sparkles size={18} />
          真实案例驱动生成
        </div>
      </header>

      <main className="page-content">
        <section className="panel form-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">第一步</span>
              <h2>填写活动需求</h2>
            </div>
            <span className="helper">请填写核心背景与活动目标，其余信息可按需补充，系统会生成完整落地方案</span>
          </div>

          <div className="field-grid">
            <label className="field field-large">
              <span>1. 活动背景</span>
              <textarea
                value={form.context}
                onChange={(event) => updateField('context', event.target.value)}
                placeholder="请描述活动背景、品牌现状、项目阶段和当前面临的问题"
              />
            </label>

            <label className="field field-large">
              <span>2. 活动目的</span>
              <textarea
                value={form.objectives}
                onChange={(event) => updateField('objectives', event.target.value)}
                placeholder="请描述希望达成的业务目标、传播目标、拉新目标或销售目标"
              />
            </label>

            <label className="field">
              <span>3. 参与人群</span>
              <input
                list="audience-options"
                value={form.audience}
                onChange={(event) => updateField('audience', event.target.value)}
                placeholder="可自由输入，也可选择参考人群"
              />
              <datalist id="audience-options">
                {audienceOptions.map((option) => (
                  <option value={option} key={option} />
                ))}
              </datalist>
            </label>

            <label className="field">
              <span>4. 参与人数（选填）</span>
              <input
                value={form.participant_count}
                onChange={(event) => updateField('participant_count', event.target.value)}
                placeholder="例如：200人、500-800人、1000+"
              />
            </label>

            <label className="field">
              <span>5. 总预算（选填）</span>
              <input
                list="budget-options"
                value={form.budget}
                onChange={(event) => updateField('budget', event.target.value)}
                placeholder="可自由输入，也可选择参考预算范围"
              />
              <datalist id="budget-options">
                {budgetOptions.map((option) => (
                  <option value={option} key={option} />
                ))}
              </datalist>
            </label>

            <label className="field">
              <span>6. 内容方向（选填）</span>
              <input
                list="tone-options"
                value={form.tone}
                onChange={(event) => updateField('tone', event.target.value)}
                placeholder="可自由输入，也可选择参考内容方向"
              />
              <datalist id="tone-options">
                {toneOptions.map((option) => (
                  <option value={option} key={option} />
                ))}
              </datalist>
            </label>

            <label className="field field-large">
              <span>7. 额外特殊要求</span>
              <textarea
                value={form.reference_notes}
                onChange={(event) => updateField('reference_notes', event.target.value)}
                placeholder="可补充线上线下联动、特殊嘉宾、场地限制、品牌调性、必须保留的环节、需要参考的玩法等"
              />
            </label>
          </div>

          <div className="action-row">
            <button className="primary-button" onClick={handleGenerate} disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
              生成完整策划案
            </button>
            {streamStep ? <span className="stream-tip">{streamStep}</span> : null}
          </div>

          <div className="progress-card">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${(steps.filter((step) => step.status === 'done').length / steps.length) * 100}%` }}
              />
            </div>
            <div className="progress-steps">
              {steps.map((step) => (
                <div className={`progress-step is-${step.status}`} key={step.key}>
                  <div className="progress-icon">
                    {step.status === 'done' ? (
                      <CheckCircle2 size={18} />
                    ) : step.status === 'loading' ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </div>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errorMessage ? (
            <div className="warning-banner">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </section>

        {plan ? (
          <section className="panel preview-panel">
            <div className="preview-header">
              <div>
                <span className="eyebrow">第二步</span>
                <h2>{plan.strategy.slogan}</h2>
              </div>
              <div className="tag-row">
                {plan.strategy.tags.map((tag) => (
                  <span className="tag-chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="summary-grid">
              <InfoCard title="活动基础概述" icon={<ClipboardList size={18} />}>
                <p>{plan.insight.activity_overview || plan.insight.summary}</p>
              </InfoCard>
              <InfoCard title="整体创意主题" icon={<Sparkles size={18} />}>
                <p>{plan.strategy.theme}</p>
              </InfoCard>
            </div>

            <div className="section-block insight-block">
              <div className="section-title">一、前期洞察与目标拆解</div>
              <div className="insight-layout">
                <div className="quote-card">
                  <p>{plan.request.context}</p>
                  <small>{plan.request.objectives}</small>
                </div>
                <div className="insight-card">
                  <h3>{plan.insight.title}</h3>
                  <p>{plan.insight.summary}</p>
                </div>
              </div>
              <div className="bullet-columns">
                <BulletGroup title="活动核心目标" items={plan.insight.core_goals} />
                <BulletGroup title="参与人群分析" items={plan.insight.audience_analysis} />
                <BulletGroup title="市场环境分析" items={plan.insight.market_analysis} />
                <BulletGroup title="目标受众画像" items={plan.insight.audience_personas} />
                <BulletGroup title="核心痛点" items={plan.insight.pain_points} />
                <BulletGroup title="机会判断" items={plan.insight.opportunities} />
              </div>
            </div>

            <div className="section-block">
              <div className="section-title">二、创意亮点与宣传推广方案</div>
              <div className="strategy-hero">
                <h3>{plan.strategy.slogan}</h3>
                <p>{plan.strategy.theme}</p>
              </div>
              <div className="summary-grid top-gap">
                <InfoCard title="活动主题候选" icon={<Lightbulb size={18} />}>
                  <ol className="theme-option-list">
                    {plan.strategy.theme_options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ol>
                </InfoCard>
                <BulletGroup title="宣传推广方案" items={plan.strategy.promotion_plan} />
              </div>
              <div className="bullet-columns single-top-gap">
                <BulletGroup title="整体创意亮点" items={plan.strategy.creative_highlights} />
              </div>
              <div className="creative-grid top-gap">
                {plan.strategy.creative_matrix.map((card) => {
                  const Icon = iconMap[card.icon as keyof typeof iconMap] ?? FileText
                  return (
                    <article key={card.title} className={`creative-card accent-${card.accent}`}>
                      <div className="creative-icon">
                        <Icon size={22} />
                      </div>
                      <div>
                        <h4>{card.title}</h4>
                        <p>{card.description}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="section-block">
              <div className="section-title">三、详细执行流程与时间安排</div>
              <div className="timeline-head">
                <div>
                  <h3>执行时间轴</h3>
                  <p>项目周期：{plan.execution.project_period}</p>
                </div>
                <span>{plan.execution.timeline.length} 个阶段</span>
              </div>
              <div className="bullet-columns single-top-gap">
                <BulletGroup title="现场 / 线上执行模块" items={plan.execution.execution_modules} />
                <BulletGroup title="关键注意事项" items={plan.execution.key_notes} />
              </div>
              <div className="timeline-track top-gap">
                {plan.execution.timeline.map((stage, index) => {
                  const Icon = iconMap[stage.icon as keyof typeof iconMap] ?? Settings
                  return (
                    <div className={`timeline-card accent-${stage.accent}`} key={stage.id}>
                      <div className="timeline-index">{index + 1}</div>
                      <div className="creative-icon compact">
                        <Icon size={18} />
                      </div>
                      <h4>{stage.name}</h4>
                      <p className="timeline-range">{stage.range}</p>
                      <ul>
                        {stage.tasks.map((task) => (
                          <li key={task}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>

              <div className="execution-columns">
                <div className="list-card">
                  <h4>完整执行 SOP</h4>
                  <ol>
                    {plan.execution.sop.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
                <div className="list-card">
                  <h4>资源配置清单</h4>
                  <ul>
                    {plan.execution.resources.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-title">四、预算明细拆分与优化建议</div>
              <div className="budget-head">
                <h3>预算分配</h3>
                <span>{plan.execution.budget_total}</span>
              </div>

              {plan.execution.budget_warning ? (
                <div className="warning-banner">
                  <AlertTriangle size={18} />
                  <span>{plan.execution.budget_warning}</span>
                </div>
              ) : null}

              <div className="budget-grid top-gap budget-grid-optimized">
                <div className="chart-card budget-chart-card">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={budgetData}
                        dataKey="ratio"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={104}
                        paddingAngle={3}
                      >
                        {budgetData.map((entry) => (
                          <Cell key={entry.name} fill={colorMap[entry.accent] ?? '#8b5cf6'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="budget-list detail-list budget-detail-grid">
                  {budgetData.map((item) => (
                    <div className="budget-item budget-item-detail" key={item.name}>
                      <div className="budget-name-row">
                        <span className="dot" style={{ backgroundColor: colorMap[item.accent] }} />
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.amount}</small>
                        </div>
                      </div>
                      <span className="budget-ratio">{item.ratio}%</span>
                      <p>用途：{item.purpose}</p>
                      <p>市场价参考：{item.market_reference}</p>
                      <p>省钱建议：{item.saving_tip}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="top-gap">
                <BulletGroup title="预算优化建议" items={plan.execution.budget_optimization} />
              </div>
            </div>

            <div className="section-block">
              <div className="section-title">五、人员分工、安全预案与备选方案</div>
              <div className="execution-columns">
                <div className="list-card">
                  <h4>人员分工安排</h4>
                  <div className="stack-list">
                    {plan.execution.staffing_plan.map((item) => (
                      <div className="stack-item" key={`${item.role}-${item.owner}`}>
                        <strong>{item.role}</strong>
                        <small>{item.owner}</small>
                        <ul>
                          {item.responsibilities.map((responsibility) => (
                            <li key={responsibility}>{responsibility}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="list-card">
                  <h4>安全 & 风险应急预案</h4>
                  <div className="stack-list">
                    <div className="stack-item">
                      <strong>安全执行清单</strong>
                      <ul>
                        {plan.execution.safety_plan.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {plan.execution.risks.map((risk) => (
                      <div className="stack-item" key={risk.title}>
                        <strong>{risk.title}</strong>
                        <small>{risk.level}</small>
                        <p>应对：{risk.response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bullet-columns top-gap">
                <BulletGroup title="备用备选方案" items={plan.execution.backup_plans} />
                <BulletGroup title="执行关键注意事项" items={plan.execution.key_notes} />
              </div>
            </div>

            <div className="section-block">
              <div className="section-title">六、同类型参考案例</div>
              <div className="case-grid">
                {referenceCases.map((item) => (
                  <div className="list-card" key={item.name}>
                    <h4>{item.name}</h4>
                    <p>{item.summary}</p>
                    <ul>
                      {item.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="footer-actions">
              <button className="secondary-button" onClick={handleExportWord}>
                导出 Word
              </button>
              <button className="ghost-button" onClick={handleExportPdf}>
                导出 PDF
              </button>
              <button className="ghost-button" onClick={handleGenerate}>
                重新生成策划案
              </button>
            </div>
          </section>
        ) : (
          <section className="panel empty-panel">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Sparkles size={24} />
              </div>
              <h2>方案将在提交后生成</h2>
              <p>系统会结合真实商业活动打法，依次生成洞察、创意、执行、预算、人员、安全预案与参考案例。</p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function BulletGroup({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null
  }

  return (
    <div className="bullet-group">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="info-card">
      <div className="info-card-head">
        <span>{icon}</span>
        <strong>{title}</strong>
      </div>
      <div>{children}</div>
    </div>
  )
}

function createBodyParagraph(text: string) {
  return new Paragraph({
    style: 'DocBody',
    children: [new TextRun(text)],
  })
}

function createBulletParagraph(text: string) {
  return new Paragraph({
    style: 'DocBody',
    bullet: { level: 0 },
    children: [new TextRun(text)],
  })
}

function createNumberParagraph(index: number, text: string) {
  return new Paragraph({
    style: 'DocBody',
    children: [new TextRun(`${index}. ${text}`)],
  })
}

function createSectionHeading(text: string) {
  return new Paragraph({
    text,
    style: 'SectionHeading',
  })
}

function createSubHeading(text: string) {
  return new Paragraph({
    text,
    style: 'SubHeading',
  })
}

function createMinorHeading(text: string) {
  return new Paragraph({
    text,
    style: 'MinorHeading',
  })
}

function createLabeledParagraph(label: string, value: string) {
  return new Paragraph({
    style: 'DocBody',
    children: [
      new TextRun({ text: `${label}：`, bold: true }),
      new TextRun(value),
    ],
  })
}

function pushBulletSection(children: Paragraph[], title: string, items: string[]) {
  if (!items.length) {
    return
  }

  children.push(createSubHeading(title))
  items.forEach((item) => children.push(createBulletParagraph(item)))
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim() || '活动策划方案'
}

function buildWordDocument(plan: PlanningResponse) {
  const children: Paragraph[] = [
    new Paragraph({
      text: '活动策划方案',
      style: 'DocTitle',
    }),
    new Paragraph({
      text: plan.strategy.theme || plan.strategy.slogan || '标准办公导出版',
      style: 'DocSubtitle',
    }),
    createLabeledParagraph('活动背景', plan.request.context),
    createLabeledParagraph('活动目的', plan.request.objectives),
    createLabeledParagraph('参与人群', plan.request.audience),
  ]

  if (plan.request.participant_count) {
    children.push(createLabeledParagraph('参与人数', plan.request.participant_count))
  }
  if (plan.request.budget) {
    children.push(createLabeledParagraph('总预算', plan.request.budget))
  }
  if (plan.request.tone) {
    children.push(createLabeledParagraph('内容方向', plan.request.tone))
  }
  if (plan.request.reference_notes) {
    children.push(createLabeledParagraph('额外要求', plan.request.reference_notes))
  }

  children.push(createSectionHeading('一、前期洞察与目标拆解'))
  children.push(createSubHeading('1. 活动基础概述'))
  children.push(createBodyParagraph(plan.insight.activity_overview || plan.insight.summary))
  pushBulletSection(children, '2. 活动核心目标', plan.insight.core_goals)
  pushBulletSection(children, '3. 参与人群分析', plan.insight.audience_analysis)
  pushBulletSection(children, '4. 市场环境分析', plan.insight.market_analysis)
  pushBulletSection(children, '5. 目标受众画像', plan.insight.audience_personas)
  pushBulletSection(children, '6. 核心痛点', plan.insight.pain_points)
  pushBulletSection(children, '7. 机会判断', plan.insight.opportunities)

  children.push(createSectionHeading('二、创意亮点与宣传推广方案'))
  children.push(createSubHeading('1. 主推主题'))
  children.push(createBodyParagraph(plan.strategy.theme))
  children.push(createSubHeading('2. 活动主题候选'))
  plan.strategy.theme_options.forEach((item, index) => children.push(createNumberParagraph(index + 1, item)))
  pushBulletSection(children, '3. 整体创意亮点', plan.strategy.creative_highlights)
  pushBulletSection(children, '4. 宣传推广方案', plan.strategy.promotion_plan)
  if (plan.strategy.creative_matrix.length) {
    children.push(createSubHeading('5. 核心创意模块'))
    plan.strategy.creative_matrix.forEach((card, index) => {
      children.push(createMinorHeading(`${index + 1}. ${card.title}`))
      children.push(createBodyParagraph(card.description))
    })
  }

  children.push(createSectionHeading('三、详细执行流程与时间安排'))
  children.push(createSubHeading('1. 项目周期'))
  children.push(createBodyParagraph(plan.execution.project_period || '待补充'))
  pushBulletSection(children, '2. 现场 / 线上执行模块', plan.execution.execution_modules)
  if (plan.execution.timeline.length) {
    children.push(createSubHeading('3. 执行时间轴'))
    plan.execution.timeline.forEach((stage, index) => {
      children.push(createMinorHeading(`${index + 1}. ${stage.name}（${stage.range}）`))
      stage.tasks.forEach((task) => children.push(createBulletParagraph(task)))
    })
  }
  if (plan.execution.sop.length) {
    children.push(createSubHeading('4. 完整执行 SOP'))
    plan.execution.sop.forEach((item, index) => children.push(createNumberParagraph(index + 1, item)))
  }
  pushBulletSection(children, '5. 资源配置清单', plan.execution.resources)
  pushBulletSection(children, '6. 关键注意事项', plan.execution.key_notes)

  children.push(createSectionHeading('四、预算明细拆分与优化建议'))
  children.push(createSubHeading('1. 预算总览'))
  children.push(createBodyParagraph(plan.execution.budget_total || plan.request.budget || '待确认'))
  if (plan.execution.budget_warning) {
    children.push(createBodyParagraph(`预算提示：${plan.execution.budget_warning}`))
  }
  if (plan.execution.budget_items.length) {
    children.push(createSubHeading('2. 预算明细'))
    plan.execution.budget_items.forEach((item, index) => {
      children.push(createMinorHeading(`${index + 1}. ${item.name}｜${item.amount}｜${item.ratio}%`))
      if (item.purpose) {
        children.push(createBodyParagraph(`用途：${item.purpose}`))
      }
      if (item.market_reference) {
        children.push(createBodyParagraph(`市场价参考：${item.market_reference}`))
      }
      if (item.saving_tip) {
        children.push(createBodyParagraph(`省钱建议：${item.saving_tip}`))
      }
    })
  }
  pushBulletSection(children, '3. 预算优化建议', plan.execution.budget_optimization)

  children.push(createSectionHeading('五、人员分工、安全预案与备选方案'))
  if (plan.execution.staffing_plan.length) {
    children.push(createSubHeading('1. 人员分工安排'))
    plan.execution.staffing_plan.forEach((item, index) => {
      children.push(createMinorHeading(`${index + 1}. ${item.role}（${item.owner}）`))
      item.responsibilities.forEach((responsibility) => children.push(createBulletParagraph(responsibility)))
    })
  }
  pushBulletSection(children, '2. 安全执行清单', plan.execution.safety_plan)
  if (plan.execution.risks.length) {
    children.push(createSubHeading('3. 风险应急预案'))
    plan.execution.risks.forEach((risk, index) => {
      children.push(createMinorHeading(`${index + 1}. ${risk.title}｜${risk.level}`))
      children.push(createBodyParagraph(`应对方案：${risk.response}`))
    })
  }
  pushBulletSection(children, '4. 备用备选方案', plan.execution.backup_plans)

  if (plan.execution.reference_cases.length) {
    children.push(createSectionHeading('六、同类型参考案例'))
    plan.execution.reference_cases.forEach((item, index) => {
      children.push(createSubHeading(`${index + 1}. ${item.name}`))
      children.push(createBodyParagraph(item.summary))
      item.highlights.forEach((highlight) => children.push(createBulletParagraph(highlight)))
    })
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 22,
            color: '222222',
          },
          paragraph: {
            spacing: {
              line: 420,
              after: 120,
            },
          },
        },
      },
      paragraphStyles: [
        {
          id: 'DocTitle',
          name: 'DocTitle',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Microsoft YaHei',
            size: 36,
            bold: true,
            color: '111111',
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 120,
              after: 180,
            },
          },
        },
        {
          id: 'DocSubtitle',
          name: 'DocSubtitle',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Microsoft YaHei',
            size: 24,
            color: '444444',
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 260,
            },
          },
        },
        {
          id: 'SectionHeading',
          name: 'SectionHeading',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Microsoft YaHei',
            size: 28,
            bold: true,
            color: '1F1F1F',
          },
          paragraph: {
            spacing: {
              before: 280,
              after: 160,
            },
          },
        },
        {
          id: 'SubHeading',
          name: 'SubHeading',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Microsoft YaHei',
            size: 24,
            bold: true,
            color: '2C2C2C',
          },
          paragraph: {
            spacing: {
              before: 180,
              after: 120,
            },
          },
        },
        {
          id: 'MinorHeading',
          name: 'MinorHeading',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Microsoft YaHei',
            size: 22,
            bold: true,
            color: '333333',
          },
          paragraph: {
            spacing: {
              before: 120,
              after: 80,
            },
          },
        },
        {
          id: 'DocBody',
          name: 'DocBody',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Microsoft YaHei',
            size: 22,
            color: '333333',
          },
          paragraph: {
            spacing: {
              after: 120,
              line: 420,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  })
}

const colorMap: Record<string, string> = {
  purple: '#9b6cff',
  blue: '#5ea7ff',
  pink: '#ff63b0',
  green: '#57d8a0',
  amber: '#ffb84d',
  rose: '#ff7f7f',
}

export default App
