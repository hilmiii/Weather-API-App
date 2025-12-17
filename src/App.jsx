import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

const App = () => {
  const [weather, setWeather] = useState(null);
  const [time, setTime] = useState(new Date());
  const [alarm, setAlarm] = useState("");
  const [logs, setLogs] = useState([]);
  const [bgImage, setBgImage] = useState('/img/fair.jpg');
  
  // Perbaikan 1: Tambahkan state isAlarmPlaying agar tidak terjadi ReferenceError
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // Perbaikan 2: Inisialisasi audio dengan path absolut untuk folder public Vite
  const audioRef = useRef(null);

  const API_KEY = "be4f709beb35221438738382074a6cc8";

  useEffect(() => {
    // Inisialisasi objek audio satu kali saat mount
    audioRef.current = new Audio('/alarm.mp3');
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);

      // Perbaikan 3: Logika cek alarm menggunakan Jam:Menit saja agar akurat
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${hours}:${minutes}`;

      if (alarm === currentTimeString && !isAlarmPlaying) {
        playAlarm();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [alarm, isAlarmPlaying]); // isAlarmPlaying sekarang terdefinisi

useEffect(() => {
  // Gunakan port 8884 untuk WSS (Secure WebSockets) agar aman di Vercel
  const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

  client.on('connect', () => {
    console.log("MQTT Connected via WSS");
  });

  // Simpan client ke dalam useRef atau state agar bisa digunakan di fungsi playAlarm
  mqttClientRef.current = client;

  return () => client.end();
}, []);

const playAlarm = () => {
  setIsAlarmPlaying(true);
  audioRef.current.play();

  // Kirim perintah ke ESP8266
  if (mqttClientRef.current) {
    mqttClientRef.current.publish('cocod/weather/alarm', 'ON');
  }
}; 

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsAlarmPlaying(false);
    setAlarm(""); 
  };

  const fetchWeather = (lat, lon) => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        setWeather(data);
        updateBackground(data.weather[0].main);
        
        const newLog = {
          time: new Date().toLocaleTimeString(),
          temp: Math.round(data.main.temp - 273.15),
          desc: data.weather[0].description
        };
        setLogs(prev => [newLog, ...prev].slice(0, 5));
      });
  };

  const updateBackground = (main) => {
    const images = { Rain: 'rainy', Clouds: 'cloudy', Clear: 'clear' };
    // Perbaikan 4: Gunakan path absolut /img/
    setBgImage(`/img/${images[main] || 'fair'}.jpg`);
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
      const weatherTimer = setInterval(() => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      }, 1800000);
      return () => clearInterval(weatherTimer);
    });
  }, []);

  useEffect(() => {
    document.body.style.backgroundImage = `url(${bgImage})`;
  }, [bgImage]);

  if (!weather) return <div className="text-white text-center mt-20 text-2xl font-bold">Mencari Lokasi & Cuaca...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl w-full max-w-4xl text-white">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-10">
          <div className="text-center md:text-left">
            <h1 className="text-6xl font-bold tracking-tighter">{time.toLocaleTimeString('id-ID')}</h1>
            <p className="text-xl opacity-80">{time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="text-center md:text-right mt-4 md:mt-0">
            <h2 className="text-4xl font-semibold">{weather.name}</h2>
            <p className="capitalize text-lg opacity-90">{weather.weather[0].description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/10 p-6 rounded-2xl text-center border border-white/10">
            <p className="text-sm uppercase opacity-60 mb-2">Suhu</p>
            <p className="text-4xl font-bold">{Math.round(weather.main.temp - 273.15)}°C</p>
          </div>
          <div className="bg-white/10 p-6 rounded-2xl text-center border border-white/10">
            <p className="text-sm uppercase opacity-60 mb-2">Kelembaban</p>
            <p className="text-4xl font-bold">{weather.main.humidity}%</p>
          </div>
          <div className="bg-white/10 p-6 rounded-2xl text-center border border-white/10">
            <p className="text-sm uppercase opacity-60 mb-2">Angin</p>
            <p className="text-4xl font-bold">{weather.wind.speed} m/s</p>
          </div>
        </div>

        {/* Alarm Section */}
        <div className={`p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-6 transition-all duration-500 ${isAlarmPlaying ? 'bg-red-500/60 animate-pulse border-red-400' : 'bg-black/30 border border-white/10'}`}>
          <div className="flex items-center gap-4">
            <label className="font-bold text-lg">Set Alarm:</label>
            <input 
              type="time" 
              className="bg-white/20 border-none rounded-xl p-3 text-white outline-none focus:ring-2 ring-white cursor-pointer"
              onChange={(e) => setAlarm(e.target.value)}
              value={alarm}
            />
          </div>
          
          <div className="flex-grow">
            {isAlarmPlaying ? (
              <button 
                onClick={stopAlarm}
                className="w-full bg-white text-red-600 px-8 py-3 rounded-xl font-black shadow-2xl hover:bg-gray-100 transition-all uppercase tracking-widest"
              >
                Matikan Alarm
              </button>
            ) : (
              <p className="text-center md:text-left font-medium">
                {alarm ? `Alarm aktif pada pukul ${alarm}` : "Belum ada alarm yang disetel"}
              </p>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-black/20 rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/10">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-wider">Waktu Log</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider">Kota</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider">Suhu</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider">Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">{log.time}</td>
                  <td className="p-4 text-sm font-bold">{weather.name}</td>
                  <td className="p-4 text-sm font-mono">{log.temp}°C</td>
                  <td className="p-4 text-sm opacity-80">{log.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;