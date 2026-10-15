import { useState } from 'react'
import './styles/App.css'
import TimesheetForm from './pages/TimesheetForm.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <TimesheetForm />
    </>
  )
}

export default App
