/* Copyright (c) 2015 Hyunje Alex Jun and other contributors
 * Licensed under the MIT License
 */
'use strict';

var instances = require('../instances')
  , updateGeometry = require('../update-geometry')
  , updateScroll = require('../update-scroll');

function bindTouchHandler(element, i, supportsTouch, supportsIePointer) {
  function shouldPreventDefault(deltaX, deltaY) {
    var scrollTop = element.scrollTop;
    var scrollLeft = element.scrollLeft;
    var magnitudeX = Math.abs(deltaX);
    var magnitudeY = Math.abs(deltaY);

    if (magnitudeY > magnitudeX) {
      // user is perhaps trying to swipe up/down the page

      if (((deltaY < 0) && (scrollTop === i.contentHeight - i.containerHeight)) ||
          ((deltaY > 0) && (scrollTop === 0))) {
        return !i.settings.swipePropagation;
      }
    } else if (magnitudeX > magnitudeY) {
      // user is perhaps trying to swipe left/right across the page

      if (((deltaX < 0) && (scrollLeft === i.contentWidth - i.containerWidth)) ||
          ((deltaX > 0) && (scrollLeft === 0))) {
        return !i.settings.swipePropagation;
      }
    }

    return true;
  }

  function applyTouchMove(differenceX, differenceY) {
    updateScroll(element, 'top', element.scrollTop - differenceY * i.settings.swipeSpeed);
    updateScroll(element, 'left', element.scrollLeft - differenceX * i.settings.swipeSpeed);

    updateGeometry(element);
  }

  var startOffset = {};
  var startTime = 0;
  var speed = {};
  var easingLoop = null;
  var inLocalTouch = false;

  function getTouch(e) {
    if (e.targetTouches) {
      return e.targetTouches[0];
    } else {
      // Maybe IE pointer
      return e;
    }
  }
  function shouldHandle(e) {
    var pageX = undefined;
    var pageY = undefined;

    if (e.targetTouches && e.targetTouches.length === 1) {
      var touch = e.targetTouches[0];
      pageX = touch.pageX;
      pageY = touch.pageY;
    } else if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== e.MSPOINTER_TYPE_MOUSE) {
      pageX = e.pageX;
      pageY = e.pageY;
    }

    if (pageX === undefined) {
      return false;
    }

    var rect = element.getBoundingClientRect();
    if ((pageX > rect.left && pageX < (rect.left + rect.width)) && (pageY > rect.top && pageY < (rect.top + rect.height))) {
      return true;
    }

    return false;
  }
  function touchStart(e) {
    if (shouldHandle(e)) {
      inLocalTouch = true;

      var touch = getTouch(e);

      startOffset.pageX = touch.pageX;
      startOffset.pageY = touch.pageY;

      startTime = (new Date()).getTime();

      if (easingLoop !== null) {
        clearInterval(easingLoop);
      }

      e.stopPropagation();
    }
  }
  function touchEnd() {
    if (inLocalTouch) {
      inLocalTouch = false;
      clearInterval(easingLoop);
      easingLoop = setInterval(function () {
        if (!instances.get(element)) {
          clearInterval(easingLoop);
          return;
        }

        if (Math.abs(speed.x) < 0.01 && Math.abs(speed.y) < 0.01) {
          clearInterval(easingLoop);
          return;
        }

        applyTouchMove(speed.x * 30, speed.y * 30);

        speed.x *= 0.8;
        speed.y *= 0.8;
      }, 10);
    }
  }
  function touchMove(e) {
    if (shouldHandle(e)) {
      if (!inLocalTouch) {
        touchStart(e);
      }
      var touch = getTouch(e);

      var currentOffset = {pageX: touch.pageX, pageY: touch.pageY};

      var differenceX = currentOffset.pageX - startOffset.pageX;
      var differenceY = currentOffset.pageY - startOffset.pageY;

      applyTouchMove(differenceX, differenceY);
      startOffset = currentOffset;

      var currentTime = (new Date()).getTime();

      var timeGap = currentTime - startTime;
      if (timeGap > 0) {
        speed.x = differenceX / timeGap;
        speed.y = differenceY / timeGap;
        startTime = currentTime;
      }

      if (shouldPreventDefault(differenceX, differenceY)) {
        e.stopPropagation();
        e.preventDefault();
      }
    } else {
      touchEnd(e);
    }
  }

  if (supportsTouch) {
    i.event.bind(window, 'touchstart', touchStart);
    i.event.bind(window, 'touchend', touchEnd);
    i.event.bind(window, 'touchmove', touchMove);
  } else if (supportsIePointer) {
    if (window.PointerEvent) {
      i.event.bind(window, 'pointerdown', touchStart);
      i.event.bind(window, 'pointerup', touchEnd);
      i.event.bind(window, 'pointermove', touchMove);
    } else if (window.MSPointerEvent) {
      i.event.bind(window, 'MSPointerDown', touchStart);
      i.event.bind(window, 'MSPointerUp', touchEnd);
      i.event.bind(window, 'MSPointerMove', touchMove);
    }
  }
}

module.exports = function (element, supportsTouch, supportsIePointer) {
  var i = instances.get(element);
  bindTouchHandler(element, i, supportsTouch, supportsIePointer);
};
