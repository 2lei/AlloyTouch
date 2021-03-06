﻿/* AlloyTouch v0.1.2
 * By AlloyTeam http://www.alloyteam.com/
 * Github: https://github.com/AlloyTeam/AlloyTouch
 * MIT Licensed.
 */
; (function () {

    var _elementStyle = document.createElement('div').style,
        endTransitionEventName,
        transitionDuration,
        transitionTimingFunction,
        transform;

    if ('transform' in _elementStyle) {
        transform = 'transform';
        endTransitionEventName = 'transitionend';
        transitionDuration = 'transitionDuration';
        transitionTimingFunction = 'transitionTimingFunction';
    } else if ('webkitTransform' in _elementStyle) {
        transform = 'webkitTransform';
        endTransitionEventName = 'webkitTransitionEnd';
        transitionDuration = 'webkitTransitionDuration';
        transitionTimingFunction = 'webkitTransitionTimingFunction';
    } else {
        throw 'please use a modern browser'
    }

    var ease = 'cubic-bezier(0.1, 0.57, 0.1, 1)';

    function reverseEase(y) {
        return 1 - Math.sqrt(1 - y * y);
    }

    function bind(element, type, callback) {
        element.addEventListener(type, callback, false);
    }

    function unbind(element, type, callback) {
        element.removeEventListener(type, callback);
    }

    function preventDefaultTest(el, exceptions) {
        for (var i in exceptions) {
            if (exceptions[i].test(el[i])) {
                return true;
            }
        }
        return false;
    }

    var AlloyTouch = function (option) {
        this.scroller = option.target;
        this.element = typeof option.touch === "string" ? document.querySelector(option.touch) : option.touch;
        this.vertical = this._getValue(option.vertical,true) ;
        this.property = option.property;
        this.preventDefault = this._getValue(option.preventDefault,true) ;
        this.sensitivity =  this._getValue(option.sensitivity,1);


        this.moveFactor = this._getValue(option.moveFactor, 1);
        this.factor = this._getValue(option.factor, 1);
        this.sf = this.sensitivity * this.factor;
        this.outFactor =  this._getValue(option.outFactor, 0.3);

        this.min = option.min;
        this.max = option.max;

        this.maxRegion = this._getValue(option.maxRegion,60);

        this.deceleration = 0.0006;
        //css版本不再支持change事件
        //this.change = option.change || function () { };
        this.touchEnd = option.touchEnd || function () {
            };
        this.touchStart = option.touchStart || function () {
            };
        this.touchMove = option.touchMove || function () {
            };
        this.animationEnd = option.animationEnd || function () {
            };

        this.preventDefaultException = {tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/};
        this.hasMin = !(this.min === undefined);
        this.hasMax = !(this.max === undefined);
        this.isTouchStart = false;
        this.step = option.step;
        this.inertia = this._getValue(option.inertia,true);

        if (this.hasMax && this.hasMin) {
            if (this.min > this.max) throw "min value can't be greater than max value";
            this.currentPage = Math.round((this.max - this.scroller[this.property]) / this.step);
        }

        this._startHandler = this._start.bind(this);
        this._moveHandler = this._move.bind(this);
        this._transitionEndHandler = this._transitionEnd.bind(this);
        this._endHandler = this._end.bind(this);
        this._cancelHandler = this._cancel.bind(this);
        bind(this.element, "touchstart", this._startHandler);
        bind(this.scroller, endTransitionEventName, this._transitionEndHandler);
        bind(window, "touchmove", this._moveHandler);
        bind(window, "touchend", this._endHandler);
        bind(window, "touchcancel", this._cancelHandler);
        //当有step设置的时候防止执行两次end
        this._endCallbackTag = true;

        this._endTimeout = null;
    };

    AlloyTouch.prototype = {
        _getValue: function (obj, defaultValue) {
            return obj === undefined ? defaultValue : obj;
        },
        _transitionEnd: function () {
            var current = this.scroller[this.property];
            if (current < this.min) {
                this.to(this.min, 600, ease);
                return;
            } else if (current > this.max) {
                this.to(this.max, 600, ease);
                return;
            }

            if (this.step) {
                this.correction();
                if (this._endCallbackTag) {
                    this._endTimeout = setTimeout(function () {
                        this.animationEnd(current);
                    }.bind(this), 400);
                    this._endCallbackTag = false;
                }
            } else {
                this.animationEnd(current);
            }
        },
        _cancelAnimation: function () {
            this.scroller.style[transitionDuration] = '0ms';
            this.scroller.style[transform] = window.getComputedStyle(this.scroller)[transform];

        },
        _start: function (evt) {
            this._endCallbackTag = true;
            this.isTouchStart = true;
            this._firstTouchMove = true;
            this._preventMoveDefault = true;
            this.touchStart(this.scroller[this.property]);
            this._cancelAnimation();
            clearTimeout(this._endTimeout);
            if (this.hasMax && this.hasMin) {
                this.currentPage = Math.round((this.max - this.scroller[this.property]) / this.step);
            }
            this.startTime = new Date().getTime();
            this._startX = this.preX = evt.touches[0].pageX;
            this._startY = this.preY = evt.touches[0].pageY;
            this.start = this.vertical ? this.preY : this.preX;
        },
        _move: function (evt) {
            if (this.isTouchStart) {
                var dx = Math.abs(evt.touches[0].pageX - this._startX), dy = Math.abs(evt.touches[0].pageY - this._startY);
                if (this._firstTouchMove) {
                    var dDis = dx - dy;
                    if (dDis > 0 && this.vertical) {
                        this._preventMoveDefault = false;
                    } else if (dDis < 0 && !this.vertical) {
                        this._preventMoveDefault = false;
                    }
                    this._firstTouchMove = false;
                }
                if (dx < 10 && dy < 10) return;

                if (this._preventMoveDefault) {
                    var f = this.moveFactor;
                    var d = (this.vertical ? evt.touches[0].pageY - this.preY : evt.touches[0].pageX - this.preX) * this.sf;
                    if (this.hasMax && this.scroller[this.property] > this.max && d > 0) {
                        f = this.outFactor;
                    } else if (this.hasMin && this.scroller[this.property] < this.min && d < 0) {
                        f = this.outFactor;
                    }
                    d *= f;
                    this.preX = evt.touches[0].pageX;
                    this.preY = evt.touches[0].pageY;
                    this.scroller[this.property] += d;

                    var timestamp = new Date().getTime();
                    if (timestamp - this.startTime > 300) {
                        this.startTime = timestamp;
                        this.start = this.vertical ? this.preY : this.preX;
                    }
                    this.touchMove(this.scroller[this.property]);

                    if (this.preventDefault && !preventDefaultTest(evt.target, this.preventDefaultException)) {
                        evt.preventDefault();
                    }
                }
            }
        },
        _end: function (evt) {
            if (this.isTouchStart && this._preventMoveDefault) {
                var self = this;
                this.touchEnd(this.scroller[this.property]);
                if (this.hasMax && this.scroller[this.property] > this.max) {
                    this.to(this.max, 600, ease);
                } else if (this.hasMin && this.scroller[this.property] < this.min) {
                    this.to(this.min, 600, ease);
                } else if (this.inertia) {
                    var dt = new Date().getTime() - this.startTime;
                    if (dt < 300) {

                        var distance = ((this.vertical ? evt.changedTouches[0].pageY : evt.changedTouches[0].pageX) - this.start) * this.sensitivity,
                            speed = Math.abs(distance) / dt,
                            speed2 = this.factor * speed,
                            destination = this.scroller[this.property] + (speed2 * speed2) / (2 * this.deceleration) * (distance < 0 ? -1 : 1);
                        var tRatio = 1;
                        if (destination < this.min - this.maxRegion) {
                            tRatio = reverseEase((this.scroller[this.property] - this.min + this.maxRegion) / (this.scroller[this.property] - destination));
                            destination = this.min - this.maxRegion;

                        } else if (destination > this.max + this.maxRegion) {
                            tRatio = reverseEase((this.max + this.maxRegion - this.scroller[this.property]) / (destination - this.scroller[this.property]));
                            destination = this.max + this.maxRegion;
                        }
                        var duration = Math.round(speed / self.deceleration) * tRatio;

                        self.to(Math.round(destination), duration, ease);
                    } else {
                        if (self.step) {
                            self.correction();
                        }
                    }
                } else {
                    if (self.step) {
                        self.correction();
                    }
                }
                if (this.preventDefault && !preventDefaultTest(evt.target, this.preventDefaultException)) {
                    evt.preventDefault();
                }
                this.isTouchStart = false;
            }
        },
        _cancel: function () {
            if (this.step) {
                this.correction();
            }
        },
        to: function (value, time, ease) {
            var el = this.scroller,
                property = this.property;
            el.style[transitionDuration] = time + 'ms';
            el.style[transitionTimingFunction] = ease;
            el[property] = value;
        },
        correction: function () {
            var m_str = window.getComputedStyle(this.scroller)[transform];
            var value = this.vertical ? parseInt(m_str.split(',')[13]) : parseInt(m_str.split(',')[12]);
            var rpt = Math.floor(Math.abs(value / this.step));
            var dy = value % this.step;
            var result;
            if (Math.abs(dy) > this.step / 2) {
                result = (value < 0 ? -1 : 1) * (rpt + 1) * this.step;
                if (result > this.max) result = this.max;
                if (result < this.min) result = this.min;
                this.to(result, 400, ease);
            } else {
                result = (value < 0 ? -1 : 1) * rpt * this.step;
                if (result > this.max) result = this.max;
                if (result < this.min) result = this.min;
                this.to(result, 400, ease);
            }
        },
        destroy: function () {
            unbind(this.element, "touchstart", this._startHandler);
            unbind(this.scroller, endTransitionEventName, this._transitionEndHandler);
            unbind(window, "touchmove", this._moveHandler);
            unbind(window, "touchend", this._endHandler);
            unbind(window, "touchcancel", this._cancelHandler);
        }
    };

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = AlloyTouch;
    } else {
        window.AlloyTouch = AlloyTouch;
    }

})();