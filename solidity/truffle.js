const fs = require('fs')

// First read in the secrets.json to get our mnemonic
let secrets
let mnemonic
if (fs.existsSync('secrets.json')) {
  secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'))
  mnemonic = secrets.mnemonic
} else {
  console.log('No secrets.json found. If you are trying to publish EPM ' +
              'this will fail. Otherwise, you can ignore this message!')
  mnemonic = ''
}

module.exports = {
  networks: {
    development: {
      network_id: "*",
      port: 8545,
      host: "192.168.1.115",
      // special to your gas limit
      gasLimit: 9730456,
    },
    privateNet: {
      network_id: "10",
      port: 8545,
      host: "192.168.1.115",
      // special to your gas limit
      gasLimit: 9730456,
    }
  }
}
