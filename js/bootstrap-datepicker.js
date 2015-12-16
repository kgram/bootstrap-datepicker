/* =========================================================
 * bootstrap-datepicker.js
 * Repo: https://github.com/eternicode/bootstrap-datepicker/
 * Demo: http://eternicode.github.io/bootstrap-datepicker/
 * Docs: http://bootstrap-datepicker.readthedocs.org/
 * Forked from http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Started by Stefan Petre; improvements by Andrew Rowls + contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function(factory) {
  if (typeof define === "function" && define.amd) {
    define(['jquery', 'moment'], factory);
  } else if (typeof exports === 'object') {
    factory(require('jquery'), require('moment'));
  } else {
    factory(jQuery, moment);
  }
}(function($, moment) {
  function alias(method) {
    return function() {
      return this[method].apply(this, arguments);
    };
  }

  var DateArray = (function() {
    var extras = {
      get: function(i) {
        var element = this.slice(i)[0];
        return element && element.clone();
      },
      contains: function(d) {
        // Array.indexOf is not cross-browser;
        // $.inArray doesn't work with Dates
        var val = d && d.valueOf();
        for (var i = 0, l = this.length; i < l; i++)
          if (this[i].valueOf() === val)
            return i;
        return -1;
      },
      remove: function(i) {
        this.splice(i, 1);
      },
      replace: function(new_array) {
        if (!new_array)
          return;
        if (!$.isArray(new_array))
          new_array = [new_array];
        this.clear();
        this.push.apply(this, new_array);
      },
      clear: function() {
        this.length = 0;
      },
      copy: function() {
        var a = new DateArray();
        a.replace(this);
        return a;
      }
    };

    return function() {
      var a = [];
      a.push.apply(a, arguments);
      $.extend(a, extras);
      return a;
    };
  })();


  // Picker object

  var Datepicker = function(element, options) {
    $(element).data('datepicker', this);
    this._process_options(options);

    this.dates = new DateArray();
    this.viewDate = moment(this.o.defaultViewDate);
    this.focusDate = null;

    this.element = $(element);
    this.isInline = false;
    this.isInput = this.element.is('input');
    this.component = this.element.hasClass('date') ?
      this.element.find('.add-on, .input-group-addon, .btn') : false;
    this.hasInput = this.component && this.element.find('input').length;
    if (this.component && this.component.length === 0)
      this.component = false;

    this.picker = $(DPGlobal.template);
    this._buildEvents();
    this._attachEvents();

    if (this.isInline) {
      this.picker.addClass('datepicker-inline').appendTo(this.element);
    } else {
      this.picker.addClass('datepicker-dropdown dropdown-menu');
    }

    if (this.o.rtl) {
      this.picker.addClass('datepicker-rtl');
    }

    this.viewMode = this.o.startView;

    if (this.o.calendarWeeks) {
      this.picker.find('thead .datepicker-title, tfoot .today, tfoot .clear')
        .attr('colspan', function(i, val) {
          return parseInt(val) + 1;
        });
    }

    this._allow_update = false;

    this.setStartDate(this._o.startDate);
    this.setEndDate(this._o.endDate);
    this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);
    this.setDaysOfWeekHighlighted(this.o.daysOfWeekHighlighted);
    this.setDatesDisabled(this.o.datesDisabled);

    this.fillDow();
    this.fillMonths();

    this._allow_update = true;

    this.update();
    this.showMode();

    if (this.isInline) {
      this.show();
    }
  };

  Datepicker.prototype = {
    constructor: Datepicker,

    _process_options: function(opts) {
      // Store raw options for reference
      this._o = $.extend({}, this._o, opts);
      // Processed options
      var o = this.o = $.extend({}, this._o);

      // Check if "de-DE" style date is available, if not language should
      // fallback to 2 letter code eg "de"
      var lang = o.language;
      if (!dates[lang]) {
        lang = lang.split('-')[0];
        if (!dates[lang])
          lang = defaults.language;
      }
      o.language = lang;

      switch (o.startView) {
        case 2:
        case 'decade':
          o.startView = 2;
          break;
        case 1:
        case 'year':
          o.startView = 1;
          break;
        default:
          o.startView = 0;
      }

      switch (o.minViewMode) {
        case 1:
        case 'months':
          o.minViewMode = 1;
          break;
        case 2:
        case 'years':
          o.minViewMode = 2;
          break;
        default:
          o.minViewMode = 0;
      }

      switch (o.maxViewMode) {
        case 0:
        case 'days':
          o.maxViewMode = 0;
          break;
        case 1:
        case 'months':
          o.maxViewMode = 1;
          break;
        default:
          o.maxViewMode = 2;
      }

      o.startView = Math.min(o.startView, o.maxViewMode);
      o.startView = Math.max(o.startView, o.minViewMode);

      // true, false, or Number > 0
      if (o.multidate === true) {
        o.multidate = Infinity;
      } else {
        o.multidate = Number(o.multidate);
        if (isNaN(o.multidate) || o.multidate < 2) {
          o.multidate = 1;
        }
      }
      o.multidateSeparator = String(o.multidateSeparator);

      o.startDate = moment(o.startDate, o.format);
      if (!o.startDate.isValid()) {
        // 0000-01-01
        o.startDate = moment([0,0,1]);
      }
      o.endDate = moment(o.endDate, o.format);
      if (!o.endDate.isValid()) {
        // 9999-01-01
        o.endDate = moment([9999,0,1]);
      }

      o.daysOfWeekDisabled = o.daysOfWeekDisabled || [];
      if (!$.isArray(o.daysOfWeekDisabled)) {
        o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled.split(/[,\s]*/), function(d) {
          return parseInt(d, 10);
        });
      }

      o.daysOfWeekHighlighted = o.daysOfWeekHighlighted || [];
      if (!$.isArray(o.daysOfWeekHighlighted)) {
        o.daysOfWeekHighlighted = $.map(o.daysOfWeekHighlighted.split(/[,\s]*/), function(d) {
          return parseInt(d, 10);
        });
      }

      o.datesDisabled = o.datesDisabled || [];
      if ($.isArray(o.datesDisabled)) {
        o.datesDisabled = $.map(o.datesDisabled, function(d) {
          return moment(d, o.format);
        });
      } else {
        o.datesDisabled = [moment(o.datesDisabled, o.format)];
      }

      var plc = String(o.orientation).toLowerCase().split(/\s+/g),
        _plc = o.orientation.toLowerCase();
      plc = $.grep(plc, function(word) {
        return /^auto|left|right|top|bottom$/.test(word);
      });
      o.orientation = {
        x: 'auto',
        y: 'auto'
      };
      if (!_plc || _plc === 'auto')
      ; // no action
      else if (plc.length === 1) {
        switch (plc[0]) {
          case 'top':
          case 'bottom':
            o.orientation.y = plc[0];
            break;
          case 'left':
          case 'right':
            o.orientation.x = plc[0];
            break;
        }
      } else {
        _plc = $.grep(plc, function(word) {
          return /^left|right$/.test(word);
        });
        o.orientation.x = _plc[0] || 'auto';

        _plc = $.grep(plc, function(word) {
          return /^top|bottom$/.test(word);
        });
        o.orientation.y = _plc[0] || 'auto';
      }
      o.defaultViewDate = moment(o.defaultViewDate);
      o.showOnFocus = o.showOnFocus !== undefined ? o.showOnFocus : true;
      o.zIndexOffset = o.zIndexOffset !== undefined ? o.zIndexOffset : 10;
    },
    _events: [],
    _secondaryEvents: [],
    _applyEvents: function(evs) {
      for (var i = 0, el, ch, ev; i < evs.length; i++) {
        el = evs[i][0];
        if (evs[i].length === 2) {
          ch = undefined;
          ev = evs[i][1];
        } else if (evs[i].length === 3) {
          ch = evs[i][1];
          ev = evs[i][2];
        }
        el.on(ev, ch);
      }
    },
    _unapplyEvents: function(evs) {
      for (var i = 0, el, ev, ch; i < evs.length; i++) {
        el = evs[i][0];
        if (evs[i].length === 2) {
          ch = undefined;
          ev = evs[i][1];
        } else if (evs[i].length === 3) {
          ch = evs[i][1];
          ev = evs[i][2];
        }
        el.off(ev, ch);
      }
    },
    _buildEvents: function() {
      var events = {
        keyup: $.proxy(function(e) {
          if ($.inArray(e.keyCode, [27,
              37, 39, 38, 40, 32,
              13, 9
            ]) === -1)
            this.update();
        }, this),
        keydown: $.proxy(this.keydown, this),
        paste: $.proxy(this.paste, this)
      };

      if (this.o.showOnFocus === true) {
        events.focus = $.proxy(this.show, this);
      }

      if (this.isInput) { // single input
        this._events = [
          [this.element, events]
        ];
      } else if (this.component && this.hasInput) { // component: input + button
        this._events = [
          // For components that are not readonly, allow keyboard nav
          [this.element.find('input'), events],
          [this.component, {
            click: $.proxy(this.show, this)
          }]
        ];
      } else if (this.element.is('div')) { // inline datepicker
        this.isInline = true;
      } else {
        this._events = [
          [this.element, {
            click: $.proxy(this.show, this)
          }]
        ];
      }
      this._events.push(
        // Component: listen for blur on element descendants
        [this.element, '*', {
          blur: $.proxy(function(e) {
            this._focused_from = e.target;
          }, this)
        }],
        // Input: listen for blur on element
        [this.element, {
          blur: $.proxy(function(e) {
            this._focused_from = e.target;
          }, this)
        }]
      );

      if (this.o.immediateUpdates) {
        // Trigger input updates immediately on changed year/month
        this._events.push([this.element, {
          'changeYear changeMonth': $.proxy(
            function(e) {
              this.update(e.date);
            }, this)
        }]);
      }

      this._secondaryEvents = [
        [this.picker, {
          click: $.proxy(this.click, this)
        }],
        [$(window), {
          resize: $.proxy(this.place, this)
        }],
        [$(document), {
          mousedown: $.proxy(function(e) {
            // Clicked outside the datepicker, hide it
            if (!(
                this.element.is(
                  e.target) ||
                this.element.find(
                  e.target).length ||
                this.picker.is(
                  e.target) ||
                this.picker.find(
                  e.target).length ||
                this.picker.hasClass(
                  'datepicker-inline'
                )
              )) {
              this.hide();
            }
          }, this)
        }]
      ];
    },
    _attachEvents: function() {
      this._detachEvents();
      this._applyEvents(this._events);
    },
    _detachEvents: function() {
      this._unapplyEvents(this._events);
    },
    _attachSecondaryEvents: function() {
      this._detachSecondaryEvents();
      this._applyEvents(this._secondaryEvents);
    },
    _detachSecondaryEvents: function() {
      this._unapplyEvents(this._secondaryEvents);
    },
    _trigger: function(event, altdate) {
      this.element.trigger({
        type: event,
        date: altdate || this.dates.get(-1),
        dates: this.dates,
        format: $.proxy(function(ix, format) {
          if (arguments.length === 0) {
            ix = -1;
            format = this.o.format;
          } else if (typeof ix === 'string') {
            format = ix;
            ix = -1;
          } else {
            format = format || this.o.format;
          }
          var date = this.dates.get(ix);
          return date && date.format(format);
        }, this)
      });
    },

    show: function() {
      if (this.element.attr('readonly') && this.o.enableOnReadonly ===
        false)
        return;
      if (!this.isInline)
        this.picker.appendTo(this.o.container);
      this.place();
      this.picker.show();
      this._attachSecondaryEvents();
      this._trigger('show');
      if ((window.navigator.msMaxTouchPoints ||
          'ontouchstart' in document) && this.o.disableTouchKeyboard) {
        $(this.element).blur();
      }
      return this;
    },

    hide: function() {
      if (this.isInline)
        return this;
      if (!this.picker.is(':visible'))
        return this;
      this.focusDate = null;
      this.picker.hide().detach();
      this._detachSecondaryEvents();
      this.viewMode = this.o.startView;
      this.showMode();

      if (
        this.o.forceParse &&
        (
          this.isInput && this.element.val() ||
          this.hasInput && this.element.find('input')
          .val()
        )
      )
        this.setValue();
      this._trigger('hide');
      return this;
    },

    remove: function() {
      this.hide();
      this._detachEvents();
      this._detachSecondaryEvents();
      this.picker.remove();
      delete this.element.data().datepicker;
      if (!this.isInput) {
        delete this.element.data().date;
      }
      return this;
    },

    paste: function(evt) {
      var dateString;
      if (evt.originalEvent.clipboardData && evt.originalEvent
        .clipboardData.types && $.inArray('text/plain',
          evt.originalEvent.clipboardData.types) !==
        -1) {
        dateString = evt.originalEvent.clipboardData.getData(
          'text/plain');
      } else if (window.clipboardData) {
        dateString = window.clipboardData.getData(
          'Text');
      } else {
        return;
      }
      this.setDate(dateString);
      this.update();
      evt.preventDefault();
    },

    getDates: function() {
      return this.dates;
    },

    getDate: function() {
      return this.dates.get(-1);
    },

    clearDates: function() {
      var element;
      if (this.isInput) {
        element = this.element;
      } else if (this.component) {
        element = this.element.find('input');
      }

      if (element) {
        element.val('');
      }

      this.update();
      this._trigger('changeDate');

      if (this.o.autoclose) {
        this.hide();
      }
    },
    setDates: function() {
      var args = $.isArray(arguments[0]) ? arguments[0] :
        arguments;
      this.update.apply(this, args);
      this._trigger('changeDate');
      this.setValue();
      return this;
    },

    setDate: alias('setDates'),

    setValue: function() {
      var formatted = this.getFormattedDate();
      if (!this.isInput) {
        if (this.component) {
          this.element.find('input').val(formatted);
        }
      } else {
        this.element.val(formatted);
      }
      return this;
    },

    getFormattedDate: function(format) {
      if (format === undefined)
        format = this.o.format;

      return $.map(this.dates, function(d) {
        return d.format(format);
      }).join(this.o.multidateSeparator);
    },

    setStartDate: function(startDate) {
      this._process_options({
        startDate: startDate
      });
      this.update();
      this.updateNavArrows();
      return this;
    },

    setEndDate: function(endDate) {
      this._process_options({
        endDate: endDate
      });
      this.update();
      this.updateNavArrows();
      return this;
    },

    setDaysOfWeekDisabled: function(daysOfWeekDisabled) {
      this._process_options({
        daysOfWeekDisabled: daysOfWeekDisabled
      });
      this.update();
      this.updateNavArrows();
      return this;
    },

    setDaysOfWeekHighlighted: function(daysOfWeekHighlighted) {
      this._process_options({
        daysOfWeekHighlighted: daysOfWeekHighlighted
      });
      this.update();
      return this;
    },

    setDatesDisabled: function(datesDisabled) {
      this._process_options({
        datesDisabled: datesDisabled
      });
      this.update();
      this.updateNavArrows();
    },

    place: function() {
      if (this.isInline)
        return this;
      var calendarWidth = this.picker.outerWidth(),
        calendarHeight = this.picker.outerHeight(),
        visualPadding = 10,
        container = $(this.o.container),
        windowWidth = container.width(),
        scrollTop = this.o.container === 'body' ? $(
          document).scrollTop() : container.scrollTop(),
        appendOffset = container.offset();

      var parentsZindex = [];
      this.element.parents().each(function() {
        var itemZIndex = $(this).css('z-index');
        if (itemZIndex !== 'auto' && itemZIndex !==
          0) parentsZindex.push(parseInt(
          itemZIndex));
      });
      var zIndex = Math.max.apply(Math, parentsZindex) +
        this.o.zIndexOffset;
      var offset = this.component ? this.component.parent()
        .offset() : this.element.offset();
      var height = this.component ? this.component.outerHeight(
        true) : this.element.outerHeight(false);
      var width = this.component ? this.component.outerWidth(
        true) : this.element.outerWidth(false);
      var left = offset.left - appendOffset.left,
        top = offset.top - appendOffset.top;

      if (this.o.container !== 'body') {
        top += scrollTop;
      }

      this.picker.removeClass(
        'datepicker-orient-top datepicker-orient-bottom ' +
        'datepicker-orient-right datepicker-orient-left'
      );

      if (this.o.orientation.x !== 'auto') {
        this.picker.addClass('datepicker-orient-' +
          this.o.orientation.x);
        if (this.o.orientation.x === 'right')
          left -= calendarWidth - width;
      }
      // auto x orientation is best-placement: if it crosses a window
      // edge, fudge it sideways
      else {
        if (offset.left < 0) {
          // component is outside the window on the left side. Move it into visible range
          this.picker.addClass(
            'datepicker-orient-left');
          left -= offset.left - visualPadding;
        } else if (left + calendarWidth > windowWidth) {
          // the calendar passes the widow right edge. Align it to component right side
          this.picker.addClass(
            'datepicker-orient-right');
          left += width - calendarWidth;
        } else {
          // Default to left
          this.picker.addClass(
            'datepicker-orient-left');
        }
      }

      // auto y orientation is best-situation: top or bottom, no fudging,
      // decision based on which shows more of the calendar
      var yorient = this.o.orientation.y,
        top_overflow;
      if (yorient === 'auto') {
        top_overflow = -scrollTop + top -
          calendarHeight;
        yorient = top_overflow < 0 ? 'bottom' : 'top';
      }

      this.picker.addClass('datepicker-orient-' + yorient);
      if (yorient === 'top')
        top -= calendarHeight + parseInt(this.picker.css(
          'padding-top'));
      else
        top += height;

      if (this.o.rtl) {
        var right = windowWidth - (left + width);
        this.picker.css({
          top: top,
          right: right,
          zIndex: zIndex
        });
      } else {
        this.picker.css({
          top: top,
          left: left,
          zIndex: zIndex
        });
      }
      return this;
    },

    _allow_update: true,
    update: function() {
      if (!this._allow_update)
        return this;

      var oldDates = this.dates.copy(),
        dates = [],
        fromArgs = false;
      if (arguments.length) {
        $.each(arguments, $.proxy(function(i, date) {
          date = moment(date, this.o.format);
          if (date.isValid()) {
            dates.push(date);
          }
        }, this));
        fromArgs = true;
      } else {
        dates = this.isInput ? this.element.val() :
          this.element.data('date') || this.element.find(
            'input').val();
        if (dates && this.o.multidate)
          dates = dates.split(this.o.multidateSeparator);
        else
          dates = [dates];
        delete this.element.data().date;
      }

      dates = $.map(dates, $.proxy(function(date) {
        return moment(date, this.o.format);
      }, this));
      dates = $.grep(dates, $.proxy(function(date) {
        return (
          date < this.o.startDate ||
          date > this.o.endDate ||
          !date.isValid()
        );
      }, this), true);
      this.dates.replace(dates);

      if (this.dates.length)
        this.viewDate = this.dates.get(-1);
      else if (this.viewDate < this.o.startDate)
        this.viewDate = this.o.startDate.clone();
      else if (this.viewDate > this.o.endDate)
        this.viewDate = this.o.endDate.clone();
      else
        this.viewDate = this.o.defaultViewDate.clone();

      if (fromArgs) {
        // setting date by clicking
        this.setValue();
      } else if (dates.length) {
        // setting date by typing
        if (String(oldDates) !== String(this.dates))
          this._trigger('changeDate');
      }
      if (!this.dates.length && oldDates.length)
        this._trigger('clearDate');

      this.fill();
      this.element.change();
      return this;
    },

    fillDow: function() {
      var dowCnt = this.o.weekStart,
        html = '<tr>';
      if (this.o.calendarWeeks) {
        this.picker.find('.datepicker-days .datepicker-switch')
          .attr('colspan', function(i, val) {
            return parseInt(val) + 1;
          });
        html += '<th class="cw">&#160;</th>';
      }
      while (dowCnt < this.o.weekStart + 7) {
        html += '<th class="dow">' + moment.weekdaysMin((dowCnt++) % 7) + '</th>';
      }
      html += '</tr>';
      this.picker.find('.datepicker-days thead').append(html);
    },

    fillMonths: function() {
      var html = '',
        i = 0;
      while (i < 12) {
        html += '<span class="month">' + moment.monthsShort(i++) + '</span>';
      }
      this.picker.find('.datepicker-months td').html(html);
    },

    setRange: function(range) {
      if (!range || !range.length)
        delete this.range;
      else
        this.range = $.map(range, function(d) {
          return d.valueOf();
        });
      this.fill();
    },

    getClassNames: function(date) {
      var cls = [],
        year = this.viewDate.year(),
        month = this.viewDate.month(),
        today = moment();
      if (date.year() < year || (date.year() ===
          year && date.month() < month)) {
        cls.push('old');
      } else if (date.year() > year || (date.year() ===
          year && date.month() > month)) {
        cls.push('new');
      }
      if (this.focusDate && date.valueOf() === this.focusDate
        .valueOf())
        cls.push('focused');
      if (this.o.todayHighlight && date.isSame(today, 'day')) {
        cls.push('today');
      }
      if (this.dates.contains(date) !== -1)
        cls.push('active');
      if (date.valueOf() < this.o.startDate || date.valueOf() >
        this.o.endDate ||
        $.inArray(date.day(), this.o.daysOfWeekDisabled) !==
        -1) {
        cls.push('disabled');
      }
      if ($.inArray(date.day(), this.o.daysOfWeekHighlighted) !==
        -1) {
        cls.push('highlighted');
      }
      if (this.o.datesDisabled.length > 0 &&
        $.grep(this.o.datesDisabled, function(d) {
          return date.isSame(d, 'day');
        }).length > 0) {
        cls.push('disabled', 'disabled-date');
      }

      if (this.range) {
        if (date > this.range[0] && date < this.range[
            this.range.length - 1]) {
          cls.push('range');
        }
        if ($.inArray(date.valueOf(), this.range) !== -
          1) {
          cls.push('selected');
        }
        if (date.valueOf() === this.range[0]) {
          cls.push('range-start');
        }
        if (date.valueOf() === this.range[this.range.length -
            1]) {
          cls.push('range-end');
        }
      }
      return cls;
    },

    fill: function() {
      var date = this.viewDate,
        start = this.o.startDate,
        end = this.o.endDate,
        todayText = dates[this.o.language].today || dates['en'].today || '',
        clearText = dates[this.o.language].clear || dates['en'].clear || '',
        titleFormat = dates[this.o.language].titleFormat || dates['en'].titleFormat,
        tooltip,
        i;
      if (!date) {
        return;
      }
      this.picker
        .find('.datepicker-days thead .datepicker-switch')
        .text(date.format(titleFormat));
      this.picker
        .find('tfoot .today')
        .text(todayText)
        .toggle(this.o.todayBtn !== false);
      this.picker
        .find('tfoot .clear')
        .text(clearText)
        .toggle(this.o.clearBtn !== false);
      this.picker
        .find('thead .datepicker-title')
        .text(this.o.title)
        .toggle(this.o.title !== '');
      this.updateNavArrows();
      this.fillMonths();
      var currentDate = date.clone().startOf('month').startOf('week'),
        html = [],
        clsName;
      // Ensure part of previous month is always visible
      if (currentDate.date() === 1) {
        currentDate.add(-1, 'week');
      }
      for (i = 0; i < 42; i++, currentDate.add(1, 'day')) {
        if (i % 7 === 0) {
          html.push('<tr>');
          if (this.o.calendarWeeks) {
            html.push('<td class="cw">' + currentDate.week() + '</td>');
          }
        }
        clsName = this.getClassNames(currentDate);
        clsName.push('day');

        if (this.o.beforeShowDay !== $.noop) {
          var before = this.o.beforeShowDay(currentDate);
          if (before === undefined)
            before = {};
          else if (typeof(before) === 'boolean')
            before = {
              enabled: before
            };
          else if (typeof(before) === 'string')
            before = {
              classes: before
            };
          if (before.enabled === false)
            clsName.push('disabled');
          if (before.classes)
            clsName = clsName.concat(before.classes.split(/\s+/));
          if (before.tooltip)
            tooltip = before.tooltip;
        }

        clsName = $.unique(clsName);
        html.push('<td class="' + clsName.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + '>' + currentDate.date() + '</td>');
        tooltip = null;
        if (i % 7 === 6) {
          html.push('</tr>');
        }
      }
      this.picker.find('.datepicker-days tbody').html(html.join(''));

      var months = this.picker
        .find('.datepicker-months')
          .find('.datepicker-switch')
          .text(this.o.maxViewMode < 2 ? 'Months' : date.year())
        .end()
          .find('span')
          .removeClass('active');

      $.each(this.dates, function(i, d) {
        if (d.year() === date.year())
          months.eq(d.month()).addClass('active');
      });

      if (date.year() < start.year() || date.year() > end.year()) {
        months.addClass('disabled');
      }
      if (date.year() === start.year()) {
        months.slice(0, start.month()).addClass('disabled');
      }
      if (date.year() === end.year()) {
        months.slice(end.month() + 1).addClass('disabled');
      }

      if (this.o.beforeShowMonth !== $.noop) {
        var that = this;
        $.each(months, function(i, month) {
          if (!$(month).hasClass('disabled')) {
            var moDate = moment(date.year(), i, 1);
            var before = that.o.beforeShowMonth(moDate);
            if (before === false)
              $(month).addClass('disabled');
          }
        });
      }

      html = '';
      var year = parseInt(date.year() / 10, 10) * 10;
      var yearCont = this.picker.find('.datepicker-years')
        .find('.datepicker-switch')
        .text(year + '-' + (year + 9))
        .end()
        .find('td');
      year -= 1;
      var years = $.map(this.dates, function(d) {
          return d.year();
        }),
        classes;
      for (i = -1; i < 11; i++) {
        classes = ['year'];
        tooltip = null;

        if (i === -1)
          classes.push('old');
        else if (i === 10)
          classes.push('new');
        if ($.inArray(year, years) !== -1)
          classes.push('active');
        if (year < start.year() || year > end.year())
          classes.push('disabled');

        if (this.o.beforeShowYear !== $.noop) {
          var yrBefore = this.o.beforeShowYear(moment([year, 0, 1]));
          if (yrBefore === undefined)
            yrBefore = {};
          else if (typeof(yrBefore) === 'boolean')
            yrBefore = {
              enabled: yrBefore
            };
          else if (typeof(yrBefore) === 'string')
            yrBefore = {
              classes: yrBefore
            };
          if (yrBefore.enabled === false)
            classes.push('disabled');
          if (yrBefore.classes)
            classes = classes.concat(yrBefore.classes
              .split(/\s+/));
          if (yrBefore.tooltip)
            tooltip = yrBefore.tooltip;
        }

        html += '<span class="' + classes.join(' ') +
          '"' + (tooltip ? ' title="' + tooltip + '"' :
            '') + '>' + year + '</span>';
        year += 1;
      }
      yearCont.html(html);
    },

    updateNavArrows: function() {
      if (!this._allow_update)
        return;

      var next, prev;

      switch (this.viewMode) {
        case 0:
          prev = !this.o.startDate || this.o.startDate.isBefore(this.viewDate, 'month');
          next = !this.o.endDate || this.o.endDate.isAfter(this.viewDate, 'month');
          break;
        case 1:
        case 2:
          prev = !this.o.startDate || this.o.startDate.isBefore(this.viewDate, 'year') || this.o.maxViewMode < 2;
          next = !this.o.endDate || this.o.endDate.isAfter(this.viewDate, 'year') || this.o.maxViewMode < 2;
          break;
      }
      this.picker.find('.prev').css('visibility', prev ? 'visible' : 'hidden');
      this.picker.find('.next').css('visibility', next ? 'visible' : 'hidden');
    },

    click: function(e) {
      e.preventDefault();
      e.stopPropagation();
      var target = $(e.target).closest('span, td, th'),
        year, month, day;
      if (target.length === 1) {
        switch (target[0].nodeName.toLowerCase()) {
          case 'th':
            switch (target[0].className) {
              case 'datepicker-switch':
                this.showMode(1);
                break;
              case 'prev':
              case 'next':
                var dir = DPGlobal.modes[this.viewMode]
                  .navStep * (target[0].className === 'prev' ? -1 : 1);
                switch (this.viewMode) {
                  case 0:
                    this.viewDate = this.moveMonth(this.viewDate, dir);
                    this._trigger('changeMonth', this.viewDate);
                    break;
                  case 1:
                  case 2:
                    this.viewDate = this.moveYear(this.viewDate, dir);
                    if (this.viewMode === 1)
                      this._trigger('changeYear', this.viewDate);
                    break;
                }
                this.fill();
                break;
              case 'today':
                var date = moment().startOf('day');
                this.showMode(-2);
                var which = this.o.todayBtn === 'linked' ? null : 'view';
                this._setDate(date, which);
                break;
              case 'clear':
                this.clearDates();
                break;
            }
            break;
          case 'span':
            if (!target.hasClass('disabled')) {
              this.viewDate.date(1);
              if (target.hasClass('month')) {
                day = 1;
                month = target.parent().find('span').index(target);
                year = this.viewDate.year();
                this.viewDate.month(month);
                this._trigger('changeMonth', this.viewDate);
                if (this.o.minViewMode === 1) {
                  this._setDate(moment([year,
                    month, day]));
                  this.showMode();
                } else {
                  this.showMode(-1);
                }
              } else {
                day = 1;
                month = 0;
                year = parseInt(target.text(), 10) || 0;
                this.viewDate.year(year);
                this._trigger('changeYear',
                  this.viewDate);
                if (this.o.minViewMode === 2) {
                  this._setDate(moment([year, month, month]));
                }
                this.showMode(-1);
              }
              this.fill();
            }
            break;
          case 'td':
            if (target.hasClass('day') && !target.hasClass('disabled')) {
              day = parseInt(target.text(), 10) || 1;
              date = this.viewDate.clone();
              if (target.hasClass('old')) {
                date.add(-1, 'month');
              } else if (target.hasClass('new')) {
                date.add(1, 'month');
              }
              date.date(parseInt(target.text(), 10) || 1);
              this._setDate(date);
            }
            break;
        }
      }
      if (this.picker.is(':visible') && this._focused_from) {
        $(this._focused_from).focus();
      }
      delete this._focused_from;
    },

    _toggle_multidate: function(date) {
      var ix = this.dates.contains(date);
      if (!date) {
        this.dates.clear();
      }

      if (ix !== -1) {
        if (this.o.multidate === true || this.o.multidate >
          1 || this.o.toggleActive) {
          this.dates.remove(ix);
        }
      } else if (this.o.multidate === false) {
        this.dates.clear();
        this.dates.push(date);
      } else {
        this.dates.push(date);
      }

      if (typeof this.o.multidate === 'number')
        while (this.dates.length > this.o.multidate)
          this.dates.remove(0);
    },

    _setDate: function(date, which) {
      if (!which || which === 'date')
        this._toggle_multidate(date && moment(date));
      if (!which || which === 'view')
        this.viewDate = date && moment(date);

      this.fill();
      this.setValue();
      if (!which || which !== 'view') {
        this._trigger('changeDate');
      }
      var element;
      if (this.isInput) {
        element = this.element;
      } else if (this.component) {
        element = this.element.find('input');
      }
      if (element) {
        element.change();
      }
      if (this.o.autoclose && (!which || which === 'date')) {
        this.hide();
      }
    },

    moveMonth: function(date, dir) {
      if (!date.isValid())
        return this.o.defaultViewDate;
      if (!dir)
        return date;
      return date.clone().add(dir, 'months');
    },

    moveYear: function(date, dir) {
      return this.moveMonth(date, dir * 12);
    },

    dateWithinRange: function(date) {
      return date.isBetween(this.o.startDate, this.o.endDate, 'day');
    },

    keydown: function(e) {
      if (!this.picker.is(':visible')) {
        if (e.keyCode === 40 || e.keyCode === 27) { // allow down to re-show picker
          this.show();
          e.stopPropagation();
        }
        return;
      }
      var dateChanged = false,
        dir, newDate, newViewDate,
        focusDate = (this.focusDate || this.viewDate).clone();
      switch (e.keyCode) {
        case 27: // escape
          if (this.focusDate) {
            this.focusDate = null;
            this.viewDate = this.dates.get(-1) || this.viewDate;
            this.fill();
          } else
            this.hide();
          e.preventDefault();
          e.stopPropagation();
          break;
        case 37: // left
        case 38: // up
        case 39: // right
        case 40: // down
          if (!this.o.keyboardNavigation)
            break;
          // left/up navigates back, right/down navigates forward
          dir = e.keyCode < 39 ? -1 : 1;
          newDate = this.dates.get(-1) || moment();
          var unit;
          // Control navigates years, all directions
          if (e.ctrlKey) {
            unit = 'year';
            this._trigger('changeYear', this.viewDate.clone());
          // Shift navigates months, all directions
          } else if (e.shiftKey) {
            unit = 'month';
            this._trigger('changeMonth', this.viewDate.clone());
          // Normal up/down navigates weeks
        } else if (e.keyCode === 38 || e.keyCode === 40) {
            unit = 'week';
          // Normal left/right navigates days
          } else {
            unit = 'day';
          }

          newDate.add(dir, unit);
          newViewDate = focusDate.add(dir, unit);

          if (this.dateWithinRange(newViewDate)) {
            this.viewDate = newViewDate;
            this.focusDate = this.viewDate.clone();
            this.setValue();
            this.fill();
            e.preventDefault();
          }
          break;
        case 32: // spacebar
          // Spacebar is used in manually typing dates in some formats.
          // As such, its behavior should not be hijacked.
          break;
        case 13: // enter
          if (!this.o.forceParse) {
            break;
          }
          focusDate = this.focusDate || this.dates.get(-1) || this.viewDate;
          if (this.o.keyboardNavigation) {
            this._toggle_multidate(focusDate);
            dateChanged = true;
          }
          this.focusDate = null;
          this.viewDate = this.dates.get(-1) || this.viewDate;
          this.setValue();
          this.fill();
          if (this.picker.is(':visible')) {
            e.preventDefault();
            if (typeof e.stopPropagation ===
              'function') {
              e.stopPropagation(); // All modern browsers, IE9+
            } else {
              e.cancelBubble = true; // IE6,7,8 ignore "stopPropagation"
            }
            if (this.o.autoclose)
              this.hide();
          }
          break;
        case 9: // tab
          this.focusDate = null;
          this.viewDate = this.dates.get(-1) || this.viewDate;
          this.fill();
          this.hide();
          break;
      }
      if (dateChanged) {
        if (this.dates.length)
          this._trigger('changeDate');
        else
          this._trigger('clearDate');
        var element;
        if (this.isInput) {
          element = this.element;
        } else if (this.component) {
          element = this.element.find('input');
        }
        if (element) {
          element.change();
        }
      }
    },

    showMode: function(dir) {
      if (dir) {
        this.viewMode = Math.max(this.o.minViewMode,
          Math.min(this.o.maxViewMode, this.viewMode +
            dir));
      }
      this.picker
        .children('div')
        .hide()
        .filter('.datepicker-' + DPGlobal.modes[this.viewMode]
          .clsName)
        .show();
      this.updateNavArrows();
    }
  };

  var DateRangePicker = function(element, options) {
    $(element).data('datepicker', this);
    this.element = $(element);
    this.inputs = $.map(options.inputs, function(i) {
      return i.jquery ? i[0] : i;
    });
    delete options.inputs;

    datepickerPlugin.call($(this.inputs), options)
      .on('changeDate', $.proxy(this.dateUpdated, this));

    this.pickers = $.map(this.inputs, function(i) {
      return $(i).data('datepicker');
    });
    this.updateDates();
  };
  DateRangePicker.prototype = {
    updateDates: function() {
      this.dates = $.map(this.pickers, function(i) {
        return i.date();
      });
      this.updateRanges();
    },
    updateRanges: function() {
      var range = $.map(this.dates, function(d) {
        return d.valueOf();
      });
      $.each(this.pickers, function(i, p) {
        p.setRange(range);
      });
    },
    dateUpdated: function(e) {
      // `this.updating` is a workaround for preventing infinite recursion
      // between `changeDate` triggering and `date` calling.  Until
      // there is a better mechanism.
      if (this.updating)
        return;
      this.updating = true;

      var dp = $(e.target).data('datepicker');

      if (typeof(dp) === "undefined") {
        return;
      }

      var new_date = dp.date(),
        i = $.inArray(e.target, this.inputs),
        j = i - 1,
        k = i + 1,
        l = this.inputs.length;
      if (i === -1)
        return;

      $.each(this.pickers, function(i, p) {
        if (!p.date())
          p.date(new_date);
      });

      if (new_date < this.dates[j]) {
        // Date being moved earlier/left
        while (j >= 0 && new_date < this.dates[j]) {
          this.pickers[j--].date(new_date);
        }
      } else if (new_date > this.dates[k]) {
        // Date being moved later/right
        while (k < l && new_date > this.dates[k]) {
          this.pickers[k++].date(new_date);
        }
      }
      this.updateDates();

      delete this.updating;
    },
    remove: function() {
      $.map(this.pickers, function(p) {
        p.remove();
      });
      delete this.element.data().datepicker;
    }
  };

  function opts_from_el(el, prefix) {
    // Derive options from element data-attrs
    var data = $(el).data(),
      out = {},
      inkey,
      replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])');
    prefix = new RegExp('^' + prefix.toLowerCase());

    function re_lower(_, a) {
      return a.toLowerCase();
    }
    for (var key in data)
      if (prefix.test(key)) {
        inkey = key.replace(replace, re_lower);
        out[inkey] = data[key];
      }
    return out;
  }

  function opts_from_locale(lang) {
    // Derive options from locale plugins
    var out = {};
    // Check if "de-DE" style date is available, if not language should
    // fallback to 2 letter code eg "de"
    if (!dates[lang]) {
      lang = lang.split('-')[0];
      if (!dates[lang])
        return;
    }
    var d = dates[lang];
    $.each(locale_opts, function(i, k) {
      if (k in d)
        out[k] = d[k];
    });
    return out;
  }

  var old = $.fn.datepicker;
  var datepickerPlugin = function(option) {
    var args = Array.apply(null, arguments);
    args.shift();
    var internal_return;
    this.each(function() {
      var $this = $(this),
        data = $this.data('datepicker'),
        options = typeof option === 'object' &&
        option;
      if (!data) {
        var elopts = opts_from_el(this, 'date'),
          // Preliminary otions
          xopts = $.extend({}, defaults, elopts,
            options),
          locopts = opts_from_locale(xopts.language),
          // Options priority: js args, data-attrs, locales, defaults
          opts = $.extend({}, defaults, locopts,
            elopts, options);
        if ($this.hasClass('input-daterange') ||
          opts.inputs) {
          var ropts = {
            inputs: opts.inputs || $this.find(
              'input').toArray()
          };
          data = new DateRangePicker(this, $.extend(
            opts, ropts));
        } else {
          data = new Datepicker(this, opts);
        }
      }
      if (typeof option === 'string' && typeof data[
          option] === 'function') {
        internal_return = data[option].apply(data,
          args);
      }
    });

    if (
      internal_return === undefined ||
      internal_return instanceof Datepicker ||
      internal_return instanceof DateRangePicker
    )
      return this;

    if (this.length > 1)
      throw new Error(
        'Using only allowed for the collection of a single element (' +
        option + ' function)');
    else
      return internal_return;
  };
  $.fn.datepicker = datepickerPlugin;

  var defaults = $.fn.datepicker.defaults = {
    assumeNearbyYear: false,
    autoclose: false,
    beforeShowDay: $.noop,
    beforeShowMonth: $.noop,
    beforeShowYear: $.noop,
    calendarWeeks: false,
    clearBtn: false,
    toggleActive: false,
    daysOfWeekDisabled: [],
    daysOfWeekHighlighted: [],
    datesDisabled: [],
    endDate: Infinity,
    forceParse: true,
    format: 'L',
    keyboardNavigation: true,
    language: 'en',
    minViewMode: 0,
    maxViewMode: 2,
    multidate: false,
    multidateSeparator: ',',
    orientation: "auto",
    rtl: false,
    startDate: -Infinity,
    startView: 0,
    todayBtn: false,
    todayHighlight: false,
    weekStart: 0,
    disableTouchKeyboard: false,
    enableOnReadonly: true,
    container: 'body',
    immediateUpdates: false,
    title: ''
  };
  var locale_opts = $.fn.datepicker.locale_opts = [
    'format',
    'rtl',
    'weekStart'
  ];
  $.fn.datepicker.Constructor = Datepicker;
  var dates = $.fn.datepicker.dates = {
    en: {
      today: "Today",
      clear: "Clear",
      titleFormat: "MMMM YYYY"
    }
  };

  var DPGlobal = {
    modes: [{
      clsName: 'days',
      navFnc: 'Month',
      navStep: 1
    }, {
      clsName: 'months',
      navFnc: 'FullYear',
      navStep: 1
    }, {
      clsName: 'years',
      navFnc: 'FullYear',
      navStep: 10
    }],
    isLeapYear: function(year) {
      return (((year % 4 === 0) && (year % 100 !== 0)) ||
        (year % 400 === 0));
    },
    getDaysInMonth: function(year, month) {
      return [31, (DPGlobal.isLeapYear(year) ? 29 : 28),
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31
      ][month];
    },
    nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
    headTemplate: '<thead>' +
      '<tr>' +
      '<th colspan="7" class="datepicker-title"></th>' +
      '</tr>' +
      '<tr>' +
      '<th class="prev">&#171;</th>' +
      '<th colspan="5" class="datepicker-switch"></th>' +
      '<th class="next">&#187;</th>' +
      '</tr>' +
      '</thead>',
    contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
    footTemplate: '<tfoot>' +
      '<tr>' +
      '<th colspan="7" class="today"></th>' +
      '</tr>' +
      '<tr>' +
      '<th colspan="7" class="clear"></th>' +
      '</tr>' +
      '</tfoot>'
  };
  DPGlobal.template = '<div class="datepicker">' +
    '<div class="datepicker-days">' +
    '<table class=" table-condensed">' +
    DPGlobal.headTemplate +
    '<tbody></tbody>' +
    DPGlobal.footTemplate +
    '</table>' +
    '</div>' +
    '<div class="datepicker-months">' +
    '<table class="table-condensed">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</table>' +
    '</div>' +
    '<div class="datepicker-years">' +
    '<table class="table-condensed">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</table>' +
    '</div>' +
    '</div>';

  $.fn.datepicker.DPGlobal = DPGlobal;


  /* DATEPICKER NO CONFLICT
   * =================== */

  $.fn.datepicker.noConflict = function() {
    $.fn.datepicker = old;
    return this;
  };

  /* DATEPICKER VERSION
   * =================== */
  $.fn.datepicker.version = '1.6.0-dev';

  /* DATEPICKER DATA-API
   * ================== */

  $(document).on(
    'focus.datepicker.data-api click.datepicker.data-api',
    '[data-provide="datepicker"]',
    function(e) {
      var $this = $(this);
      if ($this.data('datepicker'))
        return;
      e.preventDefault();
      // component click requires us to explicitly show it
      datepickerPlugin.call($this, 'show');
    }
  );
  $(function() {
    datepickerPlugin.call($(
      '[data-provide="datepicker-inline"]'));
  });

}));
