const crypto = require('crypto');

module.exports.generateRandomString = (len) => {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
};

module.exports.generateRandomNumber = (len) => {
  const character = '0123456789';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += character.charAt(Math.floor(Math.random() * character.length));
  }
  return res;
};
