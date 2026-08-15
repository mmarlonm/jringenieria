import base64

start_script = """#!/bin/bash
rm -f /var/run/supervisor.sock
rm -rf /var/run/rabbitmq/*
rm -rf /var/lib/rabbitmq/mnesia/*
mkdir -p /var/log/onlyoffice/documentserver/adminpanel /var/log/onlyoffice/documentserver/docservice /var/log/onlyoffice/documentserver/converter /var/log/onlyoffice/documentserver/metrics /var/log/onlyoffice/documentserver-example
touch /var/log/onlyoffice/documentserver/docservice/out.log /var/log/onlyoffice/documentserver/docservice/err.log /var/log/onlyoffice/documentserver/converter/out.log /var/log/onlyoffice/documentserver/converter/err.log

python3 -c "import json; open('/etc/onlyoffice/documentserver/log4js/production.json', 'w').write(json.dumps({'appenders': {'console': {'type': 'console'}}, 'categories': {'default': {'appenders': ['console'], 'level': 'WARN'}}}))"

python3 -c "import json; open('/etc/onlyoffice/documentserver/local.json', 'w').write(json.dumps({'services': {'CoAuthoring': {'token': {'enable': {'request': {'inbox': True, 'outbox': True}, 'browser': True}, 'inbox': {'header': 'Authorization'}, 'outbox': {'header': 'Authorization'}}, 'secret': {'inbox': {'string': 'MiClaveSuperSecretaParaOnlyOfficeDocs2025'}, 'outbox': {'string': 'MiClaveSuperSecretaParaOnlyOfficeDocs2025'}, 'session': {'string': 'MiClaveSuperSecretaParaOnlyOfficeDocs2025'}, 'browser': {'string': 'MiClaveSuperSecretaParaOnlyOfficeDocs2025'}}}}, 'storage': {'fs': {'secretString': 'MiClaveSuperSecretaParaOnlyOfficeDocs2025'}}}))"

cat << 'EOF' > /etc/nginx/conf.d/ds.conf
include /etc/nginx/includes/http-common.conf;
server {
  listen 0.0.0.0:80;
  listen [::]:80 default_server;
  server_tokens off;
  
  set $secure_link_secret MiClaveSuperSecretaParaOnlyOfficeDocs2025;
  include /etc/nginx/includes/ds-*.conf;
}
EOF

cp /etc/nginx/conf.d/ds.conf /etc/onlyoffice/documentserver/nginx/ds.conf

chown -R ds:ds /var/log/onlyoffice /etc/onlyoffice /var/lib/onlyoffice
chmod -R 777 /var/log/onlyoffice /etc/onlyoffice /var/lib/onlyoffice
service postgresql start
service redis-server start
service rabbitmq-server start
service nginx start
sleep 3
exec supervisord -n -c /etc/supervisor/supervisord.conf
"""

with open('/start.sh', 'w') as f:
    f.write(start_script)
