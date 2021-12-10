# express-api-logging

HTTP request-response logger for express.js.


```

const express = require('express')
const akto_log = require("express-api-logging")

const app = express();
app.use(akto_log.init([<host:port>],<topic>, <akto_account_id>))

```


