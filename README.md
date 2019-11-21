# XMPP Bot

[![license: AGPLv3](https://img.shields.io/badge/license-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub release](https://img.shields.io/github/release/nioc/xmpp-bot.svg)](https://github.com/nioc/xmpp-bot/releases/latest)
[![Build Status](https://travis-ci.org/nioc/xmpp-bot.svg?branch=master)](https://travis-ci.org/nioc/xmpp-bot)
[![Coverage Status](https://coveralls.io/repos/github/nioc/xmpp-bot/badge.svg?branch=master)](https://coveralls.io/github/nioc/xmpp-bot?branch=master)

XMPP Bot is a tiny little bot making the link between XMPP conversations and webhooks.

User &rlarr; XMPP client &rlarr; XMPP Server &rlarr; **XMPP Bot** &rlarr; REST API

## Key features

-   Call outgoing webhook on XMPP incoming messages from user chat or group chat (Multi-user chat "MUC"),
-   Send message templates (with values to apply to variables in that template) to user or room (MUC) on incoming authorized (basic or bearer) webhook.

## Installation

-   Install [Node.js](https://nodejs.org/):
    ```shell
    curl -sL https://deb.nodesource.com/setup_10.x | bash -
    apt-get install -y nodejs
    ```

-   Install npm:
    ```shell
    npm install npm@latest -g
    ```

-   Clone repository:
    ```shell
    git clone https://github.com/nioc/xmpp-bot.git /usr/local/bin/xmpp-bot/
    ```

-   Install dependency:
    ```shell
    cd /usr/local/bin/xmpp-bot/ && npm install --production
    ```

-   Create run user (optionnal):
    ```
    useradd -r -s /bin/false xmpp-bot
    chown xmpp-bot:xmpp-bot /usr/local/bin/xmpp-bot/lib -R
    ```

-   Set [configuration](#configuration) in `/lib/config/config.json` (you can copy `config.json.dist`)

-   Add systemd service from [model](/docs/xmpp-bot.service):
    ```shell
    cp docs/xmpp-bot.service /etc/systemd/system/xmpp-bot.service
    ```

-   Update systemd:
    ```shell
    systemctl daemon-reload
    ```

-   Start service:
    ```shell
    systemctl start xmpp-bot
    ```

-   Start service at boot:
    ```shell
    systemctl enable xmpp-bot
    ```

-   Add fail2ban filter from [model](/docs/xmpp-bot.conf) (optionnal):
    ```shell
    cp docs/xmpp-bot.conf /etc/fail2ban/filter.d/xmpp-bot.conf
    ```
    Add the jail (`/etc/fail2ban/jail.local`):
    ```properties
    [xmpp-bot]
    enabled  = true
    port     = http,https
    filter   = xmpp-bot
    logpath  = /var/log/xmpp-bot/webhook.log
    maxretry = 3
    bantime  = 21600 ; 6 hours
    ```

## Configuration

### Logger

-    `level` log4js level (all < trace < debug < info < warn < error < fatal < mark < off)
-    `file`, `console` and `stdout` define log appenders (see [log4js doc](https://log4js-node.github.io/log4js-node/appenders.html))

### Webhooks listener

-    `path` and `port` define the listening endpoint
-    `ssl` define key and certificat location and port used for exposing in https, make sure that user of the process is allowed to read cert
-    `users` is an array of user/password for basic authentication
-    `accessLog` define the listener logger

### XMPP Server

-    `service` and `domain` define XMPP server
-    `username` and `password` define XMPP "bot" user credentials
-    `rooms` list rooms (and optionnal password) where bot will listen

### Incoming webhooks (list)

-    `path` is the webhook key:a POST request on this path will trigger corresponding `action`
-    `action` among enumeration:
     -    `send_xmpp_message` will send message (`message` in request body) to `destination` (from request body) ; if `destination` is found in `config.xmppServer.rooms` array, message will send as a groupchat). Request exemple:

            ```http
            POST /webhooks/w1 HTTP/1.1
            Host: domain.ltd:8000
            Content-Type: application/json
            Authorization: Basic dXNlcjE6cGFzczE=
            Content-Length: 70

            {
                "destination":"me@domain.ltd",
                "message":"Hi, there something wrong."
            }
            ```

     -    `send_xmpp_template` will send template with merged variables (using JMESPath) to `destination` (user or room if `type` set to `chat` or `groupchat`)

### XMPP hooks (list)

-    `room` is the XMPP hook key: an incoming groupchat (or chat) from this room (or this user) will trigger corresponding `action`
-    `action` among enumeration:
     -    `outgoing_webhook` will execute a request to corresponding webhook with `args` as webhook code

## Credits

-   **[Nioc](https://github.com/nioc/)** - _Initial work_

See also the list of [contributors](https://github.com/nioc/xmpp-bot/contributors) to this project.

This project is powered by the following components:

-   [node-simple-xmpp](https://github.com/simple-xmpp/node-simple-xmpp) (MIT)
-   [express](https://github.com/expressjs/express) (MIT)
-   [body-parser](https://github.com/expressjs/body-parser) (MIT)
-   [express-basic-auth](https://github.com/LionC/express-basic-auth) (MIT)
-   [morgan](https://github.com/expressjs/morgan) (MIT)
-   [jmespath.js](https://github.com/jmespath/jmespath.js) (Apache-2.0)
-   [request](https://github.com/request/request) (Apache-2.0)
-   [node-cleanup](https://github.com/jtlapp/node-cleanup) (MIT)
-   [log4js-node](https://github.com/log4js-node/log4js-node) (Apache-2.0)

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE.md) file for details
