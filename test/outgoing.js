'use strict'
/* eslint-disable handle-callback-err */
process.env.NODE_ENV = 'production'

const sinon = require('sinon')
const should = require('chai').should()
const nock = require('nock')
const Outgoing = require('./../lib/outgoing')
require('chai').should()

describe('Outgoing webhook component', () => {
  let logger, config, xmppSendStub, xmpp, scope, scopeUnauthorized, scopeWithError, reqSpy

  before('Setup', () => {
    // create default logger
    logger = require('./../lib/logger')()

    // get configuration
    config = require('./../lib/config')(logger, './test/config.json')

    // update logger with configuration
    logger.updateConfig(config.logger)

    // mock xmpp component
    xmppSendStub = sinon.stub()
    xmpp = {
      send: xmppSendStub
    }

    // spy nock requests
    reqSpy = sinon.spy()
  })

  beforeEach('Reset XMPP stub history', function (done) {
    xmppSendStub.resetHistory()
    reqSpy.resetHistory()

    // mock remote server
    scope = nock('https://domain.ltd:port')
      .post('/path/resource')
      .reply(200, { reply: 'This is a reply' })
    scope.on('request', reqSpy)
    scopeUnauthorized = nock('https://domain.ltd:port')
      .post('/path/protectedresource')
      .reply(401, {})
    scopeUnauthorized.on('request', reqSpy)
    scopeWithError = nock('https://domain.ltd:port')
      .post('/path/errorresource')
      .replyWithError('')
    scopeWithError.on('request', reqSpy)

    done()
  })

  describe('Unkwnow outgoing webhook', () => {
    it('Should not execute request', (done) => {
      Outgoing(logger, config, xmpp, 'user', 'destination', 'message', true, 'code', (error, response, body) => {
        should.not.equal(error, null)
        sinon.assert.notCalled(reqSpy)
        done()
      })
    })
  })

  describe('POST with basic authorization and JSON content-type and reply message to XMPP', () => {
    it('Should send basic authentication and JSON content-type in header and send an XMPP message', (done) => {
      Outgoing(logger, config, xmpp, 'user', 'destination', 'This a first message', true, 'w1', (error, response, body) => {
        should.equal(error, null)
        sinon.assert.calledOnce(reqSpy)
        const req = reqSpy.args[0][0]
        const bodyReq = JSON.parse(reqSpy.args[0][2])
        req.headers.authorization.should.equal('Basic dXNlcjM6M3Bhc3M=')
        req.headers['content-type'].should.equal('application/json')
        bodyReq.from.should.equal('user')
        bodyReq.channel.should.equal('destination')
        bodyReq.message.should.equal('This a first message')
        sinon.assert.calledOnce(xmppSendStub)
        const xmppSendArgs = xmppSendStub.args[0]
        xmppSendArgs[0].should.equal('destination')
        xmppSendArgs[1].should.equal('This is a reply')
        xmppSendArgs[2].should.equal(true)
        done()
      })
    })
  })

  describe('POST with bearer authorization and JSON content-type', () => {
    it('Should send basic authentication in header', (done) => {
      Outgoing(logger, config, xmpp, 'user', 'destination', 'This a second message', true, 'w2', (error, response, body) => {
        should.equal(error, null)
        sinon.assert.calledOnce(reqSpy)
        const req = reqSpy.args[0][0]
        const bodyReq = decodeURIComponent(reqSpy.args[0][2])
        req.headers.authorization.should.equal('Bearer abcdefgh')
        req.headers['content-type'].should.equal('application/x-www-form-urlencoded')
        bodyReq.should.equal('from=user&message=This a second message&channel=destination')
        done()
      })
    })
  })

  describe('POST without authorization', () => {
    it('Should not send authorization in header and handle 401', (done) => {
      Outgoing(logger, config, xmpp, 'user', 'destination', 'This a second message', true, 'w3', (error, response, body) => {
        should.not.equal(error, null)
        sinon.assert.calledOnce(reqSpy)
        done()
      })
    })
  })

  describe('POST with HTTP error', () => {
    it('Should handle error', (done) => {
      Outgoing(logger, config, xmpp, 'user', 'destination', 'This a second message', true, 'w4', (error, response, body) => {
        should.not.equal(error, null)
        sinon.assert.calledOnce(reqSpy)
        done()
      })
    })
  })
})
