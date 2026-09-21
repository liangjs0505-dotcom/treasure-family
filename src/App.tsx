import { GoodsProvider } from './context/GoodsContext'
import Workspace from './components/Workspace'
import './App.css'

export default function App() {
  return (
    <GoodsProvider>
      <Workspace />
    </GoodsProvider>
  )
}
