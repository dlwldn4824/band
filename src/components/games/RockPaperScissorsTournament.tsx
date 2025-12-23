import { useState, useEffect, useRef } from 'react'
import { doc, setDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import './Game.css'

type Choice = 'rock' | 'paper' | 'scissors' | null
type GameStatus = 'waiting' | 'registration' | 'playing' | 'finished'

interface Participant {
  userId: string
  name: string
  choice: Choice
  isAlive: boolean
}

interface GameState {
  status: GameStatus
  participants: Participant[]
  currentRound: number
  winner: { userId: string; name: string } | null
  registrationEndTime: any
  roundEndTime: any
}

const RockPaperScissorsTournament = () => {
  const { user, isAdmin } = useAuth()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerChoice, setPlayerChoice] = useState<Choice>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const gameRef = doc(db, 'rpsTournament', 'current')
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // 실시간 게임 상태 구독
    unsubscribeRef.current = onSnapshot(
      gameRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameState
          setGameState(data)
          
          // 남은 시간 계산
          if (data.status === 'registration' && data.registrationEndTime) {
            const endTime = data.registrationEndTime.toMillis()
            const now = Date.now()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            setTimeLeft(remaining)
          } else if (data.status === 'playing' && data.roundEndTime) {
            const endTime = data.roundEndTime.toMillis()
            const now = Date.now()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            setTimeLeft(remaining)
          }
        } else {
          // 게임이 없으면 초기화
          setGameState(null)
        }
      },
      (error) => {
        console.error('[RockPaperScissorsTournament] 게임 상태 구독 오류:', error)
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  // 운영진: 게임 시작
  const startGame = async () => {
    await setDoc(gameRef, {
      status: 'registration',
      participants: [],
      currentRound: 0,
      winner: null,
      registrationEndTime: serverTimestamp(),
      roundEndTime: null
    })

    // 10초 후 자동으로 게임 시작
    setTimeout(async () => {
      const snapshot = await getDoc(gameRef)
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState
        if (data.status === 'registration') {
          await startRound(data.participants, 1)
        }
      }
    }, 10000)
  }

  // 운영진: 라운드 시작
  const startRound = async (participants: Participant[], round: number) => {
    const aliveParticipants = participants.filter(p => p.isAlive)
    
    if (aliveParticipants.length <= 1) {
      // 우승자 결정
      const winner = aliveParticipants[0] || null
      await setDoc(gameRef, {
        status: 'finished',
        participants: participants,
        currentRound: round,
        winner: winner ? { userId: winner.userId, name: winner.name } : null,
        registrationEndTime: null,
        roundEndTime: null
      })
      return
    }

    // 선택 초기화 및 라운드 시작
    const updatedParticipants = participants.map(p => ({
      ...p,
      choice: null
    }))

    await setDoc(gameRef, {
      status: 'playing',
      participants: updatedParticipants,
      currentRound: round,
      winner: null,
      registrationEndTime: null,
      roundEndTime: serverTimestamp()
    })

    // 10초 후 자동으로 라운드 종료 및 다음 라운드
    setTimeout(async () => {
      await processRound(updatedParticipants, round)
    }, 10000)
  }

  // 운영진: 라운드 처리 (승자 결정)
  const processRound = async (participants: Participant[], round: number) => {
    const aliveParticipants = participants.filter(p => p.isAlive && p.choice !== null)
    
    if (aliveParticipants.length === 0) {
      await setDoc(gameRef, {
        status: 'finished',
        participants: participants,
        currentRound: round,
        winner: null,
        registrationEndTime: null,
        roundEndTime: null
      })
      return
    }

    // 승자 결정 로직
    const choices = aliveParticipants.map(p => p.choice)
    const hasRock = choices.includes('rock')
    const hasPaper = choices.includes('paper')
    const hasScissors = choices.includes('scissors')

    let winningChoice: Choice = null
    if (hasRock && hasPaper && !hasScissors) {
      winningChoice = 'paper'
    } else if (hasRock && hasScissors && !hasPaper) {
      winningChoice = 'rock'
    } else if (hasPaper && hasScissors && !hasRock) {
      winningChoice = 'scissors'
    } else if (hasRock && !hasPaper && !hasScissors) {
      // 모두 바위면 무승부, 모두 살아있음
    } else if (hasPaper && !hasRock && !hasScissors) {
      // 모두 보면 무승부
    } else if (hasScissors && !hasRock && !hasPaper) {
      // 모두 가위면 무승부
    }

    // 승자만 남기고 나머지는 탈락
    const updatedParticipants = participants.map(p => {
      if (!p.isAlive) return p
      if (p.choice === null) {
        return { ...p, isAlive: false }
      }
      if (winningChoice === null) {
        // 무승부면 모두 살아있음
        return p
      }
      if (p.choice !== winningChoice) {
        return { ...p, isAlive: false }
      }
      return p
    })

    // 다음 라운드로
    await startRound(updatedParticipants, round + 1)
  }

  // 관객: 참가 신청
  const joinGame = async () => {
    if (!user || !gameState) return

    const userId = `${user.name}_${user.phone}`
    const participantName = user.nickname || user.name

    const existingParticipant = gameState.participants.find(p => p.userId === userId)
    
    if (existingParticipant) {
      alert('이미 참가 신청하셨습니다!')
      return
    }

    const newParticipant: Participant = {
      userId,
      name: participantName,
      choice: null,
      isAlive: true
    }

    await setDoc(gameRef, {
      participants: [...gameState.participants, newParticipant]
    }, { merge: true })
  }

  // 관객: 선택 제출
  const submitChoice = async (choice: Choice) => {
    if (!user || !gameState || gameState.status !== 'playing') return

    const userId = `${user.name}_${user.phone}`
    const participant = gameState.participants.find(p => p.userId === userId && p.isAlive)

    if (!participant) {
      alert('참가자가 아닙니다!')
      return
    }

    if (participant.choice !== null) {
      alert('이미 선택하셨습니다!')
      return
    }

    const updatedParticipants = gameState.participants.map(p =>
      p.userId === userId ? { ...p, choice } : p
    )

    await setDoc(gameRef, {
      participants: updatedParticipants
    }, { merge: true })

    setPlayerChoice(choice)
  }

  // 운영진: 게임 리셋
  const resetGame = async () => {
    await setDoc(gameRef, {
      status: 'waiting',
      participants: [],
      currentRound: 0,
      winner: null,
      registrationEndTime: null,
      roundEndTime: null
    })
  }

  const emojiMap = { rock: '✊', paper: '✋', scissors: '✂️' }
  const nameMap = { rock: '바위', paper: '보', scissors: '가위' }

  if (isAdmin) {
    // 운영진 화면
    const aliveCount = gameState?.participants.filter(p => p.isAlive).length || 0
    const totalCount = gameState?.participants.length || 0

    return (
      <div className="game-container">
        <h2>✂️ 가위바위보 토너먼트 (운영진)</h2>

        <div className="game-area">
          {!gameState || gameState.status === 'waiting' ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>게임을 시작하시겠습니까?</p>
              <button onClick={startGame} className="game-button">
                게임 시작 (10초 참가 신청)
              </button>
            </div>
          ) : gameState.status === 'registration' ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3>참가 신청 중...</h3>
              <p style={{ fontSize: '2rem', margin: '1rem 0' }}>{timeLeft}초</p>
              <p>참가자: {totalCount}명</p>
              <div style={{ marginTop: '1rem' }}>
                {gameState.participants.map((p, i) => (
                  <div key={i} style={{ padding: '0.5rem' }}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          ) : gameState.status === 'playing' ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3>라운드 {gameState.currentRound}</h3>
              <p style={{ fontSize: '2rem', margin: '1rem 0' }}>{timeLeft}초</p>
              <p>생존자: {aliveCount}명 / 전체: {totalCount}명</p>
              <div style={{ marginTop: '1rem' }}>
                {gameState.participants.filter(p => p.isAlive).map((p, i) => (
                  <div key={i} style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', maxWidth: '300px', margin: '0 auto' }}>
                    <span>{p.name}</span>
                    <span>{p.choice ? `${emojiMap[p.choice]} ${nameMap[p.choice]}` : '선택 대기...'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3>게임 종료!</h3>
              {gameState.winner ? (
                <div>
                  <p style={{ fontSize: '1.5rem', margin: '1rem 0' }}>🏆 우승자: {gameState.winner.name}님</p>
                </div>
              ) : (
                <p>우승자가 없습니다.</p>
              )}
              <button onClick={resetGame} className="game-button" style={{ marginTop: '1rem' }}>
                새 게임 시작
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 관객 화면
  const userId = user ? `${user.name}_${user.phone}` : ''
  const participant = gameState?.participants.find(p => p.userId === userId)
  const isParticipant = !!participant
  const hasSubmitted = participant?.choice !== null

  return (
    <div className="game-container">
      <h2>✂️ 가위바위보 토너먼트</h2>

      <div className="game-area">
        {!gameState || gameState.status === 'waiting' ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>게임이 시작되기를 기다리는 중...</p>
          </div>
        ) : gameState.status === 'registration' ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3>참가 신청 중...</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0' }}>{timeLeft}초</p>
            {!isParticipant ? (
              <div>
                <p>참가 신청하시겠습니까?</p>
                <button onClick={joinGame} className="game-button">
                  참가하기
                </button>
              </div>
            ) : (
              <p>참가 신청 완료! 게임 시작을 기다려주세요.</p>
            )}
          </div>
        ) : gameState.status === 'playing' ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3>라운드 {gameState.currentRound}</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0' }}>{timeLeft}초</p>
            {!isParticipant || !participant.isAlive ? (
              <p>이번 게임에 참가하지 않으셨거나 탈락하셨습니다.</p>
            ) : hasSubmitted ? (
              <div>
                <p>선택 완료!</p>
                <p style={{ fontSize: '2rem', margin: '1rem 0' }}>
                  {playerChoice ? `${emojiMap[playerChoice]} ${nameMap[playerChoice]}` : ''}
                </p>
                <p>결과를 기다려주세요...</p>
              </div>
            ) : (
              <div>
                <p>선택해주세요!</p>
                <div className="game-controls">
                  <button onClick={() => submitChoice('rock')} className="choice-button">
                    ✊ 바위
                  </button>
                  <button onClick={() => submitChoice('paper')} className="choice-button">
                    ✋ 보
                  </button>
                  <button onClick={() => submitChoice('scissors')} className="choice-button">
                    ✂️ 가위
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3>게임 종료!</h3>
            {gameState.winner ? (
              <div>
                <p style={{ fontSize: '1.5rem', margin: '1rem 0' }}>🏆 우승자: {gameState.winner.name}님</p>
                {gameState.winner.userId === userId && (
                  <p style={{ fontSize: '1.2rem', color: '#D88676', marginTop: '1rem' }}>축하합니다! 🎉</p>
                )}
              </div>
            ) : (
              <p>우승자가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RockPaperScissorsTournament

