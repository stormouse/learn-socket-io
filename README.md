# learn-socket-io

## Configure MongoDB on Local Machine

- Install latest version of MongoDB
- Start MongoDB service and login with mongo in command line or bash
- Create admin users (ref: https://docs.mongodb.com/manual/reference/method/db.createUser/)
    - Set password of developer as "password" to use auto migration code in the future.

```
use admin

db.createUser({
    user: "admin",
    pwd: "your admin pwd",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

db.createUser({
    user: "developer",
    pwd: "password",
    roles: [ { role: "readWriteAnyDatabase", db: "admin" } ]
})
```

- Open mongod.conf with root/admin privilege of your OS, add following lines:

```
security:
  authorization: enabled
```

- Restart mongod service
- Login mongodb with `mongo -u developer -p`

