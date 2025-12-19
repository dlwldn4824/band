import { useState } from 'react'
import './Game.css'

interface Quiz {
  question: string
  options: string[]
  correct: number
}

const quizzes: Quiz[] = [
  {
    question: '비틀즈의 대표곡은?',
    options: ['Yesterday', 'Bohemian Rhapsody', 'Stairway to Heaven', 'Hotel California'],
    correct: 0
  },
  {
    question: '기타의 줄 개수는?',
    options: ['4개', '5개', '6개', '7개'],
    correct: 2
  },
  {
    question: '드럼 세트의 기본 구성 요소가 아닌 것은?',
    options: ['스네어', '하이햇', '피아노', '심벌'],
    correct: 2
  },
  {
    question: '베이스 기타의 역할은?',
    options: ['멜로디', '리듬과 저음', '하모니', '퍼커션'],
    correct: 1
  },
  {
    question: '록 음악의 대표적인 장르가 아닌 것은?',
    options: ['하드 록', '팝 록', '재즈 록', '클래식 록'],
    correct: 2
  }
]

const QuizGame = () => {
  const [currentQuiz, setCurrentQuiz] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)

  const handleAnswer = (index: number) => {
    if (showResult) return
    setSelected(index)
    setShowResult(true)
    if (index === quizzes[currentQuiz].correct) {
      setScore(prev => prev + 1)
    }
  }

  const nextQuiz = () => {
    if (currentQuiz < quizzes.length - 1) {
      setCurrentQuiz(prev => prev + 1)
      setSelected(null)
      setShowResult(false)
    }
  }

  const resetGame = () => {
    setCurrentQuiz(0)
    setSelected(null)
    setScore(0)
    setShowResult(false)
  }

  const quiz = quizzes[currentQuiz]
  const isFinished = currentQuiz === quizzes.length - 1 && showResult

  return (
    <div className="game-container">
      <h2>🎵 음악 퀴즈</h2>
      
      <div className="quiz-progress">
        문제 {currentQuiz + 1} / {quizzes.length} | 점수: {score}점
      </div>

      <div className="game-area">
        <div className="quiz-question">{quiz.question}</div>
        
        <div className="quiz-options">
          {quiz.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className={`quiz-option ${
                showResult
                  ? index === quiz.correct
                    ? 'correct'
                    : selected === index
                    ? 'wrong'
                    : ''
                  : selected === index
                  ? 'selected'
                  : ''
              }`}
              disabled={showResult}
            >
              {option}
            </button>
          ))}
        </div>

        {showResult && (
          <div className={`quiz-result ${selected === quiz.correct ? 'correct' : 'wrong'}`}>
            {selected === quiz.correct ? '✅ 정답입니다!' : '❌ 틀렸습니다!'}
          </div>
        )}
      </div>

      <div className="game-controls">
        {isFinished ? (
          <div>
            <div className="final-score">
              최종 점수: {score} / {quizzes.length}
            </div>
            <button onClick={resetGame} className="game-button">
              다시 시작
            </button>
          </div>
        ) : showResult ? (
          <button onClick={nextQuiz} className="game-button">
            다음 문제
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default QuizGame

