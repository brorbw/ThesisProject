var assert = require('assert');

describe('Basic mocha Srting Test', function (){
    it('should return numbre of characters in a string', function(){
        assert.equal("Hello".length,4);
    });
    it('should return firs character of the srting',function (){
        assert.equal("Hello".charAt(0),'H');
    });
});
