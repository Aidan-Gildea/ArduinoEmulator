// Lesson documents: each lesson's text and quiz is a Markdown file in src/lesson-docs/<lesson id>.md.
//
// The supported Markdown is a small subset:
//   ## Heading, ### Subheading
//   Paragraphs separated by blank lines, with `code`, **bold**, *italic* and [links](https://…)
//   - bullet and 1. numbered lists (one level)
//   ```cpp fenced code. Writing ```cpp try adds a button that opens the code in the editor.
//   > [!NOTE], > [!TIP] or > [!WARNING] on the first line of a quote makes a callout
//   | tables | with a |---| line under the header
//   ::diagram name   draws one of the diagrams in LessonDiagrams.tsx
//   ```quiz holds the "Check your understanding" questions, separated by blank lines:
//       Q: The question
//       - [ ] A wrong answer
//       - [x] The right answer
//       = An explanation shown once the question is answered

export type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; lang: string; code: string; tryIt: boolean }
  | { kind: 'callout'; tone: 'note' | 'tip' | 'warning'; paragraphs: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'diagram'; name: string }

export interface QuizQuestion {
  prompt: string
  choices: { text: string; correct: boolean }[]
  explanation: string
}

export interface LessonDoc {
  blocks: Block[]
  quiz: QuizQuestion[]
}

const SOURCES = import.meta.glob('./lesson-docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const parsed = new Map<string, LessonDoc>()

export function lessonDoc(id: string): LessonDoc | null {
  const source = SOURCES[`./lesson-docs/${id}.md`]
  if (source === undefined) return null
  let doc = parsed.get(id)
  if (!doc) {
    doc = parseLessonDoc(source)
    parsed.set(id, doc)
  }
  return doc
}

// Cells are split on | except an escaped \| (so `a \|\| b` can appear in a table).
const tableCells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'))

function parseQuiz(lines: string[]): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  for (const line of lines) {
    const text = line.trim()
    if (text.startsWith('Q:')) {
      questions.push({ prompt: text.slice(2).trim(), choices: [], explanation: '' })
      continue
    }
    const question = questions[questions.length - 1]
    if (!question || !text) continue
    const choice = text.match(/^- \[( |x)\] (.*)$/)
    if (choice) question.choices.push({ text: choice[2], correct: choice[1] === 'x' })
    else if (text.startsWith('=')) question.explanation = `${question.explanation} ${text.slice(1).trim()}`.trim()
  }
  return questions
}

export function parseLessonDoc(source: string): LessonDoc {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let quiz: QuizQuestion[] = []
  let i = 0

  // Lines that start a block of their own, so a paragraph stops before them.
  const startsBlock = (line: string) => /^(#{2,3} |```|> |\||::diagram |- |\d+\. )/.test(line)

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    const heading = line.match(/^(#{2,3}) (.*)$/)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length as 2 | 3, text: heading[2].trim() })
      i++
      continue
    }

    if (line.startsWith('```')) {
      const [lang = '', flag] = line.slice(3).trim().split(/\s+/)
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      if (lang === 'quiz') quiz = parseQuiz(body)
      else blocks.push({ kind: 'code', lang, code: body.join('\n'), tryIt: flag === 'try' })
      continue
    }

    if (line.startsWith('>')) {
      const body: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) body.push(lines[i++].replace(/^> ?/, ''))
      const tone = body[0]?.match(/^\[!(NOTE|TIP|WARNING)\]\s*$/)
      if (tone) body.shift()
      const paragraphs = body
        .join('\n')
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\n/g, ' ').trim())
        .filter(Boolean)
      blocks.push({ kind: 'callout', tone: (tone?.[1].toLowerCase() ?? 'note') as 'note' | 'tip' | 'warning', paragraphs })
      continue
    }

    if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s:|-]+\|?\s*$/.test(lines[i])) rows.push(tableCells(lines[i]))
        i++
      }
      blocks.push({ kind: 'table', head: rows[0] ?? [], rows: rows.slice(1) })
      continue
    }

    const diagram = line.match(/^::diagram (\S+)/)
    if (diagram) {
      blocks.push({ kind: 'diagram', name: diagram[1] })
      i++
      continue
    }

    const listItem = /^(- |\d+\. )/
    if (listItem.test(line)) {
      const ordered = /^\d/.test(line)
      const items: string[] = []
      while (i < lines.length && (listItem.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (listItem.test(lines[i])) items.push(lines[i].replace(listItem, '').trim())
        else items[items.length - 1] += ` ${lines[i].trim()}`
        i++
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    const text: string[] = []
    while (i < lines.length && lines[i].trim() && (!text.length || !startsBlock(lines[i]))) text.push(lines[i++].trim())
    blocks.push({ kind: 'paragraph', text: text.join(' ') })
  }

  return { blocks, quiz }
}
