'use strict'
process.env.NODE_ENV = 'production'

const should = require('chai').should()
const sinon = require('sinon')
const EventEmitter = require('events').EventEmitter
const mock = require('mock-require')

describe('XMPP component', () => {
  const simpleXmppEvents = new EventEmitter()
  let logger, config, outgoingStub, xmppJoinStub

  before('Setup', (done) => {
    // create default logger
    logger = require('./../lib/logger')()

    // get configuration
    config = require('./../lib/config')(logger, './test/config.json')

    // update logger with configuration
    logger.updateConfig(config.logger)

    // mock simple-xmpp module
    xmppJoinStub = sinon.stub()
    mock('simple-xmpp', {
      connect: () => {},
      join: xmppJoinStub,
      on: (eventName, callback) => {
        simpleXmppEvents.on(eventName, callback)
      },
      getRoster: () => {}
    })

    // mock outgoing
    outgoingStub = sinon.stub()
    mock('./../lib/outgoing', outgoingStub)

    done()
  })

  after('Remove mocks', (done) => {
    mock.stopAll()
    done()
  })

  beforeEach('Reset outgoing stub history', function () {
    outgoingStub.resetHistory()
  })

  describe('Connect to XMPP server', () => {
    it('Should connect to XMPP server and join rooms when application start', (done) => {
      require('./../lib/xmpp')(logger, config)
      simpleXmppEvents.emit('online', { jid: { user: 'bot' } })
      sinon.assert.called(xmppJoinStub)
      let roomsLength = config.xmpp.rooms.length
      sinon.assert.callCount(xmppJoinStub, roomsLength)
      for (let index = 0; index < roomsLength; index++) {
        const args = xmppJoinStub.args[index]
        args.should.have.length(2)
        args[0].should.equal(config.xmpp.rooms[index].id + '/' + 'bot')
        if (config.xmpp.rooms[index].password === null) {
          should.equal(args[1], null)
        } else {
          args[1].should.equal(config.xmpp.rooms[index].password)
        }
      }
      done()
    })
  })

  describe('Bot receive a message from someone', () => {
    it('Should trigger outgoing webhook with valid arguments', (done) => {
      simpleXmppEvents.emit('chat', 'someone', 'This is the message text')
      sinon.assert.calledOnce(outgoingStub)
      const args = outgoingStub.args[0]
      args.should.have.length(8)
      args[3].should.equal('someone')
      args[4].should.equal('someone')
      args[5].should.equal('This is the message text')
      args[6].should.equal(false)
      args[7].should.equal('w1')
      done()
    })
  })

  describe('Bot receive a message from himself in a room', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('groupchat', 'roomname@conference.domain-xmpp.ltd', 'bot', 'This is the message text', null)
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive a message in an unknown room', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('groupchat', 'unknownroomname@conference.domain-xmpp.ltd', 'someone', 'This is the message text', null)
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive an old message in a room', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('groupchat', 'roomname@conference.domain-xmpp.ltd', 'someone', 'This is the message text', 'stamp')
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive a message in a room', () => {
    it('Should trigger outgoing webhook with valid arguments', (done) => {
      simpleXmppEvents.emit('groupchat', 'roomname@conference.domain-xmpp.ltd', 'someone', 'This is the message text', null)
      sinon.assert.calledOnce(outgoingStub)
      const args = outgoingStub.args[0]
      args.should.have.length(8)
      args[3].should.equal('someone')
      args[4].should.equal('roomname@conference.domain-xmpp.ltd')
      args[5].should.equal('This is the message text')
      args[6].should.equal(true)
      args[7].should.equal('w1')
      done()
    })
  })

  describe('XMPP server send an error', () => {
    it('Should log error only', (done) => {
      let error = 'This the error text'
      simpleXmppEvents.emit('error', error)
      require('fs').readFile(config.logger.file.path + config.logger.file.filename, 'utf8', (err, data) => {
        if (err) {
          throw err
        }
        data.should.match(new RegExp(error + '\n$'))
        done()
      })
    })
  })
})
