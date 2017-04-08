COMPONENT('exec', function() {
	var self = this;
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', self.attr('data-selector') || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('error', function() {
	var self = this;

	self.readonly();

	self.make = function() {
		self.classes('ui-error hidden');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			self.toggle('hidden', true);
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<div><span class="fa fa-times-circle"></span>{0}</div>'.format(value[i].error));

		self.html(builder.join(''));
		self.toggle('hidden', false);
	};
});

COMPONENT('search', function() {

	var self = this;
	var options_class;
	var options_selector;
	var options_attribute;
	var options_delay;

	self.readonly();
	self.make = function() {
		options_class = self.attr('data-class') || 'hidden';
		options_selector = self.attr('data-selector');
		options_attribute = self.attr('data-attribute') || 'data-search';
		options_delay = (self.attr('data-delay') || '200').parseInt();
	};

	self.setter = function(value) {

		if (!options_selector || !options_attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toSearch();
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				setTimeout(next, 3);
			}, function() {

				hide.forEach(function(item) {
					item.toggleClass(options_class, true);
				});

				show.forEach(function(item) {
					item.toggleClass(options_class, false);
				});
			});

		}, options_delay, 'search' + self.id);
	};
});

COMPONENT('binder', function() {

	var self = this;
	var keys;
	var keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			template.value = value;
			item.classes && classes(item.element, item.classes(value));
			item.visible && item.element.toggleClass('hidden', item.visible(value) ? false : true);
			item.html && item.element.html(item.html(value));
			item.template && item.element.html(item.template(template));
		});
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.removeClass(rem);
		add && element.addClass(add);
	}

	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attr('data-b');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-b-class');
			var html = el.attr('data-b-html');
			var visible = el.attr('data-b-visible');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? FN(decode(classes)) : undefined;
				obj.html = html ? FN(decode(html)) : undefined;
				obj.visible = visible ? FN(decode(visible)) : undefined;

				if (obj.html) {
					var tmp = el.find('script[type="text/html"]');
					var str = '';
					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.template = Tangular.compile(str);
						tmp.length && tmp.remove();
					}
				}

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}

		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, self.get(key));
		});

		return self;
	};

});

COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('ui-confirm hidden', true);
		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'BUTTON')
				return;
			var el = self.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
		});

		$(window).on('keydown', function(e) {
			if (!visible)
				return;
			var index = e.keyCode === 13 ? 0 : e.keyCode === 27 ? 1 : null;
			index != null && self.find('button[data-index="{0}"]'.format(index)).trigger('click');
			e.preventDefault();
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.classes('-ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.classes('-hidden');
		setTimeout2(self.id, function() {
			visible = true;
			self.classes('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attr('data-path'), '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				!component.element.hasClass('hidden') && component.resize();
			});
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hasClass('ui-form-container-padding') || el.hasClass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.addClass(cls);
			setTimeout(function() {
				form.removeClass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = self.cancel = function() { self.hide(); };
	self.onHide = function(){};

	self.hide = function() {
		self.set('');
		self.onHide();
	};

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();
		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var width = self.attr('data-width') || '800px';
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-path="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.path, self.attr('data-title')));

		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.classes('-hidden');
		self.element = el;

		self.event('scroll', function() {
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		enter === 'true' && self.event('keydown', 'input[type="text"]', function(e) {
			e.keyCode === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(self.hide);
		});
	};

	self.setter = function() {

		setTimeout2('noscroll', function() {
			$('html').toggleClass('noscroll', $('.ui-form-container').not('.hidden').length ? true : false);
		}, 50);

		var isHidden = !EVALUATE(self.path, self.condition);
		self.toggle('hidden', isHidden);
		EMIT('reflow', self.name);

		if (isHidden) {
			self.release(true);
			self.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		var el = self.find('input[type="text"],select,textarea');
		el.length && el.eq(0).focus();

		window.$$form_level++;
		self.css('z-index', window.$$form_level * 10);
		self.element.scrollTop(0);

		setTimeout(function() {
			self.find('.ui-form').addClass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.id, function() {
			self.css('z-index', (window.$$form_level * 10) + 1);
		}, 1000);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-loading');
		self.append('<ul><li class="a"></li><li class="b"></li><li class="c"></li><li class="d"></li><li class="e"></li></ul>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.toggle('hidden', false);
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.toggle('hidden', true);
		}, timeout || 1);
		return self;
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()));
		}

		self.html(builder);
		recompile && jC.compile();
	};
});

COMPONENT('repeater-group', function() {

	var self = this;
	var html;
	var template_group;
	var group;

	self.readonly();

	self.released = function(is) {
		if (is) {
			html = self.html();
			self.empty();
		} else
			html && self.html(html);
	};

	self.make = function() {
		group = self.attr('data-group');
		self.element.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
		});
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		html = '';
		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][group];
			if (!name)
				name = '0';

			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.sort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				tmp += self.template(item).replace(/\$index/g, index.toString()).replace(/\$/g, self.path + '[' + index + ']');
			}

			if (key !== '0') {
				var options = {};
				options[group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.empty().append(builder);
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var validation = self.attr('data-validate');
	var input;
	var container;

	self.validate = function(value) {

		if (input.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return validation ? self.evaluate(value, validation, true) ? true : false : value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-textbox-label').toggleClass('ui-textbox-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-jc-keypress', self.attr('data-jc-keypress'));
		attrs.attr('data-jc-keypress-delay', self.attr('data-jc-keypress-delay'));
		attrs.attr('data-jc-bind', '');
		attrs.attr('name', self.path);

		tmp = self.attr('data-align');
		tmp && attrs.attr('class', 'ui-' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var increment = self.attr('data-increment') === 'true';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';
		else if (self.type === 'search') {
			icon2 = 'fa-search ui-textbox-control-icon';
			self.event('click', '.ui-textbox-control-icon', function() {
				self.$stateremoved = false;
				$(this).removeClass('fa-times').addClass('fa-search');
				self.set('');
			});
			self.getter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').toggleClass('fa-times', value ? true : false).toggleClass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');
		increment && self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			var el = $(this);
			var inc = -1;
			if (el.hasClass('fa-caret-up'))
				inc = 1;
			self.change(true);
			self.inc(inc);
		});

		self.type === 'date' && self.event('click', '.fa-calendar', function(e) {
			e.preventDefault();
			window.$calendar && window.$calendar.toggle($(this).parent().parent(), self.find('input').val(), function(date) {
				self.set(date);
			});
		});

		if (!content.length) {
			self.classes('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(isRequired ? ' ui-textbox-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.classes('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', invalid);
	};
});

COMPONENT('importer', function() {
	var self = this;
	var imported = false;
	var reload = self.attr('data-reload');

	self.readonly();
	self.setter = function() {

		if (!self.evaluate(self.attr('data-if')))
			return;

		if (imported) {
			if (reload)
				return EXEC(reload);
			self.setter = null;
			return;
		}

		imported = true;
		IMPORT(self.attr('data-url'), function() {
			if (reload)
				return EXEC(reload);
			self.remove();
		});
	};
});

COMPONENT('visible', function() {
	var self = this;
	var processed = false;
	var template = self.attr('data-template');
	self.readonly();
	self.setter = function(value) {

		var is = true;
		var condition = self.attr('data-if');

		if (condition)
			is = self.evaluate(condition);
		else
			is = value ? true : false;

		if (is && template && !processed) {
			IMPORT(template, self);
			processed = true;
		}

		is && setTimeout2(self.id, function() {
			self.broadcast('reload')();
		}, 100);

		self.toggle('hidden', !is);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = jC.disabled(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

COMPONENT('websocket', function() {

	var reconnect_timeout;
	var self = this;
	var ws;
	var url;

	self.online = false;
	self.readonly();

	self.make = function() {
		reconnect_timeout = (self.attr('data-reconnect') || '5000').parseInt();
		url = self.attr('data-url');
		if (!url.match(/^(ws|wss)\:\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		ws && ws.send(encodeURIComponent(JSON.stringify(obj)));
		return self;
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		EMIT('online', false);
		return self;
	};

	function onClose() {
		self.close(true);
		setTimeout(function() {
			self.connect();
		}, reconnect_timeout);
	}

	function onMessage(e) {
		var data;
		try {
			data = JSON.parse(decodeURIComponent(e.data));
		} catch (ex) {
			window.console && console.warn('WebSocket "{0}": {1}'.format(url, ex.toString()));
			return;
		}
		data && EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		EMIT('online', true);
	}

	self.connect = function() {
		ws && self.close();
		setTimeout(function() {
			ws = new WebSocket(url);
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('designer', function() {
	var self = this;
	var svg, connection;
	var drag = {};
	var skip = false;
	var db, data, selected, dragdrop, container, lines, main, scroller;
	var moving = { x: 0, y: 0, drag: false };
	var zoom = 1;

	self.readonly();
	self.make = function() {
		scroller = self.element.parent();
		self.classes('ui-designer');
		self.append('<svg width="3000" height="3000"></svg>');
		var tmp = self.find('svg');
		svg = d3.select(tmp.get(0));
		main = svg.append('g');
		connection = main.append('path').attr('class', 'connection');
		lines = main.append('g');
		container = main.append('g');
		self.resize();

		tmp.on('mousedown mousemove mouseup', function(e) {
			if (e.type === 'mousemove') {
				if (!moving.drag)
					return;
				var x = moving.x - e.pageX;
				var y = moving.y - e.pageY;
				scroller.prop('scrollLeft', x).prop('scrollTop', y);
				return;
			}

			moving.drag = e.type === 'mousedown';
			moving.x = e.pageX + scroller.prop('scrollLeft');
			moving.y = e.pageY + scroller.prop('scrollTop');
		});

		$(window).on('keydown', function(e) {

			if (e.keyCode === 68 && (e.ctrlKey || e.metaKey) && selected) {
				e.preventDefault();
				self.duplicate();
				return;
			}

			if (e.target.tagName === 'BODY') {
				if (e.keyCode === 38) {
					self.move(0, -20, e);
				} else if (e.keyCode === 40) {
					self.move(0, 20, e);
				} else if (e.keyCode === 39) {
					self.move(20, 0, e);
				} else if (e.keyCode === 37) {
					self.move(-20, 0, e);
				}
			}

			if ((e.keyCode !== 8 && e.keyCode !== 46) || !selected || self.disabled || e.target.tagName !== 'BODY')
				return;
			self.remove();
		});


		self.remove = function() {
			EMIT('designer.selectable', null);
			var idconnection;
			if (selected.classed('node')) {
				idconnection = selected.attr('data-id');
				EMIT('designer.rem', idconnection);
			} else {
				EMIT('designer.rem.connection', selected.attr('data-from'), selected.attr('data-to'), selected.attr('data-index'));
				selected.remove();
			}
		};

		self.duplicate = function() {
			EMIT('designer.selectable', null);
			var component = flow.components.findItem('id', selected.attr('data-id'));
			var duplicate = {
				options: CLONE(component.options),
				name: component.name + ' (copy)',
				output: component.output,
				tab: component.tab
			};
			EMIT('designer.add', component.$component, component.x + 50, component.y + 50, false, null, null, null, duplicate);
		};

		self.event('dragover dragenter drag drop', 'svg', function(e) {
			if (!dragdrop)
				return;
			switch (e.type) {
				case 'dragenter':

					if (!dragdrop.input || !dragdrop.output)
						return;

					if (drag.conn) {
						drag.conn.removeClass('dropselection');
						drag.conn = null;
					}

					if (e.target.nodeName === 'path')
						drag.conn = $(e.target).addClass('dropselection');

					break;

				case 'drop':
					var tmp = $(e.target);
					var is = drag.conn ? true : false;
					if (drag.conn) {
						drag.conn.removeClass('dropselection');
						drag.conn = null;
					}

					var off = self.element.offset();

					var x = e.pageX - off.left; // e.offsetX
					var y = e.pageY - off.top; // e.offsetY

					x += self.element.prop('scrollLeft');
					y += self.element.prop('scrollTop');

					EMIT('designer.add', dragdrop, (x - 50) / zoom, (y - 30) / zoom, is, tmp.attr('data-from'), tmp.attr('data-to'), +tmp.attr('data-index'));
					break;
			}
			e.preventDefault();
		});
	};

	self.dragdrop = function(el) {
		dragdrop = el;
	};

	self.resize = function() {
		var size = getSize('.body');
		size.height -= self.element.offset().top;
		self.element.css(size);
	};

	self.add = function(item) {

		if (!item.$component)
			return;

		var g = container.append('g');
		var id = 'node_' + GUID(5);
		var err = item.errors ? Object.keys(item.errors) : EMPTYARRAY;

		g.attr('class', 'node node_unbinded selectable' + (err.length ? ' node_errors' : '') + ' node_' + item.id + (item.isnew ? ' node_new' : ''));
		g.attr('id', id);
		g.attr('data-id', item.id);

		var rect = g.append('rect');
		g.append('text').attr('class', 'node_status node_status_' + item.id).attr('transform', 'translate(2,-8)').text((item.state ? item.state.text : '') || '').attr('fill', (item.state ? item.state.color : '') || 'gray');

		var body = g.append('g');
		var label = (item.name || item.reference) ? body.append('text').html((item.reference ? '<tspan>{0}</tspan> | '.format(item.reference) : '') + Tangular.helpers.encode(item.name || '')).attr('class', 'node_label') : null;
		var text = body.append('text').text(item.$component.name).attr('class', 'node_name').attr('transform', 'translate(0, {0})'.format(label ? 14 : 5));

		var outputcolors = null;
		var output = 0;

		if (item.output != null) {
			if (item.output instanceof Array) {
				outputcolors = item.output;
				output = outputcolors.length;
			} else
				output = item.output;
		} else if (item.$component.output instanceof Array) {
			outputcolors = item.$component.output;
			output = outputcolors.length;
		} else
			output = item.$component.output;

		var count = output || 1;
		var height = 30 + count * 20;
		var width = (Math.max(label ? label.node().getComputedTextLength() : 0, text.node().getComputedTextLength()) + 30) >> 0;

		body.attr('transform', 'translate(15, {0})'.format((height / 2) - 2));
		rect.attr('width', width).attr('height', height).attr('rx', 4).attr('ry', 4).attr('fill', item.$component.color || '#656D78');

		g.attr('data-width', width);
		g.attr('data-height', height);

		var points = g.append('g');
		var top = ((height / 2) - ((item.$component.input * 20) / 2)) + 10;

		item.$component.input && points.append('circle').attr('class', 'input').attr('data-index', 0).attr('cx', 0).attr('cy', top).attr('r', 5);
		top = ((height / 2) - ((output * 20) / 2)) + 10;
		for (var i = 0; i < output; i++) {
			var o = points.append('circle').attr('class', 'output').attr('data-index', i).attr('cx', width).attr('cy', top + i * 20).attr('r', 5);
			if (outputcolors)
				o.attr('fill', outputcolors[i]);
			else
				o.attr('fill', 'black');
		}

		g.append('rect').attr('width', width - 5).attr('height', 3).attr('transform', 'translate(2, {0})'.format(height + 8)).attr('fill', '#E0E0E0');
		var plus = g.append('g').attr('class', 'node_traffic').attr('data-id', item.id);
		plus.append('rect').attr('data-width', width - 5).attr('width', 0).attr('height', 3).attr('transform', 'translate(2, {0})'.format(height + 8));
		plus.append('text').attr('transform', 'translate(2,{0})'.format(height + 25)).text('...');
		g.attr('transform', 'translate({0},{1})'.format(item.x, item.y));

		if (item.$component.click) {
			var clicker = g.append('g').attr('class', 'click');
			clicker.append('rect').attr('data-click', 'true').attr('transform', 'translate({0},{1})'.format(width / 2 - 8, height - 8)).attr('width', 16).attr('height', 16).attr('rx', 10).attr('ry', 10);
			clicker.append('rect').attr('data-click', 'true').attr('transform', 'translate({0},{1})'.format(width / 2 - 3, height - 3)).attr('width', 6).attr('height', 6).attr('rx', 6).attr('ry',6);
		}

		db[item.id] = id;
		data[item.id] = item;
	};

	self.move = function(x, y, e) {

		e.preventDefault();

		self.find('.node_connection').each(function() {
			var el = $(this);
			var off = el.attr('data-offset').split(',');
			var x1 = +off[0] + x;
			var y1 = +off[1] + y;
			var x2 = +off[2] + x;
			var y2 = +off[3] + y;
			this.setAttribute('data-offset', x1 + ',' + y1 + ',' + x2 + ',' + y2);
			el.attr('d', diagonal(x1, y1, x2, y2));
		});

		self.find('.node').each(function() {
			var el = $(this);
			var offset = el.attr('transform');
			offset = offset.substring(10, offset.length - 1).split(',');
			var px = +offset[0] + x;
			var py = +offset[1] + y;
			el.attr('transform', 'translate({0},{1})'.format(px, py));
			var instance = flow.components.findItem('id', el.attr('data-id'));
			if (instance) {
				instance.x = px;
				instance.y = py;
			}
		});

	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		container.selectAll('*').remove();
		lines.selectAll('*').remove();

		if (!value)
			return;

		db = {};
		data = {};
		selected = null;

		value.forEach(function(item) {
			self.add(item);
		});

		self.rebind(value);
	};

	self.rebind_lines = function() {

		svg.selectAll('.click').on('click', null).on('click', function() {
			var id = $(this).parent().attr('data-id');
			d3.event.preventDefault();
			!BLOCKED('click.' + id, 1000) && EMIT('designer.click', id);
		});

		svg.selectAll('.selectable').on('click', null).on('click', function() {

			var el = d3.select(this);

			if (selected) {
				selected.classed('selected', false);
				if (selected === el) {
					selected = null;
					EMIT('designer.selectable', null);
					return;
				}
			}

			el.classed('selected', true);
			selected = el;
			EMIT('designer.selectable', el);
		});

		EMIT('designer.selectable', null);
	};

	self.getZoom = function() {
		return zoom;
	};

	self.zoom = function(val) {
		switch (val) {
			case 0:
				zoom = 1;
				break;
			case 1:
				zoom += 0.1;
				break;
			case -1:
				zoom -= 0.1;
				break;
		}
		main.transition().duration(200).attr('transform', 'scale({0})'.format(zoom));
	};

	self.rebind = function(value, noredraw) {
		var dblclick = 0;
		var skip = false;

		var selector = svg.selectAll('.node_unbinded');
		selector.call(d3.drag().on('start', function() {

			var el = d3.select(this);
			var target = d3.select(d3.event.sourceEvent.target);
			var tmp;

			if (target.classed('click') || (d3.event.sourceEvent.target.tagName === 'rect' && d3.event.sourceEvent.target.getAttribute('data-click'))) {
				skip = true;
				return;
			}

			skip = false;
			drag.owner = el;

			if (target.classed('input') || target.classed('output')) {
				tmp = el.getTranslate();
				var x = tmp.x + (+target.attr('cx'));
				var y = tmp.y + (+target.attr('cy'));
				drag.x = x;
				drag.y = y;
				drag.type = 2;
				drag.element = target;
				return;
			}

			drag.type = 1;
			drag.offset = el.getTranslate();
			drag.offset.x -= d3.event.x;
			drag.offset.y -= d3.event.y;

			var id = el.attr('data-id');
			var now = Date.now();
			var can = dblclick && (now - dblclick) < 300;
			dblclick = now;

			el.raise();

			if (!el.classed('selected')) {
				selected && selected.classed('selected', false);
				el.classed('selected', true);
				selected = el;
				EMIT('designer.select', id);
				EMIT('designer.selectable', el);
			}

			can && EMIT('designer.settings', id);

		}).on('drag', function() {

			if (skip)
				return;

			var el = d3.select(this);
			switch (drag.type) {
				case 1:
					var x = drag.offset.x + d3.event.x;
					var y = drag.offset.y + d3.event.y;
					el.attr('transform', 'translate({0},{1})'.format(x, y));
					var id = drag.owner.attr('id');
					var w = +drag.owner.attr('data-width');
					var h = +drag.owner.attr('data-height');

					svg.selectAll('.' + id + '_from').attr('d', function() {
						var off = this.getAttribute('data-offset').split(',');
						var x1 = x + w;
						var y1 = (this.getAttribute('data-index').parseInt() * 20) + y + 26;
						var x2 = +off[2];
						var y2 = +off[3];
						this.setAttribute('data-offset', x1 + ',' + y1 + ',' + x2 + ',' + y2);
						return diagonal(x1, y1, x2, y2);
					});

					svg.selectAll('.' + id + '_to').attr('d', function() {
						var off = this.getAttribute('data-offset').split(',');
						var x1 = +off[0];
						var y1 = +off[1];
						var x2 = x;
						var y2 = y + (h / 2);
						this.setAttribute('data-offset', x1 + ',' + y1 + ',' + x2 + ',' + y2);
						return diagonal(x1, y1, x2, y2);
					});

					id = drag.owner.attr('data-id');
					data[id].x = x;
					data[id].y = y;
					break;
				case 2:
					connection.attr('d', diagonal(drag.x, drag.y, d3.event.x, d3.event.y));
					drag.x2 = d3.event.x;
					drag.y2 = d3.event.y;
					break;
			}

		}).on('end', function() {

			if (drag.type === 1 || skip)
				return;

			var tmp = d3.select(d3.event.sourceEvent.target);

			connection.attr('d', '');

			var clsA = drag.element.attr('class').match(/input|output/);
			var clsB = (tmp.attr('class') || '').match(/input|output/);

			if (clsA)
				clsA = clsA.toString();

			if (clsB)
				clsB = clsB.toString();

			if (!clsB || !clsA || clsB === clsA)
				return;

			var target = $(tmp.node()).closest('.node');
			var a = drag.owner.attr('id');
			var b = target.attr('id');
			var aid = drag.owner.attr('data-id');
			var bid = target.attr('data-id');

			if (aid === bid)
				return;

			var index = drag.element.attr('data-index');

			if (clsA === 'input') {
				index = tmp.attr('data-index');
				tmp = b;
				b = a;
				a = tmp;
				tmp = bid;
				bid = aid;
				aid = tmp;
				tmp = drag.x;
				drag.x = drag.x2;
				drag.x2 = tmp;
				tmp = drag.y;
				drag.y = drag.y2;
				drag.y2 = tmp;
				tmp = drag.owner;
				drag.owner = d3.select(target.get(0));
				tmp.each(function() {
					target = $(this);
				});
			}

			var tmpA = flow.components.findItem('id', aid);
			if (tmpA.connections[index] && tmpA.connections[index].indexOf(bid) !== -1)
				return;

			var height = +target.attr('data-height');
			drag.y2 = d3.select(target.get(0)).getTranslate().y + (height / 2);

			// Creates a line beween nodes
			lines.append('path').attr('d', diagonal(drag.x, drag.y, drag.x2, drag.y2)).attr('data-offset', drag.x + ',' + drag.y + ',' + drag.x2 + ',' + drag.y2).attr('stroke-width', 3).attr('class', a + '_from ' + b + '_to node_connection selectable' + (flow.connections[index + aid + bid] ? '' : ' path_new')).attr('data-from', aid).attr('data-to', bid).attr('data-index', index);

			if (data[aid].connections[index])
				data[aid].connections[index].push(bid);
			else
				data[aid].connections[index] = [bid];

			EMIT('designer.add.connection', a, b);
			self.rebind_lines();
			self.change(true);
		}));

		selector.classed('node_unbinded', false);

		if (noredraw)
			return;

		var elements = {};

		value.forEach(function(item) {

			if (!item.$component)
				return;

			var id = db[item.id];
			var el = elements[id];
			!el && (el = elements[id] = svg.select('#' + id));
			var offset = el.getTranslate();
			var width = +el.attr('data-width');
			var x = offset.x + width;
			Object.keys(item.connections).forEach(function(key) {
				var y = offset.y + (key.parseInt() * 20) + 26;
				item.connections[key].forEach(function(idconnection) {
					var targetinstance = value.findItem('id', idconnection);
					var target = db[idconnection];
					var tmp = elements[target];
					var hasError = targetinstance.errors && targetinstance.errors[item.id] ? true : false;
					!tmp && (tmp = elements[target] = svg.select('#' + target));
					var offset = tmp.getTranslate();
					var height = +tmp.attr('data-height');
					offset.y += (height / 2);
					lines.append('path').attr('d', diagonal(x, y, offset.x, offset.y)).attr('data-offset', x + ',' + y + ',' + offset.x + ',' + offset.y).attr('stroke-width', 3).attr('class', id + '_from ' + target + '_to node_connection selectable' + (hasError ? ' path_error' : '') + (flow.connections[key + item.id + idconnection] ? '' : ' path_new')).attr('data-from', item.id).attr('data-to', idconnection).attr('data-index', key);
				});
			});
		});

		self.rebind_lines();
		EMIT('designer.select', null);
	};
});

COMPONENT('checkbox', function() {

	var self = this;
	var input;
	var isRequired = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;
		value = type === 'undefined' || type === 'object' ? '' : value.toString();
		return value === 'true' || value === 'on';
	};

	self.required = function(value) {
		self.find('span').toggleClass('ui-checkbox-label-required', value === true);
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {
		self.classes('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.event('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
		input = self.find('input');
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('checkboxlist', function() {

	var self = this;
	var isRequired = self.attr('data-required');
	var template = Tangular.compile('<div class="{0} ui-checkboxlist-checkbox"><label><input type="checkbox" value="{{ id }}"><span>{{ name }}</span></label></div>'.format(self.attr('data-class')));

	self.validate = function(value) {
		return isRequired ? value && value.length > 0 : true;
	};

	self.required = function(value) {
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {

		self.event('click', 'input', function() {
			var arr = self.get() || [];
			var value = self.parser(this.value);
			var index = arr.indexOf(value);
			if (index === -1)
				arr.push(value);
			else
				arr.splice(index, 1);
			self.set(arr);
		});

		self.event('click', '.ui-checkboxlist-selectall', function() {
			var arr = [];
			var inputs = self.find('input');
			var value = self.get();

			if (value && inputs.length === value.length) {
				self.set(arr);
				return;
			}

			inputs.each(function() {
				arr.push(self.parser(this.value));
			});

			self.set(arr);
		});

		var datasource = self.attr('data-source');
		datasource && self.watch(datasource, function(path, value) {
			if (!value)
				value = [];
			self.redraw(value);
		}, true);

		var options = self.attr('data-options');
		if (!options)
			return;

		var arr = options.split(';');
		var datasource = [];

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			datasource.push({ id: item[1] === undefined ? item[0] : item[1], name: item[0] });
		}

		self.redraw(datasource);
	};

	self.setter = function(value) {
		self.find('input').each(function() {
			this.checked = value && value.indexOf(self.parser(this.value)) !== -1;
		});
	};

	self.redraw = function(arr) {
		var builder = [];
		var kn = self.attr('data-source-text') || 'name';
		var kv = self.attr('data-source-value') || 'id';

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (typeof(item) === 'string')
				builder.push(template({ id: item, name: item }));
			else
				builder.push(template({ id: item[kv] === undefined ? item[kn] : item[kv], name: item[kn] }));
		}

		if (!builder.length)
			return;

		var btn = self.attr('data-button') || '';
		if (btn)
			btn = '<div class="ui-checkboxlist-selectall"><a href="javascript:void(0)"><i class="fa fa-check-square-o mr5"></i>{0}</a></div>'.format(btn);

		builder.push('<div class="clearfix"></div>' + btn);
		self.html(builder.join(''));
		return self;
	};
});

COMPONENT('dropdowncheckbox', function() {

	var self = this;
	var required = self.element.attr('data-required') === 'true';
	var container;
	var data = [];
	var values;

	if (!window.$dropdowncheckboxtemplate)
		window.$dropdowncheckboxtemplate = Tangular.compile('<div><label><input type="checkbox" value="{{ index }}" /><span>{{ text }}</span></label></div>');

	var template = window.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var options = [];
		var element = self.element;
		var arr = (element.attr('data-options') || '').split(';');

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			var value = item[1] === undefined ? item[0] : item[1];
			if (self.type === 'number')
				value = parseInt(value);
			var obj = { value: value, text: item[0], index: i };
			options.push(template(obj));
			data.push(obj);
		}

		var content = element.html();
		var icon = element.attr('data-icon');
		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">' + options.join('') + '</div>';

		if (content.length > 0) {
			element.empty();
			element.append('<div class="ui-dropdowncheckbox-label' + (required ? ' ui-dropdowncheckbox-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append(html);
		} else
			element.append(html);

		self.classes('ui-dropdowncheckbox-container');
		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			var el = $(this);
			if (el.hasClass('ui-disabled'))
				return;

			container.toggleClass('hidden');

			if (window.$dropdowncheckboxelement) {
				window.$dropdowncheckboxelement.addClass('hidden');
				window.$dropdowncheckboxelement = null;
			}

			if (!container.hasClass('hidden'))
				window.$dropdowncheckboxelement = container;

			e.stopPropagation();
		});

		self.event('click', 'input,label', function(e) {

			e.stopPropagation();

			var is = this.checked;
			var index = parseInt(this.value);
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				if (index === -1)
					arr.push(value);
			} else {
				if (index !== -1)
					arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, undefined, 2);
		});

		var ds = self.attr('data-source');

		if (!ds)
			return;

		self.watch(ds, prepare);
		setTimeout(function() {
			prepare(ds, GET(ds));
		}, 500);
	};

	function prepare(path, value) {

		if (NOTMODIFIED(path, value))
			return;

		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (!value) {
			container.addClass(clsempty).empty().html(self.attr('data-empty'));
			return;
		}

		var kv = self.attr('data-source-value') || 'id';
		var kt = self.attr('data-source-text') || 'name';
		var builder = '';

		data = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			data.push(item);
			builder += template(item);
		}

		if (builder)
			container.removeClass(clsempty).empty().append(builder);
		else
			container.addClass(clsempty).empty().html(self.attr('data-empty'));

		self.setter(self.get());
	}

	self.setter = function(value) {

		if (NOTMODIFIED(self.id, value))
			return;

		var label = '';
		var empty = self.attr('data-placeholder');

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;

				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}

				if (!is)
					remove.push(selected);
			}

			var refresh = false;

			while (true) {
				var item = remove.shift();
				if (item === undefined)
					break;
				value.splice(value.indexOf(item), 1);
				refresh = true;
			}

			if (refresh)
				MAN.set(self.path, value);
		}

		container.find('input').each(function() {
			var index = parseInt(this.value);
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			if (checked)
				checked = value.indexOf(checked.value) !== -1;
			this.checked = checked;
		});

		if (!label && value) {
			// invalid data
			// it updates model without notification
			MAN.set(self.path, []);
		}

		if (!label && empty) {
			values.html('<span>{0}</span>'.format(empty));
			return;
		}

		values.html(label);
	};

	self.state = function() {
		self.find('.ui-dropdowncheckbox').toggleClass('ui-dropdowncheckbox-invalid', self.isInvalid());
	};

	if (window.$dropdowncheckboxevent)
		return;

	window.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (!window.$dropdowncheckboxelement)
			return;
		window.$dropdowncheckboxelement.addClass('hidden');
		window.$dropdowncheckboxelement = null;
	});
});

COMPONENT('dropdown', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		if (select.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-dropdown-label').toggleClass('ui-dropdown-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		emptyText !== undefined && builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.classes('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-jc-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(isRequired ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function() {
			var value = self.get(self.attr('data-source'));
			!NOTMODIFIED(self.id, value) && self.render(value || EMPTYARRAY);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('selectbox', function() {

	var self = this;
	var Eitems, Eselected;
	var isRequired = self.attr('data-required') === 'true';

	self.datasource = EMPTYARRAY;
	self.template = Tangular.compile('<li data-search="{{ search }}" data-index="{{ index }}">{{ text }}</li>');

	self.validate = function(value) {
		return isRequired ? value && value.length > 0 : true;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.search = function() {
		var search = self.find('input').val().toSearch();

		Eitems.find('li').each(function() {
			var el = $(this);
			el.toggleClass('hidden', el.attr('data-search').indexOf(search) === -1);
		});

		self.find('.ui-selectbox-search-icon').toggleClass('fa-search', search.length === 0).toggleClass('fa-times', search.length > 0);
	};

	self.make = function() {
		var search = self.attr('data-search');

		self.append((typeof(search) === 'string' ? '<div class="ui-selectbox-search"><span><i class="fa fa-search ui-selectbox-search-icon"></i></span><div><input type="text" placeholder="{0}" /></div></div><div>'.format(search) : '') + '<div style="height:{0}"><ul></ul><ul style="height:{0}"></ul></div>'.format(self.attr('data-height') || '200px'));
		self.classes('ui-selectbox');

		self.find('ul').each(function(index) {
			if (index)
				Eselected = $(this);
			else
				Eitems = $(this);
		});

		var datasource = self.attr('data-source');
		datasource && self.watch(datasource, function(path, value) {
			var propText = self.attr('data-source-text') || 'name';
			var propValue = self.attr('data-source-value') || 'id';
			self.datasource = [];
			value && value.forEach(function(item, index) {

				var text;
				var value;

				if (typeof(item) === 'string') {
					text = item;
					value = self.parser(item);
				} else {
					text = item[propText];
					value = item[propValue];
				}

				self.datasource.push({ text: text, value: value, index: index, search: text.toSearch() });
			});
			self.redraw();
		}, true);

		datasource = self.attr('data-options');
		if (datasource) {
			var items = [];
			datasource.split(';').forEach(function(item, index) {
				var val = item.split('|');
				items.push({ text: val[0], value: self.parser(val[1] === undefined ? val[0] : val[1]), index: index, search: val[0].toSearch() });
			});
			self.datasource = items;
			self.redraw();
		}

		self.event('click', 'li', function() {
			var selected = self.get() || [];
			var index = this.getAttribute('data-index').parseInt();
			var value = self.datasource[index];

			if (selected.indexOf(value.value) === -1)
				selected.push(value.value);
			else
				selected = selected.remove(value.value);

			self.set(selected);
			self.change(true);
		});

		self.event('click', '.fa-times', function() {
			self.find('input').val('');
			self.search();
		});

		typeof(search) === 'string' && self.event('keydown', 'input', function() {
			setTimeout2(self.id, self.search, 500);
		});
	};

	self.redraw = function() {
		var builder = [];
		self.datasource.forEach(function(item) {
			builder.push(self.template(item));
		});
		self.search();
		Eitems.empty().append(builder.join(''));
	};

	self.setter = function(value) {
		var selected = {};
		var builder = [];

		for (var i = 0, length = self.datasource.length; i < length; i++) {
			var item = self.datasource[i];
			if (value && value.indexOf(item.value) !== -1)
				selected[i] = item;
		}

		Eitems.find('li').each(function() {
			var el = $(this);
			var index = el.attr('data-index').parseInt();
			el.toggleClass('ui-selectbox-selected', selected[index] !== undefined);
		});

		Object.keys(selected).forEach(function(key) {
			builder.push(self.template(selected[key]));
		});

		Eselected.empty().append(builder.join(''));
		self.search();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.toggle('ui-selectbox-invalid', invalid);
	};
});

COMPONENT('textboxlist', function() {
	var self = this;
	var container;
	var empty = {};
	var skip = false;

	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}" value="{{ value }}" /></div></div>');
	self.make = function() {

		empty.max = (self.attr('data-maxlength') || '100').parseInt();
		empty.placeholder = self.attr('data-placeholder');
		empty.value = '';

		var html = self.html();
		var icon = self.attr('data-icon');

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		self.toggle('ui-textboxlist');
		self.html((html ? '<div class="ui-textboxlist-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');

		self.event('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;
			arr.splice(index, 1);
			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (e.type !== 'change' && e.keyCode !== 13)
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base').length > 0;

			if (base && e.type === 'change')
				return;

			if (base) {
				self.get().indexOf(value) === -1 && self.push(self.path, value, 2);
				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function() {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			container.empty();
			return;
		}

		var builder = [];

		value.forEach(function(item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('autocomplete', function() {
	var self = this;
	var container;
	var old;
	var onSearch;
	var searchtimeout;
	var searchvalue;
	var blurtimeout;
	var onCallback;
	var datasource;
	var is = false;
	var margin = {};

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-autocomplete-container hidden');
		self.html('<div class="ui-autocomplete"><ul></ul></div>');
		container = self.find('ul');

		self.event('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			onCallback && onCallback(datasource[+$(this).attr('data-index')], old);
			self.visible(false);
		});

		self.event('mouseenter mouseleave', 'li', function(e) {
			$(this).toggleClass('selected', e.type === 'mouseenter');
		});

		$(document).on('click', function() {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	function keydown(e) {
		var c = e.keyCode;
		var input = this;

		if (c !== 38 && c !== 40 && c !== 13) {
			if (c !== 8 && c < 32)
				return;
			clearTimeout(searchtimeout);
			searchtimeout = setTimeout(function() {
				var val = input.value;
				if (!val)
					return self.render(EMPTYARRAY);
				if (searchvalue === val)
					return;
				searchvalue = val;
				self.resize();
				onSearch(val, function(value) { self.render(value); });
			}, 200);
			return;
		}

		var current = self.find('.selected');

		if (c === 13) {
			self.visible(false);
			if (!current.length)
				return;
			onCallback(datasource[+current.attr('data-index')], old);
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.removeClass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		if (!current.length)
			current = self.find('li:{0}-child'.format(c === 40 ? 'first' : 'last'));
		current.addClass('selected');
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.toggle('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!old)
			return;

		var offset = old.offset();
		offset.top += old.height();
		offset.width = old.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.css(offset);
	};

	self.attach = function(input, search, callback, top, left, width) {

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (old) {
			old.removeAttr('autocomplete');
			old.off('blur', blur);
			old.off('keydown', keydown);
		}

		input.on('keydown', keydown);
		input.on('blur', blur);
		input.attr({ 'autocomplete': 'off' });

		old = input;
		margin.left = left;
		margin.top = top;
		margin.width = width;

		self.resize();
		self.refresh();
		searchvalue = '';
		onSearch = search;
		onCallback = callback;
		self.visible(false);
	};

	self.render = function(arr) {

		datasource = arr;

		if (!arr || !arr.length) {
			self.visible(false);
			return;
		}

		var builder = [];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.index = i;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		self.visible(true);
	};
});

COMPONENT('calendar', function() {

	var self = this;
	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = self.attr('data-days').split(',');
	self.months = self.attr('data-months').split(',');
	self.first = parseInt(self.attr('data-firstday'));
	self.today = self.attr('data-today');
	self.months_short = [];

	for (var i = 0, length = self.months.length; i < length; i++) {
		var m = self.months[i];
		if (m.length > 4)
			m = m.substring(0, 3) + '.';
		self.months_short.push(m);
	}

	self.readonly();
	self.click = function() {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	function calculate(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = self.first;
		var firstCount = 0;
		var from = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (from < 0)
			from = 7 + from;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - from;

		for (var i = 0; i < days + from; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= from) {
				obj.number = ++index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;

				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
			}

			output.days.push(obj);
		}

		indexEmpty = 0;
		for (var i = count; i < 42; i++)
			output.days.push({ isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: ++indexEmpty, index: ++count });
		return output;
	}

	self.hide = function() {
		self.classes('hidden');
		visible = false;
		return self;
	};

	self.toggle = function(el, value, callback, offset) {
		if (self.element.hasClass('hidden'))
			self.show(el, value, callback, offset);
		else
			self.hide();
		return self;
	};

	self.show = function(el, value, callback, offset) {

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.css({ left: off.left + (offset || 0), top: off.top + h + 12 }).removeClass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		return self;
	};

	self.make = function() {

		self.classes('ui-calendar hidden');

		self.event('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			self.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			skip = true;
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}
			skipDay = true;
			self.date(dt);
		});

		$(document.body).on('scroll', function() {
			visible && EXEC('$calendar.hide');
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		if (typeof(value) === 'string')
			value = value.parseDate();

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = new Date();

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push('ui-calendar-selected');
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}">{3}</td>'.format(cls.join(' '), output.year, output.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table>'.format(output.year, output.month, self.months[value.getMonth()], value.getFullYear(), header.join(''), builder.join('')) + (self.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + self.today + '</a></div>' : ''));
	};
});

COMPONENT('keyvalue', function() {
	var self = this;
	var container;
	var empty = {};
	var skip = false;

	self.binder = function(type, value) {
		return value;
	};

	self.template = Tangular.compile('<div class="ui-keyvalue-item"><div class="ui-keyvalue-item-remove"><i class="fa fa-times"></i></div><div class="ui-keyvalue-item-key"><input type="text" name="key" maxlength="{{ max }}" placeholder="{{ placeholder_key }}" value="{{ key }}" /></div><div class="ui-keyvalue-item-value"><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder_value }}" value="{{ value }}" /></div></div>');
	self.make = function() {

		empty.max = (self.attr('data-maxlength') || '100').parseInt();
		empty.placeholder_key = self.attr('data-placeholder-key');
		empty.placeholder_value = self.attr('data-placeholder-value');
		empty.value = '';

		var html = self.html();
		var icon = self.attr('data-icon');

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		self.toggle('ui-keyvalue');
		self.html((html ? '<div class="ui-keyvalue-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-keyvalue-items"></div>' + self.template(empty).replace('-item"', '-item ui-keyvalue-base"'));

		container = self.find('.ui-keyvalue-items');

		self.event('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-keyvalue-item');
			var inputs = parent.find('input');
			var obj = self.get();
			!obj && (obj = {});
			var key = inputs.get(0).value;
			parent.remove();
			delete obj[key];
			self.set(self.path, obj, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (e.type !== 'change' && e.keyCode !== 13)
				return;

			var el = $(this);
			var inputs = el.closest('.ui-keyvalue-item').find('input');
			var key = self.binder('key', inputs.get(0).value);
			var value = self.binder('value', inputs.get(1).value);

			if (!key || !value)
				return;

			var base = el.closest('.ui-keyvalue-base').length > 0;
			if (base && e.type === 'change')
				return;

			if (base) {
				var tmp = self.get();
				!tmp && (tmp = {});
				tmp[key] = value;
				self.set(tmp);
				self.change(true);
				inputs.val('');
				inputs.eq(0).focus();
				return;
			}

			var keyvalue = {};
			var k;

			container.find('input').each(function() {
				if (this.name === 'key') {
					k = this.value.trim();
				} else if (k) {
					keyvalue[k] = this.value.trim();
					k = '';
				}
			});

			skip = true;
			self.set(self.path, keyvalue, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value) {
			container.empty();
			return;
		}

		var builder = [];

		Object.keys(value).forEach(function(key) {
			empty.key = key;
			empty.value = value[key];
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('codemirror', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var skipA = false;
	var skipB = false;
	var editor;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.reload = function() {
		self.editor.refresh();
	};

	self.make = function() {

		var height = self.element.attr('data-height');
		var icon = self.element.attr('data-icon');
		var content = self.html();
		self.html('<div class="ui-codemirror-label' + (required ? ' ui-codemirror-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div><div class="ui-codemirror"></div>');

		var container = self.find('.ui-codemirror');
		self.editor = editor = CodeMirror(container.get(0), { lineNumbers: self.attr('data-linenumbers') === 'true', mode: self.attr('data-type') || 'htmlmixed', indentUnit: 4 });
		height !== 'auto' && editor.setSize('100%', height || '200px');

		editor.on('change', function(a, b) {

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(editor.getValue());
			}, 200);
		});

		skipB = true;
	};

	self.getter = null;
	self.setter = function(value) {

		if (skipA === true) {
			skipA = false;
			editor.refresh();
			return;
		}

		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		skipB = true;
		editor.setValue(editor.getValue());

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);

		setTimeout(function() {
			editor.refresh();
		}, 2000);
	};

	self.state = function() {
		self.element.find('.ui-codemirror').toggleClass('ui-codemirror-invalid', self.isInvalid());
	};
});

COMPONENT('contextmenu', function() {
	var self = this;
	var is = false;
	var timeout;
	var container;
	var arrow;

	self.template = Tangular.compile('<div data-value="{{ value }}"{{ if selected }} class="selected"{{ fi }}><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;

	self.make = function() {

		self.classes('ui-contextmenu');
		self.append('<span class="ui-contextmenu-arrow fa fa-caret-up"></span><div class="ui-contextmenu-items"></div>');
		container = self.find('.ui-contextmenu-items');
		arrow = self.find('.ui-contextmenu-arrow');

		self.event('touchstart mousedown', 'div[data-value]', function(e) {
			self.callback && self.callback($(this).attr('data-value'), $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function() {
			FIND('contextmenu').hide();
		});
	};

	self.show = function(orientation, target, items, callback) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attr('data-options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] || val[0] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;

		var builder = [];
		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];
			item.index = i;
			if (!item.value)
				item.value = item.name;
			if (!item.icon)
				item.icon = 'fa-caret-right';
			builder.push(self.template(item));
		}

		self.target = target.get(0);
		var offset = target.offset();

		container.html(builder);

		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '210px' });
				break;
			case 'center':
				arrow.css({ left: '107px' });
				break;
		}

		var options = { left: orientation === 'center' ? Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) : orientation === 'left' ? offset.left - 8 : (offset.left - self.element.width()) + target.innerWidth(), top: offset.top + target.innerHeight() + 10 };
		self.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.classes('ui-contextmenu-visible');
			self.emit('contextmenu', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().removeClass('ui-contextmenu-visible');
			self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.keyCode === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.info = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-info', message, icon || 'fa-check-circle');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.classes('-ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (self.attr('data-button') || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.find('.fa').removeClass().addClass('fa ' + icon);
		self.find('.text').html(text);
		self.classes('-hidden');
		setTimeout(function() {
			self.classes('ui-message-visible');
		}, 5);
	};
});

COMPONENT('disable', function() {
	var self = this;
	var condition;
	var selector;
	var validate;

	self.readonly();

	self.make = function() {
		condition = self.attr('data-if');
		selector = self.attr('data-selector') || 'input,texarea,select';
		validate = self.attr('data-validate');
		validate && (validate = validate.split(',').trim());
	};

	self.setter = function(value) {
		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? false : true;

		self.find(selector).each(function() {
			var el = $(this);
			var tag = el.get(0).tagName;
			if (tag === 'INPUT' || tag === 'SELECT') {
				el.prop('disabled', is);
				el.parent().toggleClass('ui-disabled', is);
			} else
				el.toggleClass('ui-disabled', is);
		});

		validate && validate.forEach(FN('n => jC.reset({0}n)'.format(self.pathscope ? '\'' + self.pathscope + '.\'+' : '')));
	};

	self.state = function() {
		self.update();
	};
});

COMPONENT('textarea', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var input;
	var container;

	self.validate = function(value) {

		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);
		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-textarea-label').toggleClass('ui-textarea-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-jc-bind', '');

		tmp = self.attr('data-height');
		tmp && attrs.attr('style', 'height:' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var element = self.element;
		var content = element.html();

		if (!content.length) {
			self.classes('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			container = self.element;
			return;
		}

		var icon = self.attr('data-icon');
		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label{0}">'.format(isRequired ? ' ui-textarea-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span>'.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.classes('ui-textarea-container');
		input = self.find('textarea');
		container = self.find('.ui-textarea');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textarea-invalid', invalid);
	};
});

COMPONENT('filereader', function() {
	var self = this;
	var required = self.attr('data-required') === 'true';

	self.readonly();

	self.make = function() {

		var element = self.element;
		var content = self.html();
		var placeholder = self.attr('data-placeholder');
		var icon = self.attr('data-icon');
		var accept = self.attr('data-accept');
		var html = '<span class="fa fa-folder-o"></span><input type="file"' + (accept ? ' accept="' + accept + '"' : '') + ' class="ui-filereader-input" /><input type="text" placeholder="' + (placeholder || '') + '" readonly="readonly" />';

		if (content.length) {
			self.html('<div class="ui-filereader-label' + (required ? ' ui-filereader-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div><div class="ui-filereader">' + html + '</div>');
		} else {
			self.classes('ui-filereader');
			self.html(html);
		}

		element.find('.ui-filereader-input').bind('change', function(evt) {
			var files = evt.target.files;
			var file = files[0];
			var el = this;
			var reader = new FileReader();
			reader.onload = function() {
				el.value = '';
				self.set({ body: reader.result, filename: file.name, type: file.type, size: file.size });
				reader = null;
			};
			reader.readAsText(file);
		});
	};
});

COMPONENT('nosqlcounter', function() {
	var self = this;
	var count = (self.attr('data-count') || '12').parseInt();

	self.readonly();
	self.make = function() {
		self.toggle('ui-nosqlcounter', true);
	};

	self.setter = function(value) {

		if (!value || !value.length)
			return self.empty();

		var maxbars = count;

		if (WIDTH() === 'xs')
			maxbars = (maxbars / 2) >> 0;

		var max = value.length - maxbars;
		if (max < 0)
			max = 0;

		value = value.slice(max, value.length);
		max = value.scalar('max', 'value');

		var bar = 100 / maxbars;
		var builder = [];
		var months = FIND('calendar').months;
		var current = new Date().format('yyyyMM');
		var cls = '';

		value.forEach(function(item, index) {
			var val = item.value;
			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';
			var h = (item.value / max) * 60;
			h += 40;

			cls = '';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (index === 11)
				cls += (cls ? ' ' : '') + 'last';

			builder.push('<div style="width:{0}%;height:{1}%" title="{3}" class="{4}"><span>{2}</span></div>'.format(bar.format(0, 3), h.format(0, 3), val, months[item.month - 1] + ' ' + item.year, cls));
		});

		self.html(builder);
	};
});