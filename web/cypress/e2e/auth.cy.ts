const user = { id: 'user-id', email: 'usuario@vocali.test' }

function waitForForm() {
  cy.get('form').should(form => {
    expect(Object.getOwnPropertySymbols(form[0]!).some(symbol => symbol.description === '_vei')).to.equal(true)
  })
}

describe('acceso', () => {
  it('inicia sesión y abre el dashboard', () => {
    cy.intercept('POST', /\/auth\/login$/, { user })
    cy.intercept('GET', /\/auth\/session$/, { user })
    cy.intercept('GET', /\/transcriptions(?:\?.*)?$/, { items: [] })

    cy.visit('/login')
    waitForForm()
    cy.get('input[name="email"]').type(user.email)
    cy.get('input[name="password"]').type('password')
    cy.contains('button', 'Entrar').click()

    cy.location('pathname').should('eq', '/')
    cy.contains('h1', 'Dashboard').should('be.visible')
  })

  it('registra una cuenta y muestra el paso de confirmación', () => {
    cy.intercept('POST', /\/auth\/register$/, {
      complete: false,
      destination: user.email
    })

    cy.visit('/register')
    waitForForm()
    cy.get('input[name="email"]').type(user.email)
    cy.get('input[name="password"]').type('password')
    cy.get('input[name="passwordConfirmation"]').type('password')
    cy.contains('button', 'Crear cuenta').click()

    cy.get('input[name="confirmationCode"]').should('be.visible')
  })
})
