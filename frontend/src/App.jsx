import { useState } from 'react'
import './styles/App.css'
import UserTable from './components/UserTable.jsx'
import TimesheetForm from './components/TimesheetForm.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      {/* <h1>App</h1> */}
      <TimesheetForm />
      {/* <UserTable /> */}
    </>
  )
}

export default App
