import React from 'react'
import Header from '../components/Header.jsx'
import { Outlet } from 'react-router-dom'
const Base = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

export default Base
