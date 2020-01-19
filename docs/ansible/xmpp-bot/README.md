Ansible Role: XMPP Bot
======================

Install XMPP Bot:

-   install [Node.js](https://nodejs.org/),
-   install npm,
-   download archive,
-   install dependencies,
-   create service user,
-   set [configuration](https://github.com/nioc/xmpp-bot#configuration),
-   add as a systemd service.

Requirements
------------

-   Ansible >= 2.9,
-   a working XMPP server.

Role Variables
--------------

These variables are installation related and should be checked/updated before use:

- `xmppbot_install_nodejs`: Does NodeJS should be installed, set `false` if already present, default: `true`,
- `nodejs_repo`: NodeJS version to install, default: `node_12.x`.
- `domain`: your domain name (not a role variable but **must be set** in your playbook/host), no default,

For variables in `webhooks config`, `XMPP server config`, `outgoing webhooks config` sections, please see [configuration](https://github.com/nioc/xmpp-bot#configuration).


Dependencies
------------

None.

Example Playbook
----------------

    - hosts: servers
      vars:
        domain: mydomain.ltd
      roles:
      - name: xmpp-bot
        xmppbot_incoming_webhooks:
        - path: /webhooks/alerting
          action: send_xmpp_message

License
-------

AGPL-3.0-or-later

Author Information
------------------

This role was created in 2020 by [Nioc](https://github.com/nioc).
