import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import './QRScanner.css'

interface QRScannerProps {
  onScanSuccess: (data: { name: string; phone: string }) => void
  onClose: () => void
}

const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef<boolean>(false)
  const [error, setError] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const navigate = useNavigate()

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err: any) {
        // "Cannot stop, scanner is not running" 에러는 무시
        const errorMessage = err?.message || err?.toString() || ''
        if (!errorMessage.includes('not running') && !errorMessage.includes('not paused')) {
          console.warn('Error stopping scanner:', err)
        }
      } finally {
        isScanningRef.current = false
        setIsScanning(false)
      }
    }
  }, [])

  const handleClose = useCallback(async () => {
    await stopScanner()
    onClose()
  }, [stopScanner, onClose])

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // 후면 카메라 사용
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            // QR 코드 스캔 성공
            // URL 형식인지 확인 (체크인 페이지 URL)
            if (decodedText.includes('/checkin') || decodedText.startsWith('http')) {
              await stopScanner()
              // URL이면 체크인 페이지로 이동 (이미 체크인 페이지에 있으면 무시)
              if (decodedText.includes('/checkin')) {
                onClose()
                // 이미 체크인 페이지에 있으므로 아무것도 하지 않음
              } else {
                // 외부 URL이면 해당 페이지로 이동
                window.location.href = decodedText
              }
              return
            }

            // JSON 형식인지 확인
            try {
              const data = JSON.parse(decodedText)
              if (data.name && data.phone) {
                await stopScanner()
                onScanSuccess({ name: data.name, phone: data.phone })
              } else {
                setError('올바른 QR 코드가 아닙니다.')
              }
            } catch (e) {
              setError('QR 코드 형식이 올바르지 않습니다.')
            }
          },
          (errorMessage) => {
            // 스캔 중 에러 (무시)
          }
        )
        isScanningRef.current = true
        setIsScanning(true)
      } catch (err) {
        setError('카메라 접근 권한이 필요합니다.')
        console.error('QR Scanner error:', err)
        isScanningRef.current = false
        setIsScanning(false)
      }
    }

    startScanner()

    return () => {
      stopScanner()
    }
  }, [onScanSuccess, onClose, stopScanner])

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        <div className="qr-scanner-header">
          <h2>QR 코드 스캔</h2>
          <button onClick={handleClose} className="qr-scanner-close">✕</button>
        </div>
        <div id="qr-reader" className="qr-reader"></div>
        {error && <div className="qr-scanner-error">{error}</div>}
        <div className="qr-scanner-instruction">
          QR 코드를 카메라에 맞춰주세요
        </div>
      </div>
    </div>
  )
}

export default QRScanner

