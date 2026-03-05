import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [period_model, setPeriod_model] = useState(0)
  const [time, setTime] = useState(0)
  const [procent, setProcent] = useState(0)
  const [sigma, setSigma] = useState(0)
  const [strike, setStrike] = useState(0)
  const [u, setU] = useState(0)

  const calculate_u = () => {
    console.log(Math.exp(sigma * Math.sqrt(time/period_model)))
    setU(Math.exp(sigma * Math.sqrt(time/period_model)))
    return Math.exp(sigma * Math.sqrt(time/period_model))
  }

  return (
    <div className="home">
      <div className="input-container">
        {/*Входные данные*/}
        <div className="n">
          <label htmlFor="period_model">
            Период биноминальной модели: 
          </label>
          <input type="text" placeholder='n' id='period_model' onChange={(e) => setPeriod_model(Number(e.target.value))}/>
        </div>
        
        <div className="t">
          <label htmlFor="time">
            Время исполнения опциона
          </label>
          <input type="text" placeholder='t' id='time' onChange={(e) => setTime(Number(e.target.value))}/>
        </div>

        <div className="r0">
          <label htmlFor="procent">
            Начальная ставка:
          </label>
          <input type="text" placeholder='r0' id='procent' onChange={(e) => setProcent(Number(e.target.value))}/>
        </div>
        
        <div className="sigma">
          <label htmlFor="sigma">
            Волатильность процентной ставки:
          </label>
          <input type="text" placeholder='sigma' id='sigma' onChange={(e) => setSigma(Number(e.target.value))}/>
        </div>

        <div className="strike">
          <label htmlFor="strike">
            Страйк: 
          </label>
          <input type="text" placeholder='strike' id='strike' onChange={(e) => setStrike(Number(e.target.value))}/>
        </div>
      </div>
        {/*Выходные данные*/}
        <button onClick={() => calculate_u()} type='button'>
          Вывод полученных данных
        </button>

        <div className="calcuated_container">
          <label>
            {"U =  "}
          </label>
          <span>
           {u}
          </span> 
        </div>
    </div>
  )
}

export default App
