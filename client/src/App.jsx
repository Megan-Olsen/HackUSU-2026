import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
const [serverMessage, setServerMessage] = useState("Waiting for server...")

useEffect(() => {
axios.get('http://localhost:5000/api/hello')
.then(res => setServerMessage(res.data.message))
.catch(err => setServerMessage("Error connecting to server"));
}, [])

return (
<div style={{ textAlign: 'center', marginTop: '50px' }}>
<h1>HackUSU 2026 Boilerplate</h1>
<p>Server Status: <strong>{serverMessage}</strong></p>
</div>
)
}

export default App