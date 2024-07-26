import { Button } from '@renderer/components/ui/button'
import { signalServerUrl } from '@renderer/config/url';
import axios from 'axios';
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const [myId, setMyId] = useState<string | null>(null)
	const [screens, setScreens] = useState<any[] | null>(null)

	async function getId() {
		try {
			const id = await window.electron.ipcRenderer.invoke('getId');
			console.log('Received ID:', id);

			// 여기서 필요한 처리를 합니다.

			if (id) {
				setMyId(id)
			} else {
				axios.get(`${signalServerUrl}/api/empty_remote`).then(res => {
					setId(res.data)
				})
			}	
	
		} catch (error) {
			console.error('Error fetching ID:', error);
		}
	}

	async function setId(newId: string) {
		try {
			const id = await window.electron.ipcRenderer.invoke('setId', newId);
			console.log('ID set to:', id);

			setMyId(id)

		} catch (error) {
			console.error('Error setting ID:', error);
		}
	}

	async function  getScreens() {
		try {
			const screens = await window.electron.ipcRenderer.invoke('getScreens');
			setScreens(screens)
		} catch (error) {
			console.error('Error setting ID:', error);
		}
	}

  useEffect(() => {
		getId()
		getScreens()
  }, [])

  return (
    <>
      <main>
        <h1>홈 입니다.</h1>
        <p>할당 받은 ID : {myId}</p>
				<div>스크린 목록 : {JSON.stringify(screens)}</div>
        <Link to={`/server/${myId}/${screens?.[0].screen_id}/${screens?.[0].size.width}/${screens?.[0].size.height}`}>
          <Button>서버 열기</Button>
        </Link>
      </main>
    </>
  )
}
