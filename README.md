# express-api-logging

HTTP request-response logger for express.js.


```

const express = require('express')
const akto_log = require("express-api-logging")

const app = express();

// middleware is being used
// takes 3 params: Kafka Topic Name, Akto Account ID, Limit
// limit: how many messages it should buffer before sending to Kafka
app.use(akto_log.init("akto.api.logs","1000000", 200))

// make sure to set AKTO_CONNECT_IP as env variable
const broker_id = process.env.AKTO_CONNECT_IP
// getKafkaProducer takes 2 params: clientID (not important can be set to your org name) and brokerID list
let producer = akto_log.getKafkaProducer('my-app', [broker_id])

// this makes sure that only once it connects to kafka the listening start
producer.connect().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}!`);
  });
  // make sure to add producer to app.locals so that akto-express-library doesn't have to make new connection for every api request
  app.locals.akto_kafka_producer = producer;
});
```


