const net = require('net')

const radomPort = () =>
    new Promise((resolve, reject) => {
        const server = net.createServer()
        let port
        server.on('listening', () => {
            port = server.address().port
            server.close(() => {
                resolve(port)
            })
        })
        server.on('error', reject)
        server.listen(0)
    })

module.exports = radomPort
