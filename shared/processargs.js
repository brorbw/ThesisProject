//this is a module for reading commandline arguments
module.exports.args = function(){
    var tmp = process.argv;
    tmp.splice(0,2);
    return tmp;
};
