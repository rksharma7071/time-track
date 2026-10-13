import React from 'react'
import { getAllUsers } from '../data/user'
import { useEffect } from 'react'
import { useState } from 'react'
import '../styles/UserTable.css'

const UserTable = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const { users } = await getAllUsers();
      setUsers(users)
    }
    getData();
  }, [])
  return (
    <main className="users-page">
      <header className="users-header">
        <div>
          <p className="users-subtitle">MANAGEMENT</p>
          <h1>User Directory</h1>
          <p className="users-description">
            Manage and view all registered users.
          </p>
        </div>

        <div className="users-count">
          <span>Total Users</span>
          <strong>{users.length}</strong>
        </div>
      </header>

      <section className="users-grid">
        {users.map((user, index) => (
          <article className="user-card" key={`${user.email}-${index}`}>
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <h2>{user.name}</h2>
              <p className="user-email">{user.email}</p>

              <span
                className={`user-role ${user.role === "admin" ? "admin-role" : "employee-role"
                  }`}
              >
                {user.role}
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default UserTable
