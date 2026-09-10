import { apiFetch } from './api'

const form = document.querySelector<HTMLFormElement>('[data-login-form]')
const errorBox = document.querySelector<HTMLElement>('[data-login-error]')

apiFetch('/auth/session').then(() => {
  window.location.replace('/admin/')
}).catch(() => {})

form?.addEventListener('submit', async event => {
  event.preventDefault()
  errorBox?.classList.add('is-hidden')
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (button) button.disabled = true

  const data = new FormData(form)
  try {
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: String(data.get('username') ?? ''),
        password: String(data.get('password') ?? '')
      })
    })
    window.location.replace('/admin/')
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = error instanceof Error ? error.message : 'Sign in failed'
      errorBox.classList.remove('is-hidden')
    }
  } finally {
    if (button) button.disabled = false
  }
})
