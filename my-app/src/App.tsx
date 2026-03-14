import { useState } from 'react';
import './App.css';

interface BinomialResult {
  params: { u: number; d: number; p: number; q: number };
  bondPriceT: number;
  bondPriceTau: number;
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
  t: number;
  k: number;
}): BinomialResult {
  const { n, T, r0, sigma, E, t, k } = params;
  const dt = T / n;
  const u = Math.exp((sigma / 100) * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp((r0 / 100) * dt) - d) / (u - d);
  const q = 1 - p;

  const rateTree: number[][] = [];
  for (let i = 0; i <= n; i++) {
    rateTree[i] = [];
    for (let j = 0; j <= i; j++) {
      rateTree[i][j] = (r0 / 100) * Math.pow(u, j) * Math.pow(d, i - j);
    }
  }

  function priceZeroCouponBond(maturityStep: number): number[][] {
    const bond: number[][] = [];
    bond[maturityStep] = new Array(maturityStep + 1).fill(1);
    for (let i = maturityStep - 1; i >= 0; i--) {
      bond[i] = [];
      for (let j = 0; j <= i; j++) {
        bond[i][j] =
          (p * bond[i + 1][j + 1] + q * bond[i + 1][j]) /
          (1 + rateTree[i][j]);
      }
    }
    return bond;
  }

  const bondTreeT = priceZeroCouponBond(n);

  let stepsTau = Math.round((t * n) / T);
  stepsTau = Math.max(1, Math.min(n, stepsTau));
  const bondTreeTau = priceZeroCouponBond(stepsTau);
  const forwardPrice = bondTreeT[0][0] / bondTreeTau[0][0];

  let stepsFut = Math.round((k * n) / T);
  stepsFut = Math.max(1, Math.min(n, stepsFut));
  const deliveryStep = stepsFut;

  const futuresTree: number[][] = [];
  futuresTree[deliveryStep] = [];
  for (let j = 0; j <= deliveryStep; j++) {
    futuresTree[deliveryStep][j] = bondTreeT[deliveryStep][j];
  }
  for (let i = deliveryStep - 1; i >= 0; i--) {
    futuresTree[i] = [];
    for (let j = 0; j <= i; j++) {
      futuresTree[i][j] = p * futuresTree[i + 1][j + 1] + q * futuresTree[i + 1][j];
    }
  }

  function priceAmericanCall(strike: number): number {
    const option: number[][] = [];
    for (let i = 0; i <= deliveryStep; i++) {
      option[i] = [];
      for (let j = 0; j <= i; j++) {
        option[i][j] = Math.max(futuresTree[i][j] - strike, 0);
      }
    }
    for (let i = deliveryStep - 1; i >= 0; i--) {
      for (let j = 0; j <= i; j++) {
        const continuation =
          (p * option[i + 1][j + 1] + q * option[i + 1][j]) /
          (1 + rateTree[i][j]);
        option[i][j] = Math.max(option[i][j], continuation);
      }
    }
    return option[0][0];
  }

  function priceAmericanPut(strike: number): number {
    const option: number[][] = [];
    for (let i = 0; i <= deliveryStep; i++) {
      option[i] = [];
      for (let j = 0; j <= i; j++) {
        option[i][j] = Math.max(strike - futuresTree[i][j], 0);
      }
    }
    for (let i = deliveryStep - 1; i >= 0; i--) {
      for (let j = 0; j <= i; j++) {
        const continuation =
          (p * option[i + 1][j + 1] + q * option[i + 1][j]) /
          (1 + rateTree[i][j]);
        option[i][j] = Math.max(option[i][j], continuation);
      }
    }
    return option[0][0];
  }

  return {
    params: { u, d, p, q },
    bondPriceT: bondTreeT[0][0],
    bondPriceTau: bondTreeTau[0][0],
    forwardPrice,
    futuresPrice: futuresTree[0][0],
    callOptionE: priceAmericanCall(E / 100),
    putOptionE: priceAmericanPut(E / 100),
  };
}

function App() {
  const [n, setN] = useState('10');
  const [T, setT] = useState('10');
  const [r0, setR0] = useState('5');
  const [sigma, setSigma] = useState('10');
  const [E, setE] = useState('70');
  const [t, setTau] = useState('7');
  const [k, setKFut] = useState('8');
  const [result, setResult] = useState<BinomialResult | null>(null);

  const handleCalculate = () => {
    if (n === '' || T === '' || r0 === '' || sigma === '' || E === '' || t === '' || k === '') {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    const numN = Number(n);
    const numT = Number(T);
    const numR0 = Number(r0);
    const numSigma = Number(sigma);
    const numE = Number(E);
    const numTau = Number(t);
    const numKFut = Number(k);

    if (isNaN(numN) || isNaN(numT) || isNaN(numR0) || isNaN(numSigma) || isNaN(numE) || isNaN(numTau) || isNaN(numKFut)) {
      alert('Пожалуйста, введите корректные числа');
      return;
    }

    if (numN < 3) {
      alert('Период биномиальной модели (n) должен быть не менее 3');
      return;
    }
    if (numT < 0.1) {
      alert('Количество лет (Т) должно быть не менее 0.1');
      return;
    }
    if (numSigma < 0.01) {
      alert('Волатильность (σ) должна быть не менее 0.01');
      return;
    }
    if (numTau < 0.1) {
      alert('Период экспирации форварда (t) должен быть не менее 0.1');
      return;
    }
    if (numTau > numT) {
      alert('Период экспирации форварда (t) не может превышать общий срок T');
      return;
    }
    if (numKFut < 0.1) {
      alert('Период экспирации фьючерса (k) должен быть не менее 0.1');
      return;
    }
    if (numKFut > numT) {
      alert('Период экспирации фьючерса (k) не может превышать общий срок T');
      return;
    }

    try {
      const res = binomialModel({
        n: numN,
        T: numT,
        r0: numR0,
        sigma: numSigma,
        E: numE,
        t: numTau,
        k: numKFut,
      });
      setResult(res);
    } catch (err) {
      console.error('Ошибка расчёта:', err);
      alert('Произошла ошибка при расчёте. Проверьте введённые данные.');
    }
  };

  return (
    <div className="container">
      <div className="header-row">
        <a href="https://tpu.ru" className="logo" target="_blank" rel="noopener noreferrer"></a>
        <h1 className="title">Модель биномиальной процентной ставки</h1>
      </div>

      <div className="form-group">
        <div className="form-row">
          <label>Период биноминальной модели (n):</label>
          <input
            type="number"
            value={n}
            onChange={(e) => setN(e.target.value)}
            min={3}
            step={1}
            className="input-field"
          />
        </div>

        <div className="form-row">
          <label>Количество лет (Т):</label>
          <input
            type="number"
            value={T}
            onChange={(e) => setT(e.target.value)}
            min={0.1}
            step={0.1}
            className="input-field"
          />
        </div>

        <div className="form-row">
          <label>Период экспирации форварда (t лет):</label>
          <input
            type="number"
            value={t}
            onChange={(e) => setTau(e.target.value)}
            min={0.1}
            step={0.1}
            className="input-field"
          />
        </div>

        <div className="form-row">
          <label>Период экспирации фьючерса (k лет):</label>
          <input
            type="number"
            value={k}
            onChange={(e) => setKFut(e.target.value)}
            min={0.1}
            step={0.1}
            className="input-field"
          />
        </div>

        <div className="form-row">
          <label>Начальная процентная ставка (r₀ %):</label>
          <input
            type="number"
            value={r0}
            onChange={(e) => setR0(e.target.value)}
            step={0.01}
            className="input-field"
          />
        </div>

        <div className="form-row">
          <label>Волатильность процентной ставки (σ %):</label>
          <input
            type="number"
            value={sigma}
            onChange={(e) => setSigma(e.target.value)}
            min={0.01}
            step={0.01}
            className="input-field"
          />
        </div>

        <div className="form-row">
          <label>Страйк (E %):</label>
          <input
            type="number"
            value={E}
            onChange={(e) => setE(e.target.value)}
            step={0.1}
            className="input-field"
          />
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
                <td className="label">Cтоимость {T}-летней бескупонной облигации (% от номинала)</td>
                <td className="value">{(result.bondPriceT * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="label">Цена {t}-летней бескупонной облигации (% от номинала)</td>
                <td className="value">{(result.bondPriceTau * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="label">Цена форварда на {t}-летнюю облигацию (% от номинала)</td>
                <td className="value">{(result.forwardPrice * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="label">Цена фьючерса (экспирация через {k} лет) на {T}-летнюю облигацию (% от номинала)</td>
                <td className="value">{(result.futuresPrice * 100).toFixed(2)}%</td>
              </tr>
              <tr className="border-top">
                <td className="label">Американский опцион покупки при (E = {E}%) (% от номинала)</td>
                <td className="value">{(result.callOptionE * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="label">Американский опцион продажи при (E = {E}%) (% от номинала)</td>
                <td className="value">{(result.putOptionE * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;