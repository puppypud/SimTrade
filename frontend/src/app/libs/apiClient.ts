import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // อ่านจาก .env
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: true // ถ้าต้องส่ง Cookies/Session
});

// Optional: ทำ Interceptor เพื่อดักจับ Error หรือใส่ Token
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // จัดการ Error กลาง เช่น ถ้า 401 ให้เด้งไปหน้า Login
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;