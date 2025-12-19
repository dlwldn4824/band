import { useState } from 'react'
import './Setlist.css'
import { SetlistItem } from '../contexts/DataContext'

interface SetlistProps {
  setlist: SetlistItem[]
}

interface SongModalProps {
  item: SetlistItem | null
  onClose: () => void
}

const SongModal = ({ item, onClose }: SongModalProps) => {
  if (!item) return null

  return (
    <div className="song-modal-overlay" onClick={onClose}>
      <div className="song-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="song-modal-close" onClick={onClose}>×</button>
        {item.image ? (
          <div className="song-modal-image-wrapper">
            <img 
              src={item.image} 
              alt={item.songName}
              className="song-modal-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        ) : (
          <div className="song-modal-no-image">
            <p>이미지가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

const Setlist = ({ setlist }: SetlistProps) => {
  const [selectedSong, setSelectedSong] = useState<SetlistItem | null>(null)

  const getSessionChips = (item: SetlistItem) => {
    const chips: Array<{ label: string; member: string; type: 'vocal' | 'guitar' | 'bass' | 'keyboard' | 'drum' }> = []
    
    const extractMembers = (members: string | undefined) => {
      if (!members || !members.trim() || members.trim() === '-') return []
      return members.split(',').map(m => m.trim()).filter(m => m && m !== '-')
    }
    
    extractMembers(item.vocal).forEach(member => {
      chips.push({ label: '보컬', member, type: 'vocal' })
    })
    extractMembers(item.guitar).forEach(member => {
      chips.push({ label: '기타', member, type: 'guitar' })
    })
    extractMembers(item.bass).forEach(member => {
      chips.push({ label: '베이스', member, type: 'bass' })
    })
    extractMembers(item.keyboard).forEach(member => {
      chips.push({ label: '키보드', member, type: 'keyboard' })
    })
    extractMembers(item.drum).forEach(member => {
      chips.push({ label: '드럼', member, type: 'drum' })
    })
    
    return chips
  }

  return (
    <>
      <div className="setlist">
        <div className="setlist-header">
          <h2>셋리스트</h2>
        </div>
        <div className="setlist-content">
          <ol className="setlist-list">
            {setlist.map((item, index) => {
              const chips = getSessionChips(item)
              return (
                <li 
                  key={index} 
                  className="setlist-item"
                  onClick={() => item.image && setSelectedSong(item)}
                >
                  <div className="setlist-left">
                    <div className="setlist-number">{index + 1}</div>
                    <div className="setlist-song-info">
                      <div className="setlist-song">{item.songName}</div>
                      {item.artist && (
                        <div className="setlist-artist">{item.artist}</div>
                      )}
                    </div>
                  </div>
                  {chips.length > 0 && (
                    <div className="setlist-right">
                      <div className="setlist-sessions">
                        {chips.map((chip, idx) => (
                          <span 
                            key={idx} 
                            className={`setlist-chip setlist-chip-${chip.type}`}
                          >
                            {chip.label} {chip.member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      {selectedSong && (
        <SongModal 
          item={selectedSong} 
          onClose={() => setSelectedSong(null)} 
        />
      )}
    </>
  )
}

export default Setlist

