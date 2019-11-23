'use strict'
/* eslint-disable handle-callback-err */
process.env.NODE_ENV = 'production'

const sinon = require('sinon')
const should = require('chai').should()
const nock = require('nock')
const Outgoing = require('./../lib/outgoing')

describe('Outgoing webhook component', () => {
  let logger, config, xmppSendStub, xmpp, scope, scopeUnauthorized, scopeWithError, scopeWithTimeout, reqSpy

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
      .post('/path/request-error')
      .replyWithError('error in request')
    scopeWithError.on('request', reqSpy)

    scopeWithTimeout = nock('https://domain.ltd:port')
      .post('/path/timeout-error')
      .delay(1000)
      .reply(200, { reply: 'This is a reply' })
    scopeWithTimeout.on('request', reqSpy)

    done()
  })

  describe('Unkwnow outgoing webhook', () => {
    it('Should throw an exception and not execute request', async () => {
      try {
        await Outgoing(logger, config, xmpp, 'user', 'destination', 'message', 'type', 'unknownCode')
        should.fail(0, 1, 'Exception not thrown')
      } catch (error) {
        error.message.should.equal('There is no webhook with code "unknownCode"')
      }
      sinon.assert.notCalled(reqSpy)
    })
  })

  describe('POST with basic authorization and JSON content-type and reply message to XMPP', () => {
    it('Should send basic authentication and JSON content-type in header and send an XMPP message', async () => {
      let result
      try {
        result = await Outgoing(logger, config, xmpp, 'user', 'destination', 'This a first message', 'type', 'basic-json-reply')
      } catch (error) {
        should.fail(0, 1, 'Exception is thrown')
      }
      result.should.equal('Message sent. There is a reply to send back in chat destination: This is a reply')
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
      xmppSendArgs[2].should.equal('type')
    })
  })

  describe('POST with bearer authorization and form-urlencoded content-type', () => {
    it('Should send bearer authentication and form-urlencoded content-type in header', async () => {
      let result
      try {
        result = await Outgoing(logger, config, xmpp, 'user', 'destination', 'This a second message', 'type', 'bearer-form')
      } catch (error) {
        should.fail(0, 1, 'Exception is thrown')
      }
      result.should.equal('Message sent')
      sinon.assert.calledOnce(reqSpy)
      const req = reqSpy.args[0][0]
      const bodyReq = decodeURIComponent(reqSpy.args[0][2])
      req.headers.authorization.should.equal('Bearer abcdefgh')
      req.headers['content-type'].should.equal('application/x-www-form-urlencoded')
      bodyReq.should.equal('from=user&message=This a second message&channel=destination')
    })
  })

  describe('POST without authorization', () => {
    it('Should not send authorization in header, handle 401 and throw an exception', async () => {
      try {
        await Outgoing(logger, config, xmpp, 'user', 'destination', 'message', 'type', 'protected')
        should.fail(0, 1, 'Exception not thrown')
      } catch (error) {
        error.message.should.equal('HTTP error: 401')
      }
      sinon.assert.calledOnce(reqSpy)
    })
  })

  describe('POST with HTTP error', () => {
    it('Should handle error and throw an exception', async () => {
      try {
        await Outgoing(logger, config, xmpp, 'user', 'destination', 'This a second message', 'type', 'request-error')
        should.fail(0, 1, 'Exception not thrown')
      } catch (error) {
        error.message.should.equal('error in request')
      }
      sinon.assert.calledOnce(reqSpy)
    })
  })

  describe('POST with timeout', () => {
    it('Should handle error and throw an exception', async () => {
      try {
        await Outgoing(logger, config, xmpp, 'user', 'destination', 'This a second message', 'type', 'timeout-error')
        should.fail(0, 1, 'Exception not thrown')
      } catch (error) {
        error.message.should.equal('ESOCKETTIMEDOUT')
      }
      sinon.assert.calledOnce(reqSpy)
    })
  })
})
