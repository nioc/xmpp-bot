'use strict'
process.env.NODE_ENV = 'production'

const sinon = require('sinon')
const EventEmitter = require('events').EventEmitter
const mock = require('mock-require')
const xml = require('@xmpp/xml')
const jid = require('@xmpp/jid')

describe('XMPP component', () => {
  const simpleXmppEvents = new EventEmitter()
  let logger, config, outgoingStub, xmppSendStub, xmppCloseStub

  before('Setup', (done) => {
    // create default logger
    logger = require('./../lib/logger')()

    // get configuration
    config = require('./../lib/config')(logger, './test/config.json')

    // update logger with configuration
    logger.updateConfig(config.logger)

    // mock @xmpp/client module
    xmppSendStub = sinon.stub().resolves()
    xmppCloseStub = sinon.stub().resolves()
    mock('@xmpp/client', {
      client: () => {
        this.start = async () => {}
        this.stop = xmppCloseStub
        this.send = xmppSendStub
        this.on = (eventName, callback) => {
          simpleXmppEvents.on(eventName, callback)
        }
        return this
      },
      xml: require('@xmpp/xml'),
      jid: require('@xmpp/jid')
    })

    // mock outgoing
    outgoingStub = sinon.stub()
    mock('./../lib/outgoing', outgoingStub)

    // mock logger trace
    sinon.stub(logger, 'trace')

    done()
  })

  after('Remove mocks', (done) => {
    mock.stopAll()
    logger.trace.restore()
    done()
  })

  beforeEach('Reset outgoing and xmpp stub history', function () {
    outgoingStub.resetHistory()
    xmppSendStub.resetHistory()
    xmppCloseStub.resetHistory()
  })

  describe('Connect to XMPP server', () => {
    it('Should connect to XMPP server and join rooms when application start', (done) => {
      require('./../lib/xmpp')(logger, config)
      simpleXmppEvents.emit('online', jid('bot@domain-xmpp.ltd/resource'))
      sinon.assert.called(xmppSendStub)
      // 1 "send" call for presence and n "send" calls for joining rooms
      let roomsLength = config.xmpp.rooms.length
      sinon.assert.callCount(xmppSendStub, roomsLength + 1)
      for (let index = 1; index < roomsLength + 1; index++) {
        const args = xmppSendStub.args[index]
        args.should.have.length(1)
        let occupantJid = config.xmpp.rooms[index - 1].id + '/' + 'bot'
        const stanza = xml(
          'presence', {
            to: occupantJid
          },
          xml(
            'x', {
              xmlns: 'http://jabber.org/protocol/muc'
            }
          )
        )
        args[0].should.deep.equal(stanza)
      }
      done()
    })
    it('Should trace connection status', (done) => {
      simpleXmppEvents.emit('status', 'connecting')
      sinon.assert.calledWith(logger.trace, 'Status changed to connecting')
      done()
    })
  })

  describe('Bot receive a presence stanza from someone', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('stanza', xml(
        'presence', {
          from: 'someone@domain-xmpp.ltd',
          to: 'bot@domain-xmpp.ltd'
        }
      ))
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive an empty message from someone', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('stanza', xml(
        'message', {
          from: 'someone@domain-xmpp.ltd',
          to: 'bot@domain-xmpp.ltd',
          type: 'chat'
        }
      ))
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive a message from someone', () => {
    it('Should trigger outgoing webhook with valid arguments and send a message delivery receipt', (done) => {
      simpleXmppEvents.emit('stanza', xml(
        'message', {
          from: 'someone@domain-xmpp.ltd',
          to: 'bot@domain-xmpp.ltd',
          type: 'chat',
          id: 'fcdd3d8c'
        },
        xml(
          'body', {
          },
          'This is the message text'),
        xml(
          'request', {
            xmlns: 'urn:xmpp:receipts'
          })
      ))
      sinon.assert.calledOnce(outgoingStub)
      const args = outgoingStub.args[0]
      args.should.have.length(8)
      args[3].should.equal('someone')
      args[4].should.equal('someone@domain-xmpp.ltd')
      args[5].should.equal('This is the message text')
      args[6].should.equal('chat')
      args[7].should.equal('w1')
      sinon.assert.calledOnce(xmppSendStub)
      const receiptStanza = xml(
        'message', {
          to: 'someone@domain-xmpp.ltd'
        },
        xml(
          'received', {
            xmlns: 'urn:xmpp:receipts',
            id: 'fcdd3d8c'
          }
        )
      )
      xmppSendStub.args[0][0].should.deep.equal(receiptStanza)
      done()
    })
  })

  describe('Bot receive a message from himself in a room', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('stanza', xml(
        'message', {
          from: 'roomname@conference.domain-xmpp.ltd/bot',
          to: 'roomname@conference.domain-xmpp.ltd',
          type: 'groupchat'
        },
        xml(
          'body', {
          },
          'This is the message text')
      ))
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive a message in an unknown room', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('stanza', xml(
        'message', {
          from: 'unknownroomname@conference.domain-xmpp.ltd/someone',
          to: 'unknownroomname@conference.domain-xmpp.ltd',
          type: 'groupchat'
        },
        xml(
          'body', {
          },
          'This is the message text')
      ))
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive an old message in a room', () => {
    it('Should not trigger outgoing webhook', (done) => {
      simpleXmppEvents.emit('groupchat', 'roomname@conference.domain-xmpp.ltd', 'someone', 'This is the message text', 'stamp')
      simpleXmppEvents.emit('stanza', xml(
        'message', {
          from: 'roomname@conference.domain-xmpp.ltd/someone',
          to: 'roomname@conference.domain-xmpp.ltd',
          type: 'groupchat'
        },
        xml(
          'body', {
          },
          'This is the message text'),
        xml(
          'delay', {
            xmlns: 'urn:xmpp:delay',
            from: 'roomname@conference.domain-xmpp.ltd'
          },
          'This is the message text')
      ))
      sinon.assert.notCalled(outgoingStub)
      done()
    })
  })

  describe('Bot receive a message in a room', () => {
    it('Should trigger outgoing webhook with valid arguments', (done) => {
      simpleXmppEvents.emit('stanza', xml(
        'message', {
          from: 'roomname@conference.domain-xmpp.ltd/someone',
          to: 'roomname@conference.domain-xmpp.ltd',
          type: 'groupchat'
        },
        xml(
          'body', {
          },
          'This is the message text')
      ))
      sinon.assert.calledOnce(outgoingStub)
      const args = outgoingStub.args[0]
      args.should.have.length(8)
      args[3].should.equal('someone')
      args[4].should.equal('roomname@conference.domain-xmpp.ltd')
      args[5].should.equal('This is the message text')
      args[6].should.equal('groupchat')
      args[7].should.equal('w1')
      done()
    })
  })

  describe('Send a message', () => {
    it('Should call xmpp/client.send() with valid stanza', (done) => {
      const xmpp = require('./../lib/xmpp')(logger, config)
      xmpp.send('someone@domain-xmpp.ltd', 'This is the message text sent by bot', 'chat')
      sinon.assert.calledOnce(xmppSendStub)
      let stanza = xml(
        'message', {
          to: 'someone@domain-xmpp.ltd',
          type: 'chat'
        },
        xml(
          'body', {
          },
          'This is the message text sent by bot')
      )
      const args = xmppSendStub.args[0]
      args.should.have.length(1)
      args[0].should.deep.equal(stanza)
      done()
    })
  })

  describe('Close connection', () => {
    it('Should call xmpp/client.stop()', (done) => {
      const xmpp = require('./../lib/xmpp')(logger, config)
      xmpp.close()
      sinon.assert.calledOnce(xmppCloseStub)
      done()
    })
  })

  describe('XMPP server send an error', () => {
    before(() => {
      sinon.stub(process, 'exit')
    })
    after(() => {
      process.exit.restore()
    })
    it('Should log error and exit with 99 code', (done) => {
      let error = 'This the error text'
      simpleXmppEvents.emit('error', new Error(error))
      require('fs').readFile(config.logger.file.path + config.logger.file.filename, 'utf8', (err, data) => {
        if (err) {
          throw err
        }
        data.should.match(new RegExp('XMPP client encountered following error: ' + error + '\n$'))
        sinon.assert.calledWith(process.exit, 99)
        done()
      })
    })
  })
})
