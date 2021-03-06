import React from 'react'
import { useSelector } from 'react-redux'

export const Status = () => {
  const statusMessage = useSelector((store) => store.user.login.statusMessage)
  return (
    <p>Status: {`${statusMessage}`}</p>
  )
}