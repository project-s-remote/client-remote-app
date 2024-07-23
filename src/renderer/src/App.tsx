import { useEffect, useRef, useState } from 'react'
import { Button } from './components/ui/button'
import { io } from 'socket.io-client'
import Peer from 'simple-peer'
import axios from 'axios'

const socket = io('ws://localhost:8000/', {
  path: '/ws/socket.io'
})

function App(): JSX.Element {
  const [myId, setMyId] = useState<string | null>(null)
  const [sid, setSid] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>()

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
        .post('http://localhost:8000/api/create/remote', {
          signal: data,
          sid: sid
        })
        .then((res) => {
          setMyId(res.data)
        })
    })

    // 연결 종료 이벤트
    peer.on('close', () => {
      console.log('Peer connection closed')

      // TODO: 만약 클로즈 되었을 때??? PEER 연결 새로 만들어서 mongodb에 갱신하기 그러려면 고정uuid가 있어야겠지?

    })

    // 오류 이벤트
    peer.on('error', (err) => {
      console.error('Peer connection error: ' + err)
    })

    // 시그널링 서버로부터 시그널 데이터 수신
    socket.on('signal', (message) => {
      if (!message.initiator) {
        console.log(message.signal)
        peer.signal(message.signal)
      }
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
            chromeMediaSourceId: 'screen:0:0'
          }
        }
      })
      .then(gotMedia)
  }

  // sid 를 받아왔을 때만 실행
  useEffect(() => {
    socket.on('connected', (data) => {
      console.log('Server message:', data.message)
      setSid(data.sid)
    })

    if (sid) {
      startPeerConnection()
    }
  }, [sid])

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

export default App
