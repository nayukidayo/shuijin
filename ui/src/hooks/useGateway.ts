import { useEffect, useState } from 'react'

export type GW = {
  gateway: string
  value: number
  time: number
}

export type GWD = Record<string, GW>

async function fgw(url: string): Promise<GWD> {
  const res = await fetch(url)
  if (res.ok) return await res.json()
  throw new Error(res.statusText)
}

export default function useGateway() {
  const [data, setData] = useState<GWD>()

  useEffect(() => {
    let st: number
    const loop = () => {
      fgw('/api/gw')
        .then(setData)
        .catch(console.error)
        .finally(() => {
          st = setTimeout(loop, 5e3)
        })
    }
    loop()
    return () => {
      clearTimeout(st)
    }
  }, [])

  return data
}
