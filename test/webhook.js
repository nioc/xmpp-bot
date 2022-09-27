'use strict'
/* eslint-disable n/handle-callback-err */
/* eslint-disable prefer-regex-literals */
process.env.NODE_ENV = 'production'

require('chai').should()
const sinon = require('sinon')
const fs = require('fs')
const request = require('request')

describe('Webhook component', () => {
  let logger, config, xmppSendStub, xmpp, baseUrl, webhook, logFile, options

  before('Setup', () => {
    // create default logger
    logger = require('./../lib/logger')()

    // get configuration
    config = require('./../lib/config')(logger, './test/config.json')

    // update logger with configuration
    logger.updateConfig(config.logger)

    // mock xmpp component
    xmpp = {
      send: null
    }
    // configure webhook
    baseUrl = 'http://localhost:' + config.listener.port
    webhook = require('./../lib/webhook')(logger, config, xmpp)
    logFile = config.listener.log.path + config.listener.log.filename
  })

  beforeEach('Reset XMPP stub history and request option', function () {
    // mock xmpp component
    xmppSendStub = sinon.stub().resolves()
    xmpp.send = xmppSendStub
    options = {
      method: 'POST',
      url: baseUrl + config.listener.path + '/',
      auth: {
        user: 'login1',
        pass: '1pass'
      }
    }
  })

  after('Close listener', (done) => {
    webhook.close()
    done()
  })

  describe('POST without authorization', () => {
    it('Should return 401 and be logged', (done) => {
      request.post(baseUrl, (error, response, body) => {
        response.statusCode.should.equal(401)
        fs.readFile(logFile, 'utf8', (err, data) => {
          if (err) {
            throw err
          }
          data.should.match(new RegExp('"POST / HTTP/1.1" 401 '))
          done()
        })
      })
    })
  })

  describe('Wrong method (GET)', () => {
    it('Should return 405', (done) => {
      request.get(baseUrl, { auth: options.auth }, (error, response, body) => {
        response.statusCode.should.equal(405)
        done()
      })
    })
  })

  describe('POST unknown webhook', () => {
    it('Should return 404 and be logged', (done) => {
      options.url += 'unknown'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(404)
        fs.readFile(logFile, 'utf8', (err, data) => {
          if (err) {
            throw err
          }
          data.should.match(new RegExp('"POST ' + config.listener.path + '/unknown HTTP/1.1" 404 '))
          done()
        })
      })
    })
  })

  describe('POST dummy webhook', () => {
    it('Should return 204', (done) => {
      options.url += 'dummy'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(204)
        done()
      })
    })
  })

  describe('POST missing destination webhook', () => {
    it('Should return 400 and error detail', (done) => {
      options.url += 'w1'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(400)
        response.body.should.equal('Destination not found')
        done()
      })
    })
  })

  describe('POST missing message webhook', () => {
    it('Should return 400 and error detail', (done) => {
      options.json = {
        destination: 'destination'
      }
      options.url += 'w1'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(400)
        response.body.should.equal('Message not found')
        done()
      })
    })
  })

  describe('POST valid webhook (send message)', () => {
    it('Should return 200 and send XMPP message', (done) => {
      options.json = {
        destination: 'destination',
        message: 'This is a message'
      }
      options.url += 'w1'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(200)
        sinon.assert.calledOnce(xmppSendStub)
        const args = xmppSendStub.args[0]
        args.should.have.length(3)
        args[0].should.equal(options.json.destination)
        args[1].should.equal(options.json.message)
        args[2].should.equal('chat')
        done()
      })
    })
  })

  describe('POST valid webhook (send message) with XMPP error', () => {
    it('Should return 200 and send XMPP message', (done) => {
      xmppSendStub = sinon.stub().rejects()
      xmpp.send = xmppSendStub
      options.json = {
        destination: 'destination',
        message: 'This is a message'
      }
      options.url += 'w1'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(500)
        sinon.assert.calledOnce(xmppSendStub)
        const args = xmppSendStub.args[0]
        args.should.have.length(3)
        args[0].should.equal(options.json.destination)
        args[1].should.equal(options.json.message)
        args[2].should.equal('chat')
        done()
      })
    })
  })

  describe('POST valid webhook (send template)', () => {
    it('Should return 200 and send XMPP message', (done) => {
      options.json = {
        title: 'This is a title',
        message: 'This is a message',
        evalMatches: [
          {
            metric: 'metric',
            value: 'value'
          }
        ],
        imageUrl: 'https://domain.ltd:port/path/image'
      }
      options.url += 'grafana'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(200)
        sinon.assert.calledOnce(xmppSendStub)
        const args = xmppSendStub.args[0]
        args.should.have.length(3)
        args[0].should.equal('grafana@conference.domain-xmpp.ltd')
        args[1].should.equal('This is a title\r\nThis is a message\r\nmetric: value\r\nhttps://domain.ltd:port/path/image')
        args[2].should.equal('groupchat')
        done()
      })
    })
  })

  describe('POST valid webhook (send template) with XMPP error', () => {
    it('Should return 200 and send XMPP message', (done) => {
      xmppSendStub = sinon.stub().rejects()
      xmpp.send = xmppSendStub
      options.json = {
        title: 'This is a title',
        message: 'This is a message',
        evalMatches: [
          {
            metric: 'metric',
            value: 'value'
          }
        ],
        imageUrl: 'https://domain.ltd:port/path/image'
      }
      options.url += 'grafana'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(500)
        sinon.assert.calledOnce(xmppSendStub)
        const args = xmppSendStub.args[0]
        args.should.have.length(3)
        args[0].should.equal('grafana@conference.domain-xmpp.ltd')
        args[1].should.equal('This is a title\r\nThis is a message\r\nmetric: value\r\nhttps://domain.ltd:port/path/image')
        args[2].should.equal('groupchat')
        done()
      })
    })
  })
})
