import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import Peer from 'simple-peer'
import axios from 'axios'
import { signalServerUrl } from '@renderer/config/url'
import { useParams } from 'react-router-dom'

function ServerPage(): JSX.Element {
  const [myId, setMyId] = useState<string | null>(null)
  const [sid, setSid] = useState<string | null>(null)
  const { id, screen, width, height } = useParams()

  const videoRef = useRef<HTMLVideoElement>()
  const socketRef = useRef<any>(null)

  const addVideoStream = (stream) => {
    videoRef.current!.srcObject = stream
    videoRef.current!.addEventListener('loadedmetadata', () => {
      videoRef.current!.play()
    })
  }

  function gotMedia(stream) {
    const peer = new Peer({ initiator: true, stream: stream, trickle: false })

    peer.on('signal', (data) => {
      axios
        .put(`${signalServerUrl}/api/remote/${id}`, {
          signal: data,
          sid: sid,
          screen_id: screen,
          width: width,
          height: height
        })
        .then((_res) => {
          setMyId(id!)
        })
    })

    // 연결 종료 이벤트
    peer.on('close', () => {
      console.log('Connection closed. Creating new peer...')
      // 기존 피어 객체 파기
      peer.destroy()

      // 새로고침해서 새로운 피어 생성
      location.reload()
    })

    // 오류 이벤트
    peer.on('error', (err) => {
      console.error('Peer connection error: ' + err)

      // 새로고침해서 새로운 피어 생성
      location.reload()
    })

    // 시그널링 서버로부터 시그널 데이터 수신
    socketRef.current.on('signal', (message) => {
      if (!message.initiator) {
        console.log(message.signal)
        peer.signal(message.signal)
      }
    })

    socketRef.current.on('mouse_move', (data) => {
        window.electron.ipcRenderer.invoke('mouse_move', data)
    })

    socketRef.current.on('mouse_click', (data) => {
        window.electron.ipcRenderer.invoke('mouse_click', data)
    })

    addVideoStream(stream)
  }

  function startPeerConnection() {
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          // @ts-ignore
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screen
          }
        }
      })
      .then(gotMedia)
  }

  // sid 를 받아왔을 때만 실행
  useEffect(() => {
    if (!sid) {
      const socket = io(signalServerUrl, {
        path: '/ws/socket.io'
      })

      socketRef.current = socket // socket 인스턴스를 ref에 저장

      socket.on('connected', (data) => {
        console.log('Server message:', data.message)
        setSid(data.sid)
      })
    }
    if (sid) {
      startPeerConnection()
    }
  }, [sid, id])

  return (
    <>
      <div>
        내 아이디 : {myId} 내 sid : {sid}
      </div>
      <div>
        <video ref={videoRef as any} />
      </div>
    </>
  )
}

export default ServerPage
