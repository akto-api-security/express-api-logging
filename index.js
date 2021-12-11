const { Kafka } = require('kafkajs')

let messages = []

function init(topic, akto_account_id, limit) {
    return function(req, res, next) {
        const oldWrite = res.write;
        const oldEnd = res.end;

        const chunks = [];

        res.write = (...restArgs) => {
            chunks.push(Buffer.from(restArgs[0]));
            oldWrite.apply(res, restArgs);
        };

        res.end = async (...restArgs) => {
            if (restArgs[0]) {
                chunks.push(Buffer.from(restArgs[0]));
            }

            try {
                var contentType = res.getHeaders()['content-type'];
                if (contentType != null && contentType.includes("application/json")) {
                    const logJson = generateLog(req,res, chunks, akto_account_id);
                    messages.push({value: logJson})
                    l = messages.length
                    if (l >= limit) {
                        sendToKafka(req.app.locals.akto_kafka_producer, topic, messages.splice(0,limit)).catch((e) => {
                            console.error(e);
                        })
                    }
                }
            } catch (error) {
                console.error(error);
            }

            oldEnd.apply(res, restArgs);
        };

        next();
    }
}

function generateLog(req, res, chunks, akto_account_id) {
    const body = Buffer.concat(chunks).toString('utf8');
    var value = {
        path: req.originalUrl,
        requestHeaders: JSON.stringify(req.headers),
        responseHeaders:JSON.stringify(res.getHeaders()),
        method: req.method,
        requestPayload: JSON.stringify(req.body),
        responsePayload: body,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        time: Math.round(Date.now() / 1000) + "",
        statusCode: res.statusCode + "",
        type: "HTTP/" + req.httpVersion,
        status: res.statusMessage,
        akto_account_id: akto_account_id,
        contentType: res.getHeaders()['content-type'],
    };

    return JSON.stringify(value);

}

async function sendToKafka(producer, topic, messages) {
    await producer.send({
        topic: topic,
        messages: messages,
    })
}

function getKafkaProducer(clientId, brokers) {
    const kafka = new Kafka({
        clientId: clientId,
        brokers: brokers,
    })
    
    return kafka.producer()

}

exports.init = init
exports.getKafkaProducer = getKafkaProducer


