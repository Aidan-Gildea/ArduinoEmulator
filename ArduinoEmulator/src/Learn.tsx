import { useState } from 'react'
import { COURSE, type Lesson } from './lessons'

// The Learn tab: the course outline beside the selected lesson and its video.

const ALL_LESSONS = COURSE.flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, unit: unit.title })))
const LESSON_NUMBER = new Map(ALL_LESSONS.map((l, i) => [l.id, i + 1]))
const STORAGE_KEY = 'eexpo.learn.lesson'

function rememberedLesson() {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    return ALL_LESSONS.find((l) => l.id === id)?.id ?? ALL_LESSONS[0].id
  } catch {
    return ALL_LESSONS[0].id
  }
}

// YouTube links are embedded; anything else is treated as a video file.
function youtubeEmbed(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

function LessonVideo({ lesson }: { lesson: Lesson }) {
  if (!lesson.video) {
    return (
      <div className="lesson-video placeholder">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5 L19 12 L8 19 Z" />
        </svg>
        <span>Video coming soon</span>
      </div>
    )
  }
  const embed = youtubeEmbed(lesson.video)
  return (
    <div className="lesson-video">
      {embed ? (
        <iframe src={embed} title={lesson.title} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <video src={lesson.video} controls />
      )}
    </div>
  )
}

export function Learn() {
  const [lessonId, setLessonId] = useState(rememberedLesson)
  const index = ALL_LESSONS.findIndex((l) => l.id === lessonId)
  const lesson = ALL_LESSONS[index]

  const open = (id: string) => {
    setLessonId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Not remembering the lesson is fine.
    }
  }

  return (
    <div className="learn">
      <nav className="learn-outline" aria-label="Course">
        <div className="learn-outline-title">Course</div>
        {COURSE.map((unit, u) => (
          <section key={unit.id} className="learn-unit">
            <div className="learn-unit-title">
              <span className="learn-unit-number">{u + 1}</span>
              {unit.title}
            </div>
            <ol>
              {unit.lessons.map((l) => (
                <li key={l.id}>
                  <button type="button" className={l.id === lessonId ? 'active' : ''} onClick={() => open(l.id)}>
                    <span className="learn-lesson-number">{LESSON_NUMBER.get(l.id)}</span>
                    <span className="learn-lesson-title">{l.title}</span>
                    {l.video && <span className="learn-has-video" title="Has a video" />}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </nav>

      <article className="learn-lesson">
        <div className="learn-lesson-inner">
          <div className="learn-breadcrumb">
            {lesson.unit} · Lesson {index + 1} of {ALL_LESSONS.length}
          </div>
          <h1>{lesson.title}</h1>
          <LessonVideo lesson={lesson} />
          <p className="learn-summary">{lesson.summary}</p>
          <div className="learn-nav">
            <button type="button" className="wb-btn" disabled={index === 0} onClick={() => open(ALL_LESSONS[index - 1].id)}>
              ← Previous
            </button>
            <button
              type="button"
              className="wb-btn primary"
              disabled={index === ALL_LESSONS.length - 1}
              onClick={() => open(ALL_LESSONS[index + 1].id)}
            >
              Next lesson →
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
