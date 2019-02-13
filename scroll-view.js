/*
 * 模拟微信小程序的 scroll-view 组件
 * 实现微信小程序的 scroll-view 的大部分功能：https://developers.weixin.qq.com/miniprogram/dev/component/scroll-view.html
 * API如下：
 * scrollX, 与微信小程序的 scroll-x 相同
 * scrollY, 与微信小程序的 scroll-y 相同
 * upperThreshold, 与微信小程序的 upper-threshold 相同
 * lowerThreshold, 与微信小程序的 lower-threshold 相同
 * scrollTop, 与微信小程序的 scroll-top 相同
 * scrollLeft, 与微信小程序的 scroll-left 相同
 * scrollIntoView, 与微信小程序的 scroll-into-view 相同
 * scrollWithAnimation, 与微信小程序的 scroll-with-animation 相同
 * enable-back-to-top web 不支持
 * bindScrollToUpper, 与微信小程序的 bindscrolltoupper 相同
 * bindScrollToLower, 与微信小程序的 bindscrolltolower 相同
 * bindScroll, 与微信小程序的 bindscroll 相同
 * ariaLabel, 与微信小程序的 aria-label 相同
 * ariaRole, 与微信小程序的 aria-role 相同
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'

export default class ScrollView extends Component {
  static defaultProps = {
    style: null,
    className: null,
    scrollX: false,
    scrollY: false,
    upperThreshold: 50,
    lowerThreshold: 50,
    scrollTop: 0,
    scrollLeft: 0,
    scrollIntoView: '',
    scrollWithAnimation: false,
    ariaLabel: null,
    ariaRole: null,
    bindScrollToUpper: null,
    bindScrollToLower: null,
    bindScroll: null
  }
  static propTypes = {
    style: PropTypes.object,
    className: PropTypes.string,
    scrollX: PropTypes.bool,
    scrollY: PropTypes.bool,
    upperThreshold: PropTypes.number,
    lowerThreshold: PropTypes.number,
    scrollTop: PropTypes.number,
    scrollLeft: PropTypes.number,
    scrollIntoView: PropTypes.string,
    scrollWithAnimation: PropTypes.bool,
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    bindScrollToUpper: PropTypes.func,
    bindScrollToLower: PropTypes.func,
    bindScroll: PropTypes.func
  }

  static childContextTypes = {
    getImageGroup: PropTypes.func
  }

  getChildContext () {
    return {
      getImageGroup: () => this.$self
    }
  }

  // dom
  $self = null
  // eventDetail
  eventDetail = {
    scrollLeft: 0,
    scrollTop: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    offsetHeight: 0,
    offsetWidth: 0,
    deltaX: 0,
    deltaY: 0
  }

  componentDidMount () { this.handleUpdate() }
  componentDidUpdate (prevProps) { this.handleUpdate(prevProps) }
  handleUpdate (prevProps = {}) {
    const {
      scrollX,
      scrollY,
      bindScrollToUpper,
      bindScrollToLower,
      bindScroll
    } = this.props
    if (!scrollX && !scrollY) return
    const {
      scrollLeft: prevScrollLeft = 0,
      scrollTop: prevScrollTop = 0,
      scrollIntoView: prevScrollIntoView = ''
    } = prevProps
    if (
      scrollLeft !== prevScrollLeft ||
      scrollTop !== prevScrollTop ||
      bindScrollToUpper !== null ||
      bindScrollToLower !== null ||
      bindScroll !== null
    ) {
      const {
        scrollHeight,
        scrollWidth,
        offsetHeight,
        offsetWidth
      } = this.$self
      Object.assign(
        this.eventDetail,
        {
          scrollHeight,
          scrollWidth,
          offsetHeight,
          offsetWidth
        }
      )
    }
    const { scrollIntoView } = this.props
    let { scrollLeft, scrollTop } = this.props
    const { $self } = this
    if (
      scrollLeft === prevScrollLeft &&
      scrollTop === prevScrollTop &&
      scrollIntoView !== prevScrollIntoView
    ) {
      // 定位到指定ID号的子元素(scrollIntoView的优先级低于 scrollLeft & scrollTop，所以当 scrollLeft & scrollTop 都未指定值时才需要做处理)
      const $targetNode = $self.querySelector(`#${scrollIntoView}`)
      if ($targetNode !== null) {
        // 目标元素存在
        const rect = $self.getBoundingClientRect()
        const targetRect = $targetNode.getBoundingClientRect()
        scrollLeft += targetRect.left - rect.left
        scrollTop += targetRect.top - rect.top
      }
    }
    // 调用滚动方法
    this.scrollTo(prevScrollLeft, scrollLeft, prevScrollTop, scrollTop)
  }
  scrollTo (startX, endX, startY, endY) {
    const { scrollWithAnimation } = this.props
    const {
      $self,
      eventDetail: {
        scrollHeight,
        scrollWidth,
        offsetHeight,
        offsetWidth
      }
    } = this
    if (!scrollWithAnimation) {
      // 没有动画
      $self.scrollLeft = endX
      $self.scrollTop = endY
    } else {
      // 动画
      endX = Math.min(endX, scrollWidth - offsetWidth)
      endY = Math.min(endY, scrollHeight - offsetHeight)
      this.anim(
        startX, endX, startY, endY, 300,
        (x, y) => {
          $self.scrollLeft = x
          $self.scrollTop = y
        }
      )
    }
  }
  anim (startX, endX, startY, endY, duration, update) {
    // 动画函数
    const interval = 16.666
    const velocityX = (endX - startX) / duration
    const velocityY = (endY - startY) / duration
    // 没有速度
    if (velocityX === 0 && velocityY === 0) return
    const startTime = Date.now()
    this.siv && clearInterval(this.siv)
    this.siv = setInterval(
      () => {
        const currentTime = Date.now()
        const elapse = currentTime - startTime
        update(velocityX * elapse, velocityY * elapse)
        if (elapse >= duration) {
          clearInterval(this.siv)
        }
      },
      interval
    )
  }
  handleScroll = e => {
    const {
      upperThreshold,
      lowerThreshold,
      bindScrollToUpper,
      bindScrollToLower,
      bindScroll
    } = this.props
    const {
      target: {
        scrollLeft: nextScrollLeft,
        scrollTop: nextScrollTop
      }
    } = e
    const {
      eventDetail,
      eventDetail: {
        scrollLeft,
        scrollTop,
        scrollWidth,
        scrollHeight,
        offsetWidth,
        offsetHeight
      }
    } = this
    if (bindScrollToUpper !== null) {
      // 监听滚动到顶部
      if (
        (scrollLeft !== nextScrollLeft && (
          (scrollLeft >= upperThreshold && nextScrollLeft <= upperThreshold) ||
          (scrollLeft <= upperThreshold && nextScrollLeft >= upperThreshold)
        ))
        ||
        (scrollTop !== nextScrollTop && (
          (scrollTop >= upperThreshold && nextScrollTop <= upperThreshold) ||
          (scrollTop <= upperThreshold && nextScrollTop >= upperThreshold)
        ))
      ) {
        bindScrollToUpper()
      }
    }
    if (bindScrollToLower !== null) {
      // 监听滚动到底部
      const scrollRight = scrollWidth - offsetWidth - scrollLeft
      const nextScrollRight = scrollWidth - offsetWidth - nextScrollLeft
      const scrollBottom = scrollHeight - offsetHeight - scrollTop
      const nextScrollBottom = scrollHeight - offsetHeight - nextScrollTop
      if (
        (scrollRight !== nextScrollRight && (
          (scrollRight >= lowerThreshold && nextScrollRight <= lowerThreshold) ||
          (scrollRight <= lowerThreshold && nextScrollRight >= lowerThreshold)
        ))
        ||
        (scrollBottom !== nextScrollBottom && (
          (scrollBottom >= lowerThreshold && nextScrollBottom <= lowerThreshold) ||
          (scrollBottom <= lowerThreshold && nextScrollBottom >= lowerThreshold)
        ))
      ) {
        bindScrollToLower()
      }
    }
    // 合成新的 eventDetail
    Object.assign(
      eventDetail,
      {
        scrollLeft: nextScrollLeft,
        scrollTop: nextScrollTop,
        deltaX: nextScrollLeft - scrollLeft,
        deltaY: nextScrollTop - scrollTop
      }
    )
    bindScroll && bindScroll(eventDetail)
  }

  render () {
    const {
      style,
      className,
      scrollX,
      scrollY,
      ariaLabel,
      ariaRole,
      bindScrollToUpper,
      bindScrollToLower,
      bindScroll,
      children
    } = this.props
    style.overflowX = scrollX ? 'auto' : 'hidden'
    style.overflowY = scrollY ? 'auto' : 'hidden'
    // 是否要监听滚动
    let { handleScroll } = this
    if (
      bindScrollToUpper === null &&
      bindScrollToLower === null &&
      bindScroll === null
    ) {
      // 不需要监听事件
      handleScroll = null
    }
    return <div
      className={className}
      style={style}
      aria-role={ariaRole}
      aria-label={ariaLabel}
      style={style}
      onScroll={handleScroll}
      ref={$ => {this.$self = $}}
    >
      {children}
    </div>
  }
}
