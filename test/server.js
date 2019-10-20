'use strict'
process.env.NODE_ENV = 'production'
require('chai').should()
const mock = require('mock-require')
const sinon = require('sinon')

describe('Server', () => {
  let xmppStub, webhookStub

  before('Setup', (done) => {
    // mock XMPP component
    xmppStub = sinon.stub()
    webhookStub = sinon.stub()
    mock('./../lib/xmpp', () => {
      let xmpp = {}
      xmppStub()
      return xmpp
    })

    // mock webhook component
    mock('./../lib/webhook', webhookStub)

    done()
  })

  after('Remove mock', () => {
    mock.stopAll()
  })

  beforeEach('Reset stub', (done) => {
    xmppStub.resetHistory()
    webhookStub.resetHistory()
    done()
  })

  describe('Start server', () => {
    it('Should call XMPP and webhook components', (done) => {
      require('../lib/server')
      sinon.assert.calledOnce(xmppStub)
      sinon.assert.calledOnce(webhookStub)
      done()
    })
  })
})
