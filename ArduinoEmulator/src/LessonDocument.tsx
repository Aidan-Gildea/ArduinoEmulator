import { useState, type ReactNode } from 'react'
import { LessonDiagram } from './LessonDiagrams'
import type { Block, QuizQuestion } from './lessonDoc'

// Renders a lesson document (parsed by lessonDoc.ts): its text blocks, and the quiz at the end.

// `code`, **bold**, *italic* and [links](url)
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>
        if (part.startsWith('**') && part.endsWith('**') && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
        const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
        if (link) {
          return (
            <a key={i} href={link[2]} target="_blank" rel="noreferrer">
              {link[1]}
            </a>
          )
        }
        return part
      })}
    </>
  )
}

// A light syntax colouring for C++ and AVR assembly: comments, strings, numbers, keywords.
const CPP_KEYWORDS =
  /^(void|int|unsigned|long|byte|bool|char|float|const|volatile|if|else|for|while|return|true|false|uint8_t|uint16_t)$/
const CPP_BUILTINS =
  /^(pinMode|digitalWrite|digitalRead|delay|millis|interrupts|noInterrupts|ISR|HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP|DDR[BCD]|PORT[BCD]|PIN[BCD]|TIMER0_OVF_vect|setup|loop|main|init)$/
const TOKEN = {
  cpp: /(\/\/.*$|"[^"]*"|\b0x[0-9a-fA-F]+\b|\b\d+\b|\b[A-Za-z_]\w*\b)/gm,
  asm: /(;.*$|\b0x[0-9a-fA-F]+\b|\b\d+\b|\b[rR]\d{1,2}\b|^\s*[a-z]+(?=\s)|^\w+:)/gm,
}

function highlight(code: string, lang: string): ReactNode {
  const pattern = lang === 'cpp' ? TOKEN.cpp : lang === 'asm' ? TOKEN.asm : null
  if (!pattern) return code
  const out: ReactNode[] = []
  let last = 0
  for (const match of code.matchAll(pattern)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > last) out.push(code.slice(last, start))
    let cls = ''
    if (token.startsWith('//') || token.startsWith(';')) cls = 'tok-comment'
    else if (token.startsWith('"')) cls = 'tok-string'
    else if (/^(0x|\d)/.test(token)) cls = 'tok-number'
    else if (lang === 'cpp') cls = CPP_KEYWORDS.test(token) ? 'tok-keyword' : CPP_BUILTINS.test(token) ? 'tok-builtin' : ''
    else cls = token.endsWith(':') ? 'tok-label' : /^[rR]\d/.test(token) ? 'tok-builtin' : 'tok-keyword'
    out.push(cls ? <span key={start} className={cls}>{token}</span> : token)
    last = start + token.length
  }
  out.push(code.slice(last))
  return out
}

const LANG_LABEL: Record<string, string> = { cpp: 'C++', asm: 'AVR assembly', text: '' }

function CodeBlock({ block, onTryCode }: { block: Extract<Block, { kind: 'code' }>; onTryCode?: (code: string) => void }) {
  const label = LANG_LABEL[block.lang] ?? block.lang
  return (
    <div className={`doc-code${label || block.tryIt ? ' has-head' : ''}`}>
      {(label || block.tryIt) && (
        <div className="doc-code-head">
          <span>{label}</span>
          {block.tryIt && onTryCode && (
            <button type="button" className="doc-try" onClick={() => onTryCode(`${block.code}\n`)}>
              Open in editor
            </button>
          )}
        </div>
      )}
      <pre>
        <code>{highlight(block.code, block.lang)}</code>
      </pre>
    </div>
  )
}

const CALLOUT_LABEL = { note: 'Note', tip: 'Tip', warning: 'Watch out' }

export function LessonBody({ blocks, onTryCode }: { blocks: Block[]; onTryCode?: (code: string) => void }) {
  return (
    <div className="doc-body">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading':
            return block.level === 2 ? (
              <h2 key={i}>
                <Inline text={block.text} />
              </h2>
            ) : (
              <h3 key={i}>
                <Inline text={block.text} />
              </h3>
            )
          case 'paragraph':
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            )
          case 'list': {
            const items = block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))
            return block.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>
          }
          case 'code':
            return <CodeBlock key={i} block={block} onTryCode={onTryCode} />
          case 'callout':
            return (
              <aside key={i} className={`doc-callout ${block.tone}`}>
                <div className="doc-callout-label">{CALLOUT_LABEL[block.tone]}</div>
                {block.paragraphs.map((p, j) => (
                  <p key={j}>
                    <Inline text={p} />
                  </p>
                ))}
              </aside>
            )
          case 'table':
            return (
              <div key={i} className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      {block.head.map((cell, j) => (
                        <th key={j}>
                          <Inline text={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, j) => (
                          <td key={j}>
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'diagram':
            return <LessonDiagram key={i} name={block.name} />
        }
        return null
      })}
    </div>
  )
}

type Answer = { choice: number | null; result: 'correct' | 'wrong' | null }

function QuizCard({
  question,
  number,
  answer,
  onChange,
}: {
  question: QuizQuestion
  number: number
  answer: Answer
  onChange: (answer: Answer) => void
}) {
  const solved = answer.result === 'correct'
  const check = () => {
    if (answer.choice == null) return
    onChange({ ...answer, result: question.choices[answer.choice].correct ? 'correct' : 'wrong' })
  }
  return (
    <div className={`quiz-card${solved ? ' solved' : ''}`}>
      <div className="quiz-prompt">
        <span className="quiz-number">{number}</span>
        <Inline text={question.prompt} />
      </div>
      <div className="quiz-choices" role="radiogroup">
        {question.choices.map((choice, i) => {
          const picked = answer.choice === i
          const state = picked && answer.result ? ` ${answer.result}` : ''
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={solved}
              className={`quiz-choice${picked ? ' picked' : ''}${state}`}
              onClick={() => onChange({ choice: i, result: null })}
            >
              <span className="quiz-radio" />
              <Inline text={choice.text} />
            </button>
          )
        })}
      </div>
      <div className="quiz-foot">
        {answer.result === 'correct' && (
          <p className="quiz-feedback correct">
            <strong>Correct.</strong> <Inline text={question.explanation} />
          </p>
        )}
        {answer.result === 'wrong' && (
          <p className="quiz-feedback wrong">
            <strong>Not quite.</strong> Have another look and try a different answer.
          </p>
        )}
        {!solved && (
          <button type="button" className="quiz-check" disabled={answer.choice == null || answer.result === 'wrong'} onClick={check}>
            Check
          </button>
        )}
      </div>
    </div>
  )
}

/** "Check your understanding": calls onComplete once every question has been answered correctly. */
export function Quiz({ questions, onComplete }: { questions: QuizQuestion[]; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(() => ({ choice: null, result: null })))
  const solved = answers.filter((a) => a.result === 'correct').length

  const update = (index: number, answer: Answer) => {
    const next = answers.map((a, i) => (i === index ? answer : a))
    setAnswers(next)
    if (answer.result === 'correct' && next.every((a) => a.result === 'correct')) onComplete()
  }

  return (
    <section className="quiz">
      <div className="quiz-head">
        <h2>Check your understanding</h2>
        <span className="quiz-progress">
          {solved} of {questions.length} correct
        </span>
      </div>
      {questions.map((q, i) => (
        <QuizCard key={i} question={q} number={i + 1} answer={answers[i]} onChange={(a) => update(i, a)} />
      ))}
    </section>
  )
}
