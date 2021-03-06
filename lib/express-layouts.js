/*jslint sloppy:true indent:2 plusplus:true regexp:true*/

var contentPattern = '&&<>&&';

function contentFor(contentName) {
  return contentPattern + contentName + contentPattern;
}

function parseContents(locals) {
  var name, i = 1, str = locals.body,
    regex = new RegExp('\n?' + contentPattern + '.+?' + contentPattern + '\n?', 'g'),
    split = str.split(regex),
    matches = str.match(regex);

  locals.body = split[0];

  if (matches !== null) {
    matches.forEach(function (match) {
      name = match.split(contentPattern)[1];
      locals[name] = split[i];
      i++;
    });
  }
}

function parseScripts(locals) {
  var str = locals.body, regex = /\<script(.|\n)*?\>(.|\n)*?\<\/script\>/g;

  if (regex.test(str)) {
    locals.body = str.replace(regex, '');
    locals.script = str.match(regex).join('\n');
  }
}

function parseStyles(locals) {
  var str = locals.body, regex = /(?:\<style(.|\n)*?\>(.|\n)*?\<\/style\>)|(?:\<link(.|\n)*?\>(?:\<\/link\>)?)/g;

  if (regex.test(str)) {
    locals.body = str.replace(regex, '');
    locals.style = str.match(regex).join('\n');
  }
}

function parseMetas(locals) {
  var str = locals.body, regex = /\<meta(.|\n)*?\>/g;

  if (regex.test(str)) {
    locals.body = str.replace(regex, '');
    locals.meta = str.match(regex).join('\n');
  }
}

module.exports = function (req, res, next) {
  var render = res.render;

  res.render = function (view, options, fn) {
    var layout, self = this, app = req.app,
      defaultLayout = app.get('layout');

    options = options || {};
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    if (options.layout === false || ((options.layout || defaultLayout) === false)) {
      render.call(res, view, options, fn);
      return;
    }

    layout = options.layout || res.locals.layout || defaultLayout;
    if (layout === true || layout === undefined) {
      layout = 'layout';
    }

    options.contentFor = contentFor;
    render.call(res, view, options, function (err, str) {
      var l, locals;

      if (err) { return fn ? fn(err) : next(err); }

      locals = {
        body: str,
        defineContent: function(contentName) { return locals[contentName] || ''; }
      };
      for (l in options) {
        if (options.hasOwnProperty(l) && l !== 'layout' && l !== 'contentFor') {
          locals[l] = options[l];
        }
      }

      if (options.extractScripts === true || (options.extractScripts === undefined && app.get('layout extractScripts') === true)) {
        locals.script = '';
        parseScripts(locals);
      }

      if (options.extractStyles === true || (options.extractStyles === undefined && app.get('layout extractStyles') === true)) {
        locals.style = '';
        parseStyles(locals);
      }

      if (options.extractMetas === true || (options.extractMetas === undefined && app.get('layout extractMetas') === true)) {
        locals.meta = '';
        parseMetas(locals);
      }

      parseContents(locals);
      render.call(self, layout, locals, fn);
    });
  };
  next();
};
