const crypto = require('crypto');
const BITS_IN_BYTE = 8;


function randomString(length){
    return crypto.randomBytes(length).toString('base64');
}

function generateKey(length){
    return crypto.randomBytes(length).toString('hex');
}

function randomIV(length){
    return crypto.randomBytes(length).toString('base64'); 
}

function encrypt(key, keyLength, iv, plaintext) {
		const ptBuf = Buffer.from(plaintext, 'utf8');
    const ivBuf = Buffer.from(iv, 'base64');

		const cipher = crypto.createCipheriv(`aes${keyLength}`,
                                         parseKey(key,keyLength),
                                         ivBuf);

		const ctBuf = Buffer.concat([cipher.update(ptBuf), cipher.final()]);

		return ctBuf.toString('base64');
	}

function decrypt(key, keyLength, iv, ciphertext){
		const ivBuf = Buffer.from(iv, 'base64');
		const ctBuf = Buffer.from(ciphertext, 'base64');

		const decipher = crypto.createDecipheriv(`aes${keyLength}`,
                                             parseKey(key,keyLength),
                                             ivBuf);

		const ptBuf = Buffer.concat([decipher.update(ctBuf), decipher.final()]);

		return ptBuf.toString('utf8');
	}


function parseKey(key, expectedSize){
	let buf;

	if (key instanceof Buffer) {
		buf = key;
	} else {
		if (!key.match(/^([0-9a-f]{2})+$/i))
		  throw new Error('invalid_key_hex'); 

		buf = Buffer.from(key, 'hex');
	}

	if (buf.length !== expectedSize/BITS_IN_BYTE)
		throw new Error('wrong_key_length');

	return buf;
}
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
module.exports.randomString = randomString;
module.exports.generateKey = generateKey;
module.exports.randomIV = randomIV;
