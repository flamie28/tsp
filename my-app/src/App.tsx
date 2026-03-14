import { useState } from 'react'
import './App.css'

interface BinomialResult {
  params: { u: number; d: number; p: number; q: number };
  bondPrice10: number;
  bondPrice7: number;
  forwardPrice: number;
  futuresPrice: number;
  callOptionE: number;
  putOptionE: number;
}

function binomialModel(params: {
  n: number;
  T: number;
  r0: number;
  sigma: number;
  E: number;
}): BinomialResult {
  const { n, T, r0, sigma, E } = params;
  const dt = T / n;
  const u = Math.exp((sigma/100) * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp((r0/100) * dt) - d) / (u - d);
  const q = 1 - p;

  const rateTree: number[][] = [];
  for (let t = 0; t <= n; t++) {
    rateTree[t] = [];
    for (let j = 0; j <= t; j++) {
      rateTree[t][j] = (r0/100) * Math.pow(u, j) * Math.pow(d, t - j);
    }
  }

  function priceZeroCouponBond(maturityStep: number): number[][] {
    const bond: number[][] = [];
    bond[maturityStep] = new Array(maturityStep + 1).fill(1);
    for (let t = maturityStep - 1; t >= 0; t--) {
      bond[t] = [];
      for (let j = 0; j <= t; j++) {
        bond[t][j] =
          (p * bond[t + 1][j + 1] + q * bond[t + 1][j]) /
          (1 + rateTree[t][j]);
      }
    }
    return bond;
  }

  const bondTree10 = priceZeroCouponBond(n);
  const bondTree7 = priceZeroCouponBond(n - 3);
  const forwardPrice = bondTree10[0][0] / bondTree7[0][0];

  const deliveryStep = n - 2;
  const futuresTree: number[][] = [];
  futuresTree[deliveryStep] = [];
  for (let j = 0; j <= deliveryStep; j++) {
    futuresTree[deliveryStep][j] = bondTree10[deliveryStep][j];
  }
  for (let t = deliveryStep - 1; t >= 0; t--) {
    futuresTree[t] = [];
    for (let j = 0; j <= t; j++) {
      futuresTree[t][j] =
        p * futuresTree[t + 1][j + 1] + q * futuresTree[t + 1][j];
    }
  }

  function priceAmericanCall(strike: number): number {
    const option: number[][] = [];
    for (let t = 0; t <= deliveryStep; t++) {
      option[t] = [];
      for (let j = 0; j <= t; j++) {
        option[t][j] = Math.max(futuresTree[t][j] - strike, 0);
      }
    }
    for (let t = deliveryStep - 1; t >= 0; t--) {
      for (let j = 0; j <= t; j++) {
        const continuation =
          (p * option[t + 1][j + 1] + q * option[t + 1][j]) /
          (1 + rateTree[t][j]);
        option[t][j] = Math.max(option[t][j], continuation);
      }
    }
    return option[0][0];
  }

  function priceAmericanPut(strike: number): number {
    const option: number[][] = [];
    for (let t = 0; t <= deliveryStep; t++) {
        option[t] = [];
        for (let j = 0; j <= t; j++) {
            option[t][j] = Math.max(strike - futuresTree[t][j], 0);
        }
    }
    for (let t = deliveryStep - 1; t >= 0; t--) {
        for (let j = 0; j <= t; j++) {
            const continuation =
                (p * option[t + 1][j + 1] + q * option[t + 1][j]) /
                (1 + rateTree[t][j]);
            option[t][j] = Math.max(option[t][j], continuation);
        }
    }
    return option[0][0];
  }

  return {
    params: { u, d, p, q },
    bondPrice10: bondTree10[0][0],
    bondPrice7: bondTree7[0][0],
    forwardPrice,
    futuresPrice: futuresTree[0][0],
    callOptionE: priceAmericanCall(E/100),
    putOptionE: priceAmericanPut(E/100)
  };
}

function App() {

  const [n, setN] = useState(10);
  const [T, setT] = useState(10);
  const [r0, setR0] = useState(5);
  const [sigma, setSigma] = useState(10);
  const [E, setE] = useState(70);
  const [result, setResult] = useState<BinomialResult | null>(null);

  const handleCalculate = () => {
    try {
      const res = binomialModel({ n, T, r0, sigma, E });
      setResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="header-row">
        <a href="https://tpu.ru" className="logo" target="_blank" rel="noopener noreferrer"></a>
        <h1 className="title">Модель биномиальной процентной ставки</h1>
      </div>

      <div className="form-group">
        <div className='form-row'>
        <label>
          Период биноминальной модели (n): 
        </label>
          <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))} min={1} className="input-field" />
        </div>
        
        <div className='form-row'>
        <label>
          Количество лет (Т): 
        </label>
          <input type="number" value={T} onChange={(e) => setT(Number(e.target.value))} step={0.1} className="input-field" />
        </div>

        <div className='form-row'>
        <label>
          Начальная процентная ставка (r₀ %): 
        </label>
          <input type="number" value={r0} onChange={(e) => setR0(Number(e.target.value))} step={0.01} className="input-field" />
        </div>

        <div className='form-row'>
        <label>
          Волатильность процентной ставки (σ %): 
        </label>        
          <input type="number" value={sigma} onChange={(e) => setSigma(Number(e.target.value))} step={0.01} className="input-field" />
        </div>
        
        <div className='form-row'>
        <label>
          Страйк (E %): 
        </label>
          <input type="number" value={E} onChange={(e) => setE(Number(e.target.value))} step={0.1} className="input-field" />
        </div>
      </div>

      <button className="button" onClick={handleCalculate}>
        Посчитать
      </button>

      {result && (
        <div className="result-box">
          <h2 className="result-title">Результат</h2>
          <table className="result-table">
            <tbody>
              <tr className="border-top">
                <td className="label">Cтоимость {n}-летней бескупонной облигации</td>
                <td className="value">{result.bondPrice10.toFixed(6)}</td>
              </tr>
              <tr>
                <td className="label">Цена форварда на бескупонную облигацию</td>
                <td className="value">{result.bondPrice7.toFixed(6)}</td>
              </tr>
              <tr>
                <td className="label">Цена форварда</td>
                <td className="value">{result.forwardPrice.toFixed(6)}</td>
              </tr>
              <tr>
                <td className="label">Цена фьючерса на бескупонную облигацию</td>
                <td className="value">{result.futuresPrice.toFixed(6)}</td>
              </tr>
              <tr className="border-top">
                <td className="label">Американский опцион покупки при (E = {E}%)</td>
                <td className="value">{result.callOptionE.toFixed(6)}</td>
              </tr>
              <tr>
                <td className="label">Американский опцион продажи при (E = {E}%)</td>
                <td className="value">{result.putOptionE.toFixed(6)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App