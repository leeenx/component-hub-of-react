/*
 * 模拟微信小程序的 Image 组件
 * 实现微信小程序的 Image 的全部功能：https://developers.weixin.qq.com/miniprogram/dev/component/image.html
 * API如下：
 * src, 与微信小程序相同
 * mode，与微信小程序相同
 * lazyLoad, 与微信小程序的 lazy-load 相同
 * onError，与微信小程序的 binderror 相同
 * onLoad，与微信小程序的 bindload 相同
 * 扩展
 * 通过 Image.setConfig({ config }) 来配置一些额外信息
 * config 结构如下：
 * @ loadingImg: { src, mode } ---- 加载中的占位图，src 与 mode 与上面的同名API功能一致
 * @ errorImg: { src, mode } ---- 加载抢购的占位图，src 与 mode 与上面的同名API功能一致
 * update，通过改变化 update 值可以更新图片的 boundingClientRect 信息 ---- 如果传入 Date.now，效果同 aways
 * update === 'aways' 每次 render 都会更新图片的 boundingClientRect 信息 ---- 比较耗性能
 * 注意事项：display 取 block 值时，请保证宽高
 */

import Nerv from 'nervjs'
import PropTypes from 'prop-types'

// 声明一个 undefine 常量
const UNDEFINED = (function () {}())

// ID 生成器
const keyGenerator = (function () {
  let order = 0
  return () => `key-${order++}`
}())

// 图片缓存
const imageCache = {}

// 加载单图
function loadImage (src) {
  let cache = imageCache[src]
  if (!cache) {
    // 没有缓存
    cache = new Promise((resolve, reject) => {
      const $image = new Image()
      $image.onload = () => {
        const { naturalWidth: width, naturalHeight: height } = $image
        resolve({ width, height })
      }
      $image.onerror = e => reject(e)
      $image.src = src
    })
      .then(result => result)
      .catch(e => e)
    imageCache[src] = cache
  }
  return cache
}

// 加载图片列表
function loadImageList (...list) {
  return Promise.all(list.map(src => loadImage(src)))
}

// 按 mode 显示图片，返回结果样式
function fitImage (options) {
  const {
    mode,
    width,
    height,
    imageWidth,
    imageHeight
  } = options

  if (
    width === 0 ||
    height === 0 ||
    imageWidth === 0 ||
    imageHeight === 0
  ) {
    // 无需要处理
    return {}
  }

  const imageRatio = imageHeight / imageWidth
  const ratio = height / width
  let style = {}

  switch (mode) {
    case 'aspectFit':
      if (imageRatio > ratio) {
        // 图片比容器长
        style = {
          position: 'relative',
          display: 'block',
          width: `${height / imageRatio}px`,
          height: `${height}px`,
          top: 0,
          left: `${(width - (height / imageRatio))}px`
        }
      } else {
        // 图片比容器扁
        style = {
          display: 'block',
          width: `${width}px`,
          height: `${width * imageRatio}px`,
          marginTop: `${(height - (width * imageRatio)) / 2}px`,
          marginLeft: 0
        }
      }
      break
    case 'aspectFill':
      if (imageRatio > ratio) {
        // 图片比容器长
        style = {
          display: 'block',
          width: `${width}px`,
          height: `${width * imageRatio}px`,
          marginTop: `${(height - (width * imageRatio)) / 2}px`,
          marginLeft: 0
        }
      } else {
        // 图片比窗口扁
        style = {
          display: 'block',
          width: `${height / imageRatio}px`,
          height: `${height}px`,
          marginTop: 0,
          marginLeft: `${(width - (height / imageRatio)) / 2}px`
        }
      }
      break
    case 'widthFix':
      style = {
        display: 'block',
        width: `${width}px`,
        height: 'auto',
        marginTop: 0,
        marginLeft: 0
      }
      break
    case 'top':
      style = {
        display: 'block',
        marginTop: 0,
        marginLeft: `${(width - imageWidth) / 2}px`
      }
      break
    case 'bottom':
      style = {
        display: 'block',
        marginTop: `${height - imageHeight}px`,
        marginLeft: `${(width - imageWidth) / 2}px`
      }
      break
    case 'center':
      style = {
        display: 'block',
        marginTop: `${(height - imageHeight) / 2}px`,
        marginLeft: `${(width - imageWidth) / 2}px`
      }
      break
    case 'left':
      style = {
        display: 'block',
        marginTop: `${(height - imageHeight) / 2}px`,
        marginLeft: 0
      }
      break
    case 'right':
      style = {
        display: 'block',
        marginTop: `${(height - imageHeight) / 2}px`,
        marginLeft: `${width - imageWidth}px`
      }
      break
    case 'top left':
      style = {
        display: 'block',
        marginTop: 0,
        marginLeft: 0
      }
      break
    case 'top right':
      style = {
        display: 'block',
        marginTop: 0,
        marginLeft: `${width - imageWidth}px`
      }
      break
    case 'bottom left':
      style = {
        display: 'block',
        marginTop: `${height - imageHeight}px`,
        marginLeft: 0
      }
      break
    case 'bottom right':
      style = {
        display: 'block',
        marginTop: `${height - imageHeight}px`,
        marginLeft: `${width - imageWidth}px`
      }
      break
    case 'scaleToFill':
    default:
      style = {
        display: 'block',
        width: `${width}px`,
        height: `${height}px`
      }
  }
  return style
}

// 图片快照
const imageSnaps = {}

// 注册图片
function register ({
  id,
  mode,
  $self,
  $group,
  src,
  onLoad,
  onLoadStart,
  onError
}) {
  const prevSnap = imageSnaps[id]
  // 是否需要重新生成快照
  let needNewSnap = prevSnap === UNDEFINED
  if (needNewSnap === false) {
    if (src !== prevSnap.src) {
      // 「路径」变了，表示快照需要重新生成
      needNewSnap = true
    }
    if (
      src !== prevSnap.src ||
      $group !== prevSnap.$group
    ) {
      // 「路径」或「组」有变化，从组中删除
      removeSnapFromGroup(prevSnap)
    }
  }
  if (needNewSnap === true) {
    const rect = {}
    // 创建新的快照
    imageSnaps[id] = {
      id,
      mode,
      src,
      $self,
      $group,
      rect,
      status: 'unload',
      load () {
        if (this.status !== 'unload') return
        this.status = 'loading'
        onLoadStart(rect)
        loadImage(src)
          .then(
            imageRect => onLoad(imageRect)
          )
          .catch(() => onError())
      }
    }
  }
  const snap = imageSnaps[id]
  // 生成/更新自己的 boundingRect
  const { top, left, width, height } = $self.getBoundingClientRect()
  Object.assign(snap.rect, { top, left, width, height })
  // 将快照加到对应的group
  addSnapToGroup(snap)
  return snap.rect
}

// 按 group 来存图片快照
const groupInfoSet = new Map()

// groupInfo 对象
class GroupInfo {
  static waitTime = 300
  constructor ($group) {
    this.$group = $group
    this.update()
    // 监听滚动
    $group.addEventListener('scroll', this.handleScroll)
  }
  x = 0
  y = 0
  nextX = 0
  nextY = 0
  wait = false
  rect = {}
  // 未加载图片快照列表
  unloadSnaps = {}
  // 分屏网格
  grid = []

  // 添加 snap
  addSnap (snap) {
    const { id } = snap
    // 按 id 存储
    this.unloadSnaps[id] = snap
  }

  // 删除 snap
  removeSnap (snap) {
    const { id } = snap
    delete this.unloadSnaps[id]
  }

  // 填充网格的单元格
  setCell (row, col, snap) {
    const { grid } = this
    if (grid[row] === UNDEFINED) {
      grid[row] = []
    }
    if (grid[row][col] === UNDEFINED) {
      grid[row][col] = []
    }
    grid[row][col].push(snap)
  }

  // 加载单元格的快照
  loadCell (row, col) {
    const { grid } = this
    if (
      grid[row] === UNDEFINED ||
      grid[row][col] === UNDEFINED ||
      grid[row][col].length === 0
    ) {
      // 单元格下没有图片
      return
    }
    const cell = grid[row][col]
    cell.forEach(snap => snap.load())
    // 清空单元格
    cell.length = []
  }

  // 更新网络
  updateGrid () {
    const {
      unloadSnaps,
      grid,
      x,
      y,
      rect: {
        width,
        height
      }
    } = this
    // 清空网格
    grid.length = []
    for (const name in unloadSnaps) {
      const snap = unloadSnaps[name]
      const {
        rect: {
          top: snapTop = 0,
          left: snapLeft = 0
        }
      } = snap
      // 相对于容器的坐标
      const relative = {
        x: snapLeft - x,
        y: snapTop - y
      }
      const row = Math.floor(relative.y / height)
      const col = Math.floor(relative.x / width)
      this.setCell(row, col, snap)
    }
  }

  // group 更新
  update () {
    // 等待更新中
    if (this.updating === true) return
    // 更新合并
    this.updating = true
    Promise.resolve().then(
      () => {
        const { $group } = this
        // 更新 $group 的 boundingRect
        this.rect = (
          $group === window ?
            {
              top: 0,
              left: 0,
              width: document.documentElement.clientWidth,
              height: document.documentElement.clientHeight
            } :
            $group.getBoundingClientRect()
        )
        this.updateGrid()
        this.wait = false
        this.updating = false
        // 滚动条坐标
        this.updatePosition()
      }
    )
  }

  // 更新滚动位置
  updatePosition () {
    const {
      wait,
      nextX,
      nextY,
      x,
      y,
      rect: {
        width,
        height
      }
    } = this
    const waitTime = GroupInfo.waitTime
    if (wait === false) {
      // 非等待中
      this.wait = true
      this.x = nextX
      this.y = nextY

      // 按屏加载
      const row = nextY / height
      const col = nextX / width

      const startRow = Math.floor(row)
      const endRow = Math.ceil(row)
      const startCol = Math.floor(col)
      const endCol = Math.floor(col)

      for (let i = startRow; i <= endRow; ++i) {
        for (let j = startCol; j <= endCol; ++j) {
          this.loadCell(i, j)
        }
      }

      // 节流
      setTimeout(
        () => {
          this.wait = false
          // 实时取 nextX & nextY
          const { nextX, nextY } = this
          if (x !== nextX || y !== nextY) {
            // 需要更新滚动位置
            this.updatePosition()
          }
        },
        waitTime
      )
    }
  }

  handleScroll = () => {
    const {
      scrollX = 0,
      scrollY = 0,
      scrollLeft = 0,
      scrollTop = 0
    } = this.$group
    this.nextX = scrollX || scrollLeft
    this.nextY = scrollY || scrollTop
    this.updatePosition()
  }
}

// 将图片快照存入 group
function addSnapToGroup (snap) {
  const { $group } = snap
  if (groupInfoSet.has($group) === false) {
    // 不存在
    groupInfoSet.set($group, new GroupInfo($group))
  }
  const groupInfo = groupInfoSet.get($group)
  groupInfo.addSnap(snap)
  // 更新 $group
  groupInfo.update()
}

// 将图片快照从 group 中删除
function removeSnapFromGroup (snap) {
  const { $group } = snap
  if (groupInfoSet.has($group)) {
    const groupInfo = groupInfoSet.get($group)
    groupInfo.removeSnap(snap)
  }
}

// 默认占位节点
const DEFAULT_LOADING_IMG = {
  text: '努力加载中...',
  src: '//misc.360buyimg.com/lib/skin/e/i/error-jd.gif',
  width: 100,
  height: 100
}
const DEFAULT_ERROR_IMG = {
  text: '加载失败',
  src: '//img11.360buyimg.com/jdphoto/s150x129_jfs/t1/25294/11/986/1390/5c0e7d65E9b96ef95/f9472bc971ba1673.png',
  width: 100,
  height: 100
}

// 当前使用的占位图片
const LOADING_IMG = {}
const ERROR_IMG = {}

function getPlaceHold ({ status = 'loading', width, height }) {
  const placehold = status === 'error' ? ERROR_IMG : LOADING_IMG
  const {
    text = '',
    width: imageWidth,
    height: imageHeight,
    mode = 'center',
    src
  } = placehold
  const fitStyle = fitImage({
    mode,
    width,
    height,
    imageWidth,
    imageHeight
  })
  if (text === '') {
    // 有图片
    const style = Object.assign(
      {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
      },
      fitStyle
    )
    return <img style={style} src={src} />
  }
  // 文本
  const style = Object.assign(
    {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      lineHeight: `${height}px`,
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      textAlign: 'center',
      fontSize: '14px'
    },
    fitStyle
  )
  return <div style={style}>{text}</div>
}

// 表示 loadingImg 与 errorImg 已经处理
let onReady

// 设置配置
function setConfig ({ loadingImg = {}, errorImg = {} } = {}, mode = 'center') {
  loadingImg = Object.assign(
    {},
    { src: DEFAULT_LOADING_IMG.src, mode },
    loadingImg
  )
  errorImg = Object.assign(
    {},
    { src: DEFAULT_ERROR_IMG.src, mode },
    errorImg
  )
  onReady = loadImageList(loadingImg.src, errorImg.src)
  // 设置默认的占位图
  onReady.then(
    ([loadingImgSize, errorImgSize]) => {
      if (loadingImgSize.width !== UNDEFINED) {
        // 生成 LOADING 占位
        Object.assign(
          LOADING_IMG,
          loadingImg,
          loadingImgSize,
          { text: '' }
        )
      }
      if (errorImgSize.width !== UNDEFINED) {
        // 生成错误图片占位
        Object.assign(
          ERROR_IMG,
          errorImg,
          errorImgSize,
          { text: '' }
        )
      }
    }
  )
}

// 使用默认配置
setConfig()

export default class Picture extends Nerv.Component {
  // 更新渲染
  updateRender () {
    this.setState({ update: this.state.update + 1 })
  }

  // 初始化图片
  updateImage () {
    const {
      id,
      $self,
      onLoad,
      onLoadStart,
      onError,
      props: { mode, src, group }
    } = this
    // 将图片按 id 号注册
    const rect = register({
      id,
      mode,
      src,
      $self,
      $group: group,
      onLoad,
      onLoadStart,
      onError
    })
    this.onRectComputed(rect)
  }

  // 进入加载状态
  onLoadStart = () => {
    this.setState({ status: 'loading' })
  }

  // 加载成功
  onLoad = ({ width, height }) => {
    this.props.onLoad({ height, width })
    // 记录图片的原生尺寸
    this.size = { width, height }
    this.setState({ status: 'loaded' })
  }

  // 加载失败
  onError = errMsg => {
    this.props.onError({ errMsg })
    this.setState({ status: 'error' })
  }

  // 在容器节点执行 getBoundingClientRect 后触发
  onRectComputed (rect) {
    const { width, height } = this.rect
    if (width !== rect.width || height !== rect.height) {
      // 尺寸有变化
      Object.assign(this.rect, rect)
      // 更新渲染
      this.updateRender()
    }
  }

  getImage () {
    // 初始配置还没完成，直接返回空
    if (this.configIsReady === false) return null
    const { status } = this.state
    const { width = 0, height = 0 } = this.rect
    const { width: imageWidth = 0, height: imageHeight = 0 } = this.size
    const { mode, src } = this.props
    switch (status) {
      case 'loaded': {
        const style = fitImage({ mode, width, height, imageWidth, imageHeight })
        return <img src={src} style={style} />
      }
      case 'error':
      case 'unload':
      case 'loading':
        return (
          <div style={{ width: `${width}px`, height: `${height}px`, overflow: 'hidden' }}>
            {getPlaceHold({ status, width, height })}
          </div>
        )
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    // 针对下以 props 进行判断
    let needRender = (
      nextState.update !== this.state.update ||
      nextState.status !== this.state.status ||
      nextState.configIsReady !== this.state.configIsReady
    )
    if (needRender === false) {
      needRender = [
        'mode',
        'lazyLoad',
        'onError',
        'onLoad',
        'src',
        'className',
        'group'
      ].some(
        name => nextProps[name] !== this.props[name]
      )
    }
    if (needRender === false) {
      const { style } = this.props
      const { nextStyle = {} } = nextProps
      for (const key in style) {
        if (style[key] !== nextStyle[key]) {
          needRender = true
          break
        }
      }
    }
    if (needRender === false) {
      const { style } = this.props
      const { nextStyle = {} } = nextProps
      for (const key in nextStyle) {
        if (style[key] !== nextStyle[key]) {
          needRender = true
          break
        }
      }
    }
    if (
      needRender === false &&
      (
        this.props.update !== nextProps.update ||
        this.props.update === 'aways'
      )
    ) {
      // 只需要更新图片的信息
      this.updateImage()
    }
    return needRender
  }

  componentDidMount () {
    // 生成 ID
    this.id = keyGenerator()
    // 挂载成功
    onReady.then(
      () => {
        // 在显示 placehold 之前，计算图片的尺寸
        this.updateImage()
        this.setState({ configIsReady: true })
      }
    )
  }

  componentDidUpdate (prevProps) {
    // 更新成功 - 处理 className 和 style 引起的变化
    if (this.state.configIsReady === true) {
      const { update, className, style = {} } = this.props
      const { prevStyle = {} } = prevProps
      let needUpdateImage = prevProps.className !== className
      if (update !== prevProps.update || update === 'aways') {
        needUpdateImage = true
      }
      if (needUpdateImage === false) {
        // 对比 style 方法
        for (const key in style) {
          if (style[key] !== prevStyle[key]) {
            needUpdateImage = true
            break
          }
        }
      }
      if (needUpdateImage === false) {
        // 对比 style 方法
        for (const key in prevStyle) {
          if (style[key] !== prevStyle[key]) {
            needUpdateImage = true
            break
          }
        }
      }
      if (needUpdateImage === true) {
        // 更新图片
        this.updateImage()
      }
    }
  }

  render () {
    const {
      title,
      className
    } = this.props

    // 保证模拟器样式
    const style = Object.assign(
      {
        outline: '0 none',
        cursor: 'default'
      },
      this.props.style,
      {
        border: '0 none',
        padding: '0',
        overflow: 'hidden',
        '-ms-appearance': 'none',
        '-moz-appearance': 'none',
        '-webkit-appearance': 'none',
        appearance: 'none'
      }
    )

    const $image = this.getImage()

    return <button
      className={className}
      style={style}
      ref={ $ => (this.$self = $) }
      title={title}
    >
      {
        $image
      }
    </button>
  }
  static setConfig = (...arg) => setConfig(...arg)
  state = { update: 0, configIsReady: false, status: 'unload' }
  $self = null
  // 容器边界
  rect = {}
  // 原生图片尺寸
  size = {}

  static defaultProps = {
    src: '',
    title: '',
    alt: '',
    lazyLoad: false,
    onError () {},
    onLoad () {},
    className () {},
    group: window,
    style: null,
    mode: 'scaleToFill'
  }
  static propTypes = {
    src: PropTypes.string,
    title: PropTypes.string,
    alt: PropTypes.string,
    lazyLoad: PropTypes.bool,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    className: PropTypes.string,
    group: PropTypes.object,
    style: PropTypes.object,
    mode: PropTypes.oneOf([
      'scaleToFill',
      'aspectFit',
      'aspectFill',
      'widthFix',
      'top',
      'bottom',
      'center',
      'left',
      'right',
      'top left',
      'top right',
      'bottom left',
      'bottom right'
    ])
  }
}
