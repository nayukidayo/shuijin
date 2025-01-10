import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { Html, MapControls, PerspectiveCamera } from '@react-three/drei'
import useGateway, { GWD } from '../hooks/useGateway'
import { f2, f3 } from '../lib/position'
import cs from './Page3D.module.css'
import { IconMarker } from './Icon'
import { Modal } from 'antd'

type MarkerProps = {
  label: string
  position: number[]
  gwd?: GWD
}

function Marker({ label, position, gwd }: MarkerProps) {
  const data = gwd?.[label]

  if (!data) return null

  let color = '#e8ba40' // 橙色 数据过期

  if (Date.now() - data.time < 3.6e6) {
    if (data.value === 0) {
      color = '#40e840' // 绿色 正常
    } else {
      color = '#e84040' // 红色 警报
    }
  }

  return (
    <Html
      wrapperClass={cs.h}
      transform
      position={new THREE.Vector3(...position)}
      scale={10}
      zIndexRange={[999, 0]}
    >
      <IconMarker className={cs.m} style={{ color }} />
      <span className={cs.l} data-alert={color === '#e84040'}>
        {label.substring(1)}
      </span>
    </Html>
  )
}

type ImageProps = {
  asset: string
  pos: Record<string, number[]>
  gwd?: GWD
}

function Image({ asset, pos, ...props }: ImageProps) {
  const texture = useLoader(THREE.TextureLoader, asset)
  return (
    <mesh>
      <boxGeometry args={[1404.7186, 1, 1000]} />
      <meshBasicMaterial map={texture} />
      {Object.keys(pos).map(v => (
        <Marker key={v} label={v} position={pos[v]} {...props} />
      ))}
    </mesh>
  )
}

function Scene(props: ImageProps) {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 200, 400]} />
      <MapControls
        maxPolarAngle={Math.PI / 2.25}
        minAzimuthAngle={-Math.PI / 2}
        maxAzimuthAngle={Math.PI / 2}
        minDistance={200}
        maxDistance={1000}
      />
      <Image {...props} />
    </Canvas>
  )
}

type LastAlert = {
  hash: string
  time: number
  interval: number
}

export default function App() {
  const [alerts, setAlerts] = useState<string[]>([])
  const [lastAlert, setLastAlert] = useState<LastAlert>()

  const gwd = useGateway()

  useEffect(() => {
    if (!gwd) return
    const arr = Object.keys(gwd).filter(v => gwd[v].value === 1)
    if (arr.join() === lastAlert?.hash && Date.now() - lastAlert?.time < lastAlert?.interval) return
    setAlerts(arr)
  }, [gwd])

  const handleClose = (interval: number) => {
    setLastAlert({ hash: alerts.join(), time: Date.now(), interval })
    setAlerts([])
  }

  return (
    <div className={cs.q}>
      <div className={cs.t}>
        <div>地下2层</div>
        <div>地下3层</div>
      </div>
      <div className={cs.wl}>
        <Scene asset="/f2.png" pos={f2} gwd={gwd} />
      </div>
      <div className={cs.wr}>
        <Scene asset="/f3.png" pos={f3} gwd={gwd} />
      </div>
      <Modal
        title="以下检测点触发水浸警报"
        mask={false}
        maskClosable={false}
        open={alerts.length > 0}
        okText="确定"
        onOk={() => handleClose(6e5)}
        cancelText="取消"
        onCancel={() => handleClose(6e4)}
      >
        {alerts.map(v => (
          <p className={cs.p} key={v}>
            {v.substring(1)}
          </p>
        ))}
      </Modal>
    </div>
  )
}
