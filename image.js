/*
 * 模拟微信的 Image 组件
 * 通过 props 来控制细节
 * 参见：https://developers.weixin.qq.com/miniprogram/dev/component/image.html
 * binderror & bindload 在本组件是使用标准的 React 勾子: onError & onLoad
 * update ---- 更新图片位置;本组件只在 componentDidMout 记录坐标信息，但是不排除一些特殊情况需要重新更新
 * group ---- 当前组件的容器，默认是 window。
 * placehold ---- 未加载的占位图
 * placeholdMode ---- 针对 placehold 的模式，参见 mode
 * fail ---- 加载失败的占位图
 * failMode ---- 针对 fail 的模式，参见 error
 * rect ---- 手动指定图片的{ width, height, top, left }，用于提升性能
 */
import Nerv from 'nervjs'
import PropTypes from 'prop-types'
import { isNumber } from 'util';

let imageStamp = 0

// 视窗大小
let viewportWidth = document.documentElement.clientWidth
let viewportHeight = document.documentElement.clientHeight

// 滚动条位置
let viewportTop = window.scrollY
let viewportLeft = window.scrollX

// 全局图片
const globalImageSnap = {}
// 全局图片分组 ---- 使用 globalGroups[row][column] 来表示图片的位置
const globalGroups = []

function setGridList (list, row, column) {
  if (!list[row]) { list[row] = [] }
  if (!list[row][column]) { list[row][column] = { status: 'unload', list: [] } }
}

function globalLoad () {
  // 视窗尺寸不能为0
  if (viewportWidth === 0 || viewportHeight === 0) return
  const row = viewportTop / viewportHeight
  const rowFrom = Math.floor(row)
  const rowTo = Math.ceil(row)
  const column = viewportLeft / viewportWidth
  const columnFrom = Math.floor(column)
  const columnTo = Math.ceil(column)

  for (let i = rowFrom; i <= rowTo; ++i) {
    for (let j = columnFrom; j <= columnTo; ++j) {
      setGridList(globalGroups, i, j)
      const group = globalGroups[i][j]
      const { list, status } = group
      if (status === 'unload' && list.length > 0) {
        group.status = 'loading'
        // 加载图片
        loadImages(list).then(() => {
          // 加载完成
          group.status = 'unload'
          // 清空队列
          list.length = 0
        })
      }
    }
  }
}

// 加载过的图片
const imageCache = {}

// 加载多图
function loadImages (list) {
  return new Promise(
    resolve => {
      let count = list.length
      list.forEach(item => {
        const { src, status, onLoad, onError } = item
        if (status === 'unload') {
          item.status = 'loading'
          loadImage(src)
            .then(
              size => {
                onLoad(size)
                --count === 0 && resolve()
              }
            )
            .catch(
              e => {
                onError(e)
                // 整体加载不做报错处理
                --count === 0 && resolve()
              }
            )
        }
      })
    }
  )
}

// 加载单图
function loadImage (src) {
  return new Promise(
    (resolve, reject) => {
      if (imageCache[src]) {
        resolve(imageCache[src])
      } else {
        const $image = new Image()
        $image.onload = () => {
          const { naturalWidth: imageWidth, naturalHeight: imageHeight } = $image
          // 标记有缓存了
          imageCache[src] = { imageWidth, imageHeight }
          resolve(imageCache[src])
        }
        $image.onerror = e => reject(e)
        $image.src = src
      }
    }
  )
}

// 按模式显示图片
function fillImage (snap) {
  const {
    mode,
    width,
    height,
    imageWidth,
    imageHeight
  } = snap
  const imageRatio = imageHeight / imageWidth
  const ratio = height / width
  switch (mode) {
    case 'aspectFit':
      if (imageRatio > ratio) {
        // 图片比容器长
        snap.imageStyle = {
          position: 'relative',
          width: `${height / imageRatio}px`,
          height: `${height}px`,
          top: 0,
          left: `${(width - (height / imageRatio))}px`
        }
      } else {
        // 图片比容器扁
        snap.imageStyle = {
          position: 'relative',
          width: `${width}px`,
          height: `${width * imageRatio}px`,
          top: `${(height - (width * imageRatio)) / 2}px`,
          left: 0
        }
      }
      break
    case 'aspectFill':
      if (imageRatio > ratio) {
        // 图片比容器长
        snap.imageStyle = {
          position: 'relative',
          width: `${width}px`,
          height: `${width * imageRatio}px`,
          top: `${(height - (width * imageRatio)) / 2}px`,
          left: 0
        }
      } else {
        // 图片比窗口扁
        snap.imageStyle = {
          position: 'relative',
          width: `${height / imageRatio}px`,
          height: `${height}px`,
          top: 0,
          left: `${(width - (height / imageRatio)) / 2}px`
        }
      }
      break
    case 'widthFix':
      snap.imageStyle = {
        position: 'relative',
        width: `${width}px`,
        height: `${width * imageRatio}px`,
        top: 0,
        left: 0
      }
      break
    case 'top':
      snap.imageStyle = {
        position: 'relative',
        top: 0,
        left: `${(width - imageWidth) / 2}px`
      }
      break
    case 'bottom':
      snap.imageStyle = {
        position: 'relative',
        top: `${height - imageHeight}px`,
        left: `${(width - imageWidth) / 2}px`
      }
      break
    case 'center':
      snap.imageStyle = {
        position: 'relative',
        top: `${(height - imageHeight) / 2}px`,
        left: `${(width - imageWidth) / 2}px`
      }
      break
    case 'left':
      snap.imageStyle = {
        position: 'relative',
        top: `${(height - imageHeight) / 2}px`,
        left: 0
      }
      break
    case 'right':
      snap.imageStyle = {
        position: 'relative',
        top: `${(height - imageHeight) / 2}px`,
        left: `${width - imageWidth}px`
      }
      break
    case 'top left':
      snap.imageStyle = {
        position: 'relative',
        top: 0,
        left: 0
      }
      break
    case 'top right':
      snap.imageStyle = {
        position: 'relative',
        top: 0,
        left: `${width - imageWidth}px`
      }
      break
    case 'bottom left':
      snap.imageStyle = {
        position: 'relative',
        top: `${height - imageHeight}px`,
        left: 0
      }
      break
    case 'bottom right':
      snap.imageStyle = {
        position: 'relative',
        top: `${height - imageHeight}px`,
        left: `${width - imageWidth}px`
      }
      break
    case 'scaleToFill':
    default:
      snap.imageStyle = {
        width: `${width}px`,
        height: `${height}px`
      }
  }
}

function handleGlobalScroll () {
  viewportTop = window.scrollY
  viewportLeft = window.scrollX
  globalLoad()
}

const handleGlobalResize = (function () {
  let waiting = false
  let update = true
  function reRegisterPosition () {
    viewportWidth = document.documentElement.clientWidth
    viewportHeight = document.documentElement.clientHeight
    // 更新 globalGroups 的位置
    globalGroups.length = 0
    for (const id in globalImageSnap) {
      const snap = globalImageSnap[id]
      registerPosition(snap)
    }
  }
  return function () {
    // 做一个性能节流
    if (waiting === false && update === true) {
      waiting = true
      update = false
      // 第一次是立即执行
      reRegisterPosition()
      // 做一个0.5延迟
      setTimeout(() => {
        update === true && reRegisterPosition()
        waiting = false
      }, 500)
    } else {
      update = true
    }
  }
}())

// 监听全局滚动
window.addEventListener('scroll', handleGlobalScroll)

// resize
window.addEventListener('resize', handleGlobalResize)

// 注册位置
function registerPosition (snap) {
  const {
    id,
    status,
    wrap,
    container = window
  } = snap
  if (status !== 'unload') {
    // 未加载的图片才需要重新注册位置
    return
  }
  if (container === window) {
    // rect 对象
    let rect = null
    if (
      snap.rect === null ||
      !isNumber(snap.rect.width) ||
      !isNumber(snap.rect.height)
    ) {
      // snap.rect不存在或信息不全
      const wrapRect = wrap.getBoundingClientRect()
      rect = Object.assign(
        {},
        snap.rect,
        {
          top: wrapRect.top + viewportTop,
          left: wrapRect.left + viewportLeft,
          width: wrapRect.width,
          height: wrapRect.height
        }
      )
      if (snap.rect !== null) snap.rect = rect
    } else {
      rect = snap.rect
    }
    const { top, left, width, height } = rect
    const row = top / viewportHeight >> 0
    const column = left / viewportWidth >> 0
    // snap 扩展信息
    Object.assign(snap, { top, left, width, height })
    // 存入快照
    globalImageSnap[id] = snap
    setGridList(globalGroups, row, column)
    globalGroups[row][column].list.push(snap)
    // 更新加载
    updateLoadImages(globalLoad)
  } else {
    // 局部
  }
}

// 准备下次被调用的 handleScroll 队列
const handleScrollQueue = []

const triggerUpdateScroll = (function () {
  let waiting = false
  return function () {
    if (waiting === false) {
      // 状态切换到等待更新中
      waiting = true
      // nextTick 更新
      setTimeout(() => {
        handleScrollQueue.forEach(item => item())
      }, 0)
    } else {
      waiting = false
    }
  }
}())

// 更新滚动 ---- 合并滚动更新
function updateLoadImages (handleScroll) {
  handleScrollQueue.includes(handleScroll) || handleScrollQueue.push(handleScroll)
  // 触发更新
  triggerUpdateScroll()
}

// 图片模式
const imageMode = PropTypes.oneOf([
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

export default class Picture extends Nerv.Component {
  static defaultProps = {
    placehold: '//misc.360buyimg.com/lib/skin/e/i/error-jd.gif',
    placeholdMode: 'center',
    fail: '//img11.360buyimg.com/jdphoto/s150x129_jfs/t1/25294/11/986/1390/5c0e7d65E9b96ef95/f9472bc971ba1673.png',
    failMode: 'center',
    rect: null,
    src: '',
    mode: 'scaleToFill',
    lazyLoad: false,
    onError () {},
    onLoad () {}
  }
  static propTypes = {
    src: PropTypes.string,
    mode: imageMode,
    placehold: PropTypes.string,
    placeholdMode: imageMode,
    fail: PropTypes.string,
    failMode: imageMode,
    lazyLoad: PropTypes.bool,
    rect: PropTypes.shape({
      top: PropTypes.number.isRequired,
      left: PropTypes.number.isRequired,
      width: PropTypes.number,
      height: PropTypes.number
    }),
    onError: PropTypes.func,
    onLoad: PropTypes.func
  }
  // 当前的图片快照
  snap = {}
  // 强制更新位置
  forceUpdate = Date.now()
  state = { imageStatus: 'unload' }
  updateImageStatus () { this.setState({ imageStatus: this.snap.status }) }
  // 图片加载成功
  handleLoad = ({ imageWidth, imageHeight }) => {
    Object.assign(this.snap, { status: 'loaded', imageWidth, imageHeight })
    fillImage(this.snap)
    this.updateImageStatus()
    this.props.onLoad()
  }
  // 图片加载失败
  handleError = e => {
    this.snap.status = 'error'
    const { fail, failMode } = this.props
    loadImage(fail).then(
      ({ imageWidth, imageHeight }) => {
        Object.assign(
          this.snap,
          {
            src: fail,
            imageWidth,
            imageHeight,
            mode: failMode,
            onLoad () {},
            onError () {}
          }
        )
        fillImage(this.snap)
        this.updateImageStatus()
      }
    )
    this.props.onError(e)
  }
  record (props = this.props) {
    const { lazyLoad, container = window, mode, src, update, rect } = props
    if (update !== this.forceUpdate) {
      // 初始化快照
      this.snap = {
        id: this.imageId,
        wrap: this.$wrap,
        image: this.$self,
        imageStyle: {},
        container,
        mode,
        src,
        rect,
        onLoad: size => { this.handleLoad(size) },
        onError: e => this.handleError(e),
        status: 'unload'
      }
      registerPosition(this.snap)
      this.forceUpdate = update
    }
    if (lazyLoad === false) {
      // 非 lazyload
      loadImage(src)
        .then(size => this.handleLoad(size))
        .catch(e => this.handleError(e))
    }
  }
  $wrap = null
  $self = null
  componentWillUnmount () {}
  componentWillReceivePops (nextProps) { this.record(nextProps) }
  componentDidMount () {
    this.imageId = `image-id-${Date.now()}-${imageStamp++}`
    // 加载 loading 图片
    const { placehold, placeholdMode } = this.props
    loadImage(placehold).then(
      ({ imageWidth, imageHeight }) => {
        const placeholdSnap = Object.assign(
          {},
          this.snap,
          {
            src: placehold,
            imageWidth,
            imageHeight,
            mode: placeholdMode,
            onLoad () {},
            onError () {}
          }
        )
        fillImage(placeholdSnap)
        this.snap.imageStyle = placeholdSnap.imageStyle
        this.updateImageStatus()
      }
    )
    // 将图片记录到队列
    this.record()
  }
  render () {
    const {
      src,
      placehold,
      fail,
      style = {},
      className,
      mode
    } = this.props
    const { imageStyle = {} } = this.snap
    // widthFix 模式下，style.height 会取 imageStyle.height
    if (mode === 'widthFix') {
      style.height = `${imageStyle.height}!important`
    }
    // 容器一定是 overflow: hidden
    style.overflow = 'hidden'
    // 图片路径
    let imageSrc = ''
    switch (this.state.imageStatus) {
      case 'loaded':
        imageSrc = src
        break
      case 'error':
        imageSrc = fail
        break
      case 'unload':
      case 'loading':
      default: imageSrc = placehold
    }
    return <div style={style} className={className} ref={$ => (this.$wrap = $)}>
      <img
        src={imageSrc}
        ref={$ => (this.$self = $)}
        style={imageStyle}
      />
    </div>
  }
}
