/*!
 * Modified from md.js is a lightweight markdown parser
 * https://github.com/thysultan/md.js
 * 
 * @licence MIT
 */
var unicodes = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '&': '&amp;',
  '[': '&#91;',
  ']': '&#93;',
  '(': '&#40;',
  ')': '&#41;',
};

var resc = /[<>&\(\)\[\]"']/g;

function unicode (char) { return unicodes[char] || char; }

var XSSFilterRegExp = /<(script)[^\0]*?>([^\0]+?)<\/(script)>/gmi;
var XSSFilterTemplate = '&lt;$1&gt;$2&lt;/$3&gt;';

var XSSFilterInlineJSRegExp = /(<.*? [^\0]*?=[^\0]*?)(javascript:.*?)(.*>)/gmi;
var XSSFilterInlineJSTemplate = '$1#$2&#58;$3';

var XSSFilterImageRegExp = /<img([^\0]*?onerror=)([^\0]*?)>/gmi;
var XSSFilterImageTemplate = function (match, group1, group2) {
  return '<img' + group1 + group2.replace(resc, unicode) + '>';
};

var removeTabsRegExp = /^[\t ]+|[\t ]$/gm;

var htmlFilterRegExp = /(<.*>[\t ]*\n^.*)/gm;
var htmlFilterTemplate = function (match, group1) { 
  return group1.replace(/^\n|$\n/gm, '');
};

var cssFilterRegExp = /(<style>[^]*<\/style>)/gm;
var cssFilterTemplate = htmlFilterTemplate;

var eventsFilterRegExp = /(<[^]+?)(on.*?=.*?)(.*>)/gm;
var eventsFilterTemplate = '$1$3';

var blockQuotesRegExp = /^[ \t]*> (.*)/gm;
var blockQuotesTemplate = '<blockquote>$1</blockquote>';

var inlineCodeRegExp = /`([^`]+?)`/g;
var inlineCodeTemplate = function (match, group1) {
  return '<code>'+group1.replace(resc, unicode)+'</code>'
}

var blockCodeRegExp = /```(.*)\n([^\0]+?)```(?!```)/gm;

var imagesRegExp = /!\[(.*)\]\((.*)\)/g;
var imagesTemplate = function (match, group1, group2) {
  var src = group2.replace(resc, unicode);
  var alt = group1.replace(resc, unicode);

  return '<img src="'+src+'" alt="'+alt+'">';
};

var headingsRegExp = /^(#+) +(.*)/gm;
var headingsTemplate = function (match, hash, content) {
  var length = hash.length; return '<h'+length+'>'+content+'</h'+length+'>';
};

var headingsCommonh2RegExp = /^([^\n\t ])(.*)\n----+/gm;
var headingsCommonh1RegExp = /^([^\n\t ])(.*)\n====+/gm;
var headingsCommonh1Template = '<h1>$1$2</h1>';
var headingsCommonh2Template = '<h2>$1$2</h2>';

var paragraphsRegExp = /^([^-><#\d\+\_\*\t\n\[\! \{])([^]*?)(|  )(?:\n\n)/gm;
var paragraphsTemplate = function (match, group1, group2, group3) {
  var leadingCharater = group1;
  var body = group2;
  
  var trailingSpace = group3 ? '\n<br>\n' : '\n';
  return '<p>'+leadingCharater+body+'</p>'+trailingSpace;
};

var horizontalRegExp = /^.*?(?:---|\*\*\*|- - -|\* \* \*)/gm;
var horizontalTemplate = '<hr>';

var strongRegExp = /(?:\*\*|\_\_)([^\*\n_]+?)(?:\*\*|\_\_)/g;
var strongTemplate = '<strong>$1</strong>';

var emphasisRegExp = /(?:\*|\_)([^\*\n_]+?)(?:\*|\_)/g;
var emphasisTemplate = '<em>$1</em>';

var strikeRegExp = /(?:~~)([^~]+?)(?:~~)/g;
var strikeTemplate = '<del>$1</del>';

var linksRegExp = /\[(.*?)\]\(([^\t\n ]*)(?:| "(.*)")\)+/gm;
var linksTemplate = function (match, group1, group2, group3) {
  var link = group2.replace(resc, unicode);
  var text = group1.replace(resc, unicode);
  var title = group3 ? ' title="'+group3.replace(resc, unicode)+'"' : '';

  return '<a href="'+link+'"'+title+'>'+text+'</a>';
};


var listRegExp = /^([\t ]*)(?:(-|\+|\*)|(\d+(?:\)|\.))) (.*)/gm;
var listTemplate = function(match, leading, bullet, numbered, content) {
  leading = leading.replace(/  /g, '\t');
  const type = numbered ? 'o' : 'u';
  return `${leading}<${type}l><li>${content}</li></${type}l>`;
}

var combineSequentialUlRegExp = /(<\/ul>\n?\s*<ul>)+?/g;
var combineSequentialOlRegExp = /(<\/ol>\n?\s*<ol>)+?/g;

var lineBreaksRegExp = /^\n\n+/gm;
var lineBreaksTemplate = '<br>';

var checkBoxesRegExp = /\[( |x)\]/g;
var checkBoxesTemplate = function (match, group1) {
  return '<input type="checkbox" disabled' + (group1.toLowerCase() === 'x' ? ' checked' : '') + '>'
};


/**
 * markdown parser
 * 
 * @param  {string} markdown
 * @return {string}
 */
export default function md (markdown) {
  if (!markdown) {
    return '';
  }

  var code = [];
  var index = 0;
  var length = markdown.length;

  // to allow matching trailing paragraphs
  if (markdown[length-1] !== '\n' && markdown[length-2] !== '\n') {
    markdown += '\n\n';
  }

  // format, removes tabs, leading and trailing spaces
  markdown = (
    markdown
      // collect code blocks and replace with placeholder
      // we do this to avoid code blocks matching the paragraph regexp
      .replace(blockCodeRegExp, function (match, lang, block) {
        var placeholder = '{code-block-'+index+'}';
        var regex = new RegExp('{code-block-'+index+'}', 'g');

        code[index++] = {lang: lang, block: block.replace(resc, unicode), regex: regex};

        return placeholder;
      })
      // XSS script tags
      .replace(XSSFilterRegExp, XSSFilterTemplate)
      // XSS image onerror
      .replace(XSSFilterImageRegExp, XSSFilterImageTemplate)
      // filter events
      .replace(eventsFilterRegExp, eventsFilterTemplate)
      // blockquotes
      .replace(blockQuotesRegExp, blockQuotesTemplate)
      // images
      .replace(imagesRegExp, imagesTemplate)
      // headings
      .replace(headingsRegExp, headingsTemplate)
      // headings h1 (commonmark)
      .replace(headingsCommonh1RegExp, headingsCommonh1Template)
      // headings h2 (commonmark)
      .replace(headingsCommonh2RegExp, headingsCommonh2Template)
      // horizontal rule 
      .replace(horizontalRegExp, horizontalTemplate)
      // checkboxes
      .replace(checkBoxesRegExp, checkBoxesTemplate)
      // filter html
      .replace(htmlFilterRegExp, htmlFilterTemplate)
      // filter css
      .replace(cssFilterRegExp, cssFilterTemplate)
      // paragraphs
      .replace(paragraphsRegExp, paragraphsTemplate)
      // inline code
      .replace(inlineCodeRegExp, inlineCodeTemplate)
      // links
      .replace(linksRegExp, linksTemplate)
      // lists
      .replace(listRegExp, listTemplate)
  );
  // This handles *almost* all combinations, but some indented lists combining ul & ol don't render right
  var indentListRegExp = /<\/li><\/(u|o)l>\n(\t+)<(u|o)l><li>(.*)<\/li><\/(u|o)l>/;
  while (markdown.match(indentListRegExp)) {
    markdown = markdown.replace(indentListRegExp, function(match, parentEnd, tabs, childStart, content, childEnd) {
      if (tabs.length > 0) {
        tabs = tabs.substring(1);
        if (tabs.length > 0) tabs = '\n' + tabs;
      }
      return `${tabs}<${childStart}l><li>${content}</li></${childEnd}l></li></${parentEnd}l>`;
    })
  }
  markdown = (
    markdown
      // Combine lists
      .replace(combineSequentialUlRegExp, '')
      .replace(combineSequentialOlRegExp, '')
      // tabs
      .replace(removeTabsRegExp, '')
      // strong
      .replace(strongRegExp, strongTemplate)
      // emphasis
      .replace(emphasisRegExp, emphasisTemplate)
      // strike through
      .replace(strikeRegExp, strikeTemplate)
      // line breaks
      .replace(lineBreaksRegExp, lineBreaksTemplate)
      // filter inline js
      .replace(XSSFilterInlineJSRegExp, XSSFilterInlineJSTemplate)
  );

  // replace code block placeholders
  for (var i = 0; i < index; i++) {
    var item = code[i];
    var lang = item.lang;
    var block = item.block;

    markdown = markdown.replace(item.regex, function (match) {
      return `<pre><code${lang ? ' class="language-'+lang+'"' : ''}>${block}</code></pre>`;
    });
  }

  return markdown.trim();
}