const fs = require('fs')
const { Kafka } = require('kafkajs')

let messages = []

function init(brokers, topic, akto_account_id) {
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
                const logJson = generateLog(req,res, chunks, akto_account_id);
                messages.push({value: logJson})
                l = messages.length
                if (l >= 20) {
                    await sendToKafka(req.app.locals.producer, topic, messages.splice(0,20))
                }
                
            } catch (error) {
                console.log(error);
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
        requestHeaders: req.headers,
        responseHeaders:res.getHeaders(),
        method: req.method,
        requestPayload: JSON.stringify(req.body),
        responsePayload: body,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        time: new Date().valueOf(),
        statusCode: res.statusCode,
        type: "HTTP/" + req.httpVersion,
        url: req.protocol + '://' + req.get('host') + req.originalUrl,
        status: res.statusMessage,
	akto_account_id: akto_account_id
    };

    return JSON.stringify(value);

}

async function sendToKafka(producer, topic, messages) {
    await producer.send({
        topic: topic,
        messages: messages,
    })
}

exports.init = init


