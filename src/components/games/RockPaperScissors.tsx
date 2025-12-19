import { useState } from 'react'
import './Game.css'

type Choice = 'rock' | 'paper' | 'scissors'

const RockPaperScissors = () => {
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null)
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null)
  const [result, setResult] = useState<string>('')
  const [score, setScore] = useState({ win: 0, lose: 0, draw: 0 })

  const choices: Choice[] = ['rock', 'paper', 'scissors']
  const emojiMap = { rock: '✊', paper: '✋', scissors: '✂️' }
  const nameMap = { rock: '바위', paper: '보', scissors: '가위' }

  const play = (player: Choice) => {
    const computer = choices[Math.floor(Math.random() * choices.length)]
    setPlayerChoice(player)
    setComputerChoice(computer)

    if (player === computer) {
      setResult('무승부!')
      setScore(prev => ({ ...prev, draw: prev.draw + 1 }))
    } else if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      setResult('승리! 🎉')
      setScore(prev => ({ ...prev, win: prev.win + 1 }))
    } else {
      setResult('패배! 😢')
      setScore(prev => ({ ...prev, lose: prev.lose + 1 }))
    }
  }

  return (
    <div className="game-container">
      <h2>✂️ 가위바위보</h2>
      
      <div className="score-board">
        <div className="score-item">승: {score.win}</div>
        <div className="score-item">무: {score.draw}</div>
        <div className="score-item">패: {score.lose}</div>
      </div>

      <div className="game-area">
        <div className="choice-display">
          <div className="choice-box">
            <div className="choice-label">나</div>
            <div className="choice-emoji">
              {playerChoice ? emojiMap[playerChoice] : '?'}
            </div>
            <div className="choice-name">
              {playerChoice ? nameMap[playerChoice] : ''}
            </div>
          </div>
          
          <div className="vs">VS</div>
          
          <div className="choice-box">
            <div className="choice-label">컴퓨터</div>
            <div className="choice-emoji">
              {computerChoice ? emojiMap[computerChoice] : '?'}
            </div>
            <div className="choice-name">
              {computerChoice ? nameMap[computerChoice] : ''}
            </div>
          </div>
        </div>

        {result && (
          <div className={`result ${result.includes('승리') ? 'win' : result.includes('패배') ? 'lose' : 'draw'}`}>
            {result}
          </div>
        )}
      </div>

      <div className="game-controls">
        <button onClick={() => play('rock')} className="choice-button">
          ✊ 바위
        </button>
        <button onClick={() => play('paper')} className="choice-button">
          ✋ 보
        </button>
        <button onClick={() => play('scissors')} className="choice-button">
          ✂️ 가위
        </button>
      </div>
    </div>
  )
}

export default RockPaperScissors

