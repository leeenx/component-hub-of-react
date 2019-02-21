/**
 * 可以把 ImageGroup 当作 div 来使用，因为它的作用仅仅是为 Image 组件提供 group
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'

export default class ImageGroup extends Component {
  static childContextTypes = {
    getViewport: PropTypes.func
  }

  getChildContext () {
    return {
      getViewport: () => this.$self
    }
  }
  $self = null
  componentDidMount () {
    this.$self = this.$
  }
  render () {
    const { props, props: { children } } = this
    return <div
      {...props}
      ref={ $ => { this.$ = $ } }
    >
      { children }
    </div>
  }
}
