/**
 * @file glyph
 * @author junmer
 */

var _ = require('lodash');
var isTtf = require('is-ttf');
var through = require('through2');
var TTF = require('fonteditor-ttf').TTF;
var TTFReader = require('fonteditor-ttf').TTFReader;
var TTFWriter = require('fonteditor-ttf').TTFWriter;
var b2ab = require('b3b').b2ab;
var ab2b = require('b3b').ab2b;

/**
 * basic chars
 *
 * "!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}"
 *
 * @type {string}
 */
var basicText = String.fromCharCode.apply(this, _.range(33, 126));


/**
 * getPureText
 *
 * @see https://msdn.microsoft.com/zh-cn/library/ie/2yfce773
 * @param  {string} str target text
 * @return {string}     pure text
 */
function getPureText(str) {

    return str.trim()
        .replace(/[\s]/g, '')
        // .replace(/[\f]/g, '')
        // .replace(/[\b]/g, '')
        // .replace(/[\n]/g, '')
        // .replace(/[\t]/g, '')
        // .replace(/[\r]/g, '')
        .replace(/[\u2028]/g, '')
        .replace(/[\u2029]/g, '');

}

/**
 * getUniqText
 *
 * @param  {string} str target text
 * @return {string}     uniq text
 */
function getUniqText(str) {
    return _.uniq(
        str.split('')
    ).join('');
}

/**
 * getStringGlyfs
 *
 * @param  {ttfObject} ttf ttfobj
 * @param  {string} str target string
 * @return {Array}     glyfs array
 */
function getStringGlyfs(ttf, str) {

    var glyphs = [];

    var indexList = ttf.findGlyf({
        unicode: str.split('').map(function(s) {
            return s.charCodeAt(0);
        })
    });

    if (indexList.length) {
        glyphs = ttf.getGlyf(indexList);
    }

    glyphs.unshift(ttf.get().glyf[0]);

    return glyphs;
}



/**
 * minifyTtf
 *
 * @param  {Object} ttfObject    ttfObject
 * @param  {string} text         text
 * @param  {boolean} useBasicText useBasicText
 * @param  {Function=} plugin       use plugin
 * @return {Object}              ttfObject
 */
function minifyTtf(ttfObject, text, useBasicText, plugin) {

    // check null
    if (!text) {
        return ttfObject;
    }

    // get pure text
    text = getPureText(text);

    // check null
    if (!text) {
        return ttfObject;
    }

    // uniq text
    text = getUniqText(text + (useBasicText ? basicText : ''));

    // new TTF Object
    var ttf = new TTF(ttfObject);

    // get target glyfs then set
    ttf.setGlyf(getStringGlyfs(ttf, text));

    // use plugin
    if (_.isFunction(plugin)) {
        plugin(ttf);
    }

    return ttf.get();
}

/**
 * glyph fontmin plugin
 *
 * @param {Object} opts
 * @param {string=} opts.text text
 * @param {boolean=} opts.useBasicText useBasicText
 * @param {Function=} opts.use plugin
 * @api public
 */
module.exports = function(opts) {
    opts = opts || {};

    return through.ctor({
        objectMode: true
    }, function(file, enc, cb) {

        // check null
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        // check stream
        if (file.isStream()) {
            cb(new Error('Streaming is not supported'));
            return;
        }

        // check ttf
        if (!isTtf(file.contents)) {
            cb(null, file);
            return;
        }

        // get ttf data from buffer
        var ttfObject = new TTFReader().read(b2ab(file.contents));

        try {

            // minify and toArrayBuffer
            var ttfBuffer = new TTFWriter().write(
                minifyTtf(
                    ttfObject,
                    opts.text,
                    opts.useBasicText,
                    opts.use
                )
            );

            // write file buffer
            file.contents = ab2b(ttfBuffer);

            cb(null, file);

        }
        catch (err) {
            cb(err);
        }

    });

};


// exports
module.exports.basicText = basicText;
module.exports.getPureText = getPureText;
module.exports.getUniqText = getUniqText;