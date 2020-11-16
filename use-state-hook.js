/**
 * @author leeenx
 * @description react hooks 里使用 class组件一样的state
 * @param {Object} state 
 */
export function useStateHook(state = {}) {
  const myState = useMemo(() => state, []);
  let updateValue = 0;
  const [update, setUpdate] = useState(updateValue);
  const afterUpdateQueue = useMemo(() => ([]), []);
  const afterUpdate = useCallback(cb => {
    afterUpdateQueue.push(cb);
  }, []);
  useEffect(() => {
    // 遍历回调
    afterUpdateQueue.forEach(cb => cb());
    // 清空长度
    afterUpdateQueue.length = 0;
  }, [update]);
  const setState = useCallback((newState, setStateComplete = () => { }) => {
    // 直接更新状态（这里与 class 组件的 this.state 表示不一样）
    Object.assign(myState, newState);
    updateValue += 1;
    setUpdate(updateValue);
    afterUpdate(() => {
      setStateComplete(myState);
    });
  }, []);
  return [myState, setState];
}
