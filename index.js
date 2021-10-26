const fs = require('fs')
const { Kafka } = require('kafkajs')
const amqplib = require('amqplib');


function init(brokers, topic) {
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
                const logJson = generateLog(req,res, chunks);
                await sendToKafka(brokers,topic, logJson)
                
            } catch (error) {
                console.log(error);
            }
            oldEnd.apply(res, restArgs);
        };

        next();
    }
}

function generateLog(req, res, chunks) {
    const body = Buffer.concat(chunks).toString('utf8');
    var value = {
        path: req.originalUrl,
        requestHeaders: req.headers,
        responseHeaders:res.getHeaders(),
        method: req.method,
        requestPayload: req.body,
        responsePayload: body,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        time: new Date().valueOf(),
        statusCode: res.statusCode,
    };

    return JSON.stringify(value);

}

async function sendToKafka(brokers, topic,message) {
    const kafka = new Kafka({
        clientId: 'my-app',
        brokers: brokers,
    })
    const producer = kafka.producer()

    await producer.connect()
    await producer.send({
        topic: topic,
        messages: [{ value: message},],
    })

    await producer.disconnect()
}

exports.init = init


