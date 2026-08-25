const user = { id: 'user-id', email: 'usuario@vocali.test' }

const transcription = (id: number) => ({
  id: `transcription-${id}`,
  name: `audio-${id}.mp3`,
  createdAt: new Date(Date.UTC(2026, 7, 28, 12, 0, -id)).toISOString()
})

function login() {
  cy.intercept('POST', /\/auth\/login$/, { user })
  cy.intercept('GET', /\/auth\/session$/, { user })
  cy.visit('/login')
  cy.get('form').should(form => {
    expect(Object.getOwnPropertySymbols(form[0]!).some(symbol => symbol.description === '_vei')).to.equal(true)
  })
  cy.get('input[name="email"]').type(user.email)
  cy.get('input[name="password"]').type('password')
  cy.contains('button', 'Entrar').click()
  cy.location('pathname').should('eq', '/')
}

describe('dashboard', () => {
  it('lista transcripciones y muestra su detalle', () => {
    const item = transcription(1)
    cy.intercept('GET', /\/transcriptions(?:\?.*)?$/, { items: [item] }).as('history')
    cy.intercept('GET', /\/transcriptions\/transcription-1$/, {
      ...item,
      text: 'Texto completo de la transcripción.'
    }).as('detail')

    login()
    cy.wait('@history')
    cy.contains('section', 'Biblioteca').contains('button', item.name).click()
    cy.wait('@detail')
    cy.get('dialog').should('be.visible')
    cy.get('dialog').contains('button', '×').click()
    cy.get('dialog').should('not.be.visible')
  })

  it('navega entre páginas del historial', () => {
    const firstPage = transcription(1)
    const secondPage = transcription(2)
    cy.intercept('GET', /\/transcriptions(?:\?.*)?$/, request => {
      request.reply(request.query.cursor
        ? { items: [secondPage] }
        : { items: [firstPage], nextCursor: 'second-page' })
    }).as('history')

    login()
    cy.wait('@history')
    cy.contains('section', 'Biblioteca').as('library')
    cy.get('@library').should('contain', firstPage.name)

    cy.get('@library').contains('button', 'Siguiente').click()
    cy.wait('@history')
    cy.get('@library').should('contain', secondPage.name)

    cy.get('@library').contains('button', 'Anterior').click()
    cy.wait('@history')
    cy.get('@library').should('contain', firstPage.name)
  })

  it('sube un audio y añade el registro a la biblioteca', () => {
    const completed = { ...transcription(3), name: 'prueba.mp3', text: 'Audio transcrito.' }

    cy.intercept('GET', /\/transcriptions(?:\?.*)?$/, { items: [] }).as('history')
    cy.intercept('POST', /\/transcriptions\/upload$/, {
      statusCode: 201,
      body: { id: completed.id, url: '/mock-upload', fields: {} }
    })
    cy.intercept('POST', '/mock-upload', { statusCode: 204 })
    cy.intercept('POST', new RegExp(`/transcriptions/${completed.id}/start$`), { jobId: 'job-id' })
    cy.intercept('POST', new RegExp(`/transcriptions/${completed.id}/status$`), completed).as('status')

    login()
    cy.wait('@history')
    cy.contains('nav button', 'Subir audio').click({ force: true })
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('audio'),
      fileName: completed.name,
      mimeType: 'audio/mpeg'
    })
    cy.contains('button', 'Transcribir audio').click()

    cy.contains('Transcribiendo el audio…').should('be.visible')
    cy.wait('@status')
    cy.wait('@history')
    cy.contains('Transcripción completada.').should('be.visible')
    cy.contains('nav button', 'Biblioteca').click({ force: true })
    cy.contains('section', 'Biblioteca').should('be.visible').and('contain', completed.name)
  })
})
